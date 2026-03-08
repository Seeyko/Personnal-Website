package services

import (
	"bytes"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/tomandrieu/blog-api/models"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer/html"
	"go.abhg.dev/goldmark/frontmatter"
)

type Frontmatter struct {
	Title        string `yaml:"title"`
	Excerpt      string `yaml:"excerpt"`
	CoverImage   string `yaml:"coverImage"`
	PublishedAt  string `yaml:"publishedAt"`
	Draft        bool   `yaml:"draft"`
	Lang         string `yaml:"lang"`
	Private      bool   `yaml:"private"`
	PasswordHash string `yaml:"passwordHash"`
	Visibility   string `yaml:"visibility"` // "public", "password", "shared"
}

type ArticleService struct {
	articlesDir string
	cache       []models.Article
	cacheMu     sync.RWMutex
	md          goldmark.Markdown
}

func NewArticleService(articlesDir string) *ArticleService {
	md := goldmark.New(
		goldmark.WithExtensions(
			extension.GFM,
			extension.Typographer,
			&frontmatter.Extender{},
		),
		goldmark.WithParserOptions(
			parser.WithAutoHeadingID(),
		),
		goldmark.WithRendererOptions(
			html.WithHardWraps(),
			html.WithXHTML(),
			html.WithUnsafe(),
		),
	)

	svc := &ArticleService{
		articlesDir: articlesDir,
		md:          md,
	}

	svc.RefreshCache()
	return svc
}

func (s *ArticleService) RefreshCache() error {
	log.Printf("[RefreshCache] Reading articles from: %s", s.articlesDir)

	entries, err := os.ReadDir(s.articlesDir)
	if err != nil {
		log.Printf("[RefreshCache] ERROR reading dir: %v", err)
		return err
	}

	log.Printf("[RefreshCache] Found %d entries in articles dir", len(entries))

	var articles []models.Article
	supportedLangs := []string{"en", "fr"}

	for _, entry := range entries {
		if !entry.IsDir() {
			log.Printf("[RefreshCache] Skipping non-dir: %s", entry.Name())
			continue
		}

		slug := entry.Name()
		log.Printf("[RefreshCache] Processing slug: %s", slug)

		// Try language-specific files first (index.en.md, index.fr.md)
		for _, lang := range supportedLangs {
			langPath := filepath.Join(s.articlesDir, slug, "index."+lang+".md")
			content, err := os.ReadFile(langPath)
			if err != nil {
				log.Printf("[RefreshCache] Cannot read %s: %v", langPath, err)
				continue
			}

			article, err := s.parseArticle(slug, content)
			if err != nil {
				log.Printf("[RefreshCache] Parse error for %s/%s: %v", slug, lang, err)
				continue
			}

			// Override lang from filename if not specified in frontmatter
			if article.Lang == "" {
				article.Lang = lang
			}

			// Debug log for language assignment (2026-03-08)
			log.Printf("[RefreshCache] %s/%s → lang=%s visibility=%s", slug, lang, article.Lang, article.Visibility)

			articles = append(articles, article)
		}

		// Fallback to index.md if no language-specific files found for this slug
		hasLangFiles := false
		for _, a := range articles {
			if a.Slug == slug {
				hasLangFiles = true
				break
			}
		}

		if !hasLangFiles {
			indexPath := filepath.Join(s.articlesDir, slug, "index.md")
			content, err := os.ReadFile(indexPath)
			if err != nil {
				continue
			}

			article, err := s.parseArticle(slug, content)
			if err != nil {
				continue
			}

			articles = append(articles, article)
		}
	}

	sort.Slice(articles, func(i, j int) bool {
		return articles[i].PublishedAt.After(articles[j].PublishedAt)
	})

	s.cacheMu.Lock()
	s.cache = articles
	s.cacheMu.Unlock()

	log.Printf("[RefreshCache] Cached %d articles total", len(articles))

	return nil
}

func (s *ArticleService) parseArticle(slug string, content []byte) (models.Article, error) {
	var buf bytes.Buffer
	ctx := parser.NewContext()

	if err := s.md.Convert(content, &buf, parser.WithContext(ctx)); err != nil {
		return models.Article{}, err
	}

	fm := frontmatter.Get(ctx)
	var meta Frontmatter
	if fm != nil {
		if err := fm.Decode(&meta); err != nil {
			return models.Article{}, err
		}
	}

	if meta.Draft {
		return models.Article{}, nil
	}

	publishedAt, _ := time.Parse("2006-01-02", meta.PublishedAt)

	coverImage := ""
	if meta.CoverImage != "" {
		coverImage = "/api/articles/" + slug + "/image/" + meta.CoverImage
	}

	readingTime := calculateReadingTime(string(content))

	// Default language to "fr" if not specified
	lang := meta.Lang
	if lang == "" {
		lang = "fr"
	}

	// Determine visibility with backward compatibility
	visibility := meta.Visibility
	if visibility == "" {
		if meta.Private && meta.PasswordHash != "" {
			visibility = "password"
		} else if meta.Private {
			visibility = "password"
		} else {
			visibility = "public"
		}
	}

	// Keep Private field in sync for frontend backward compat
	isPrivate := visibility == "password"

	return models.Article{
		Slug:         slug,
		Title:        meta.Title,
		Excerpt:      meta.Excerpt,
		Content:      buf.String(),
		CoverImage:   coverImage,
		PublishedAt:  publishedAt,
		ReadingTime:  readingTime,
		Lang:         lang,
		Private:      isPrivate,
		Visibility:   visibility,
		PasswordHash: meta.PasswordHash,
	}, nil
}

func calculateReadingTime(content string) int {
	words := 0
	inWord := false

	for _, r := range content {
		if unicode.IsLetter(r) || unicode.IsNumber(r) {
			if !inWord {
				words++
				inWord = true
			}
		} else {
			inWord = false
		}
	}

	minutes := words / 200
	if minutes < 1 {
		minutes = 1
	}
	return minutes
}

func (s *ArticleService) GetArticles(page, limit int, lang string) models.ArticleListResponse {
	s.cacheMu.RLock()
	defer s.cacheMu.RUnlock()

	// Filter articles by language
	var filteredArticles []models.Article
	for _, article := range s.cache {
		// Match if lang matches, or if lang is empty and article is French (default)
		if article.Lang == lang || (lang == "" && article.Lang == "fr") {
			filteredArticles = append(filteredArticles, article)
		} else {
			log.Printf("[GetArticles] FILTERED OUT: %s (lang=%s, requested=%s)", article.Slug, article.Lang, lang)
		}
	}

	total := len(filteredArticles)
	totalPages := (total + limit - 1) / limit

	start := (page - 1) * limit
	end := start + limit

	if start >= total {
		return models.ArticleListResponse{
			Articles: []models.Article{},
			Pagination: models.Pagination{
				Page:       page,
				Limit:      limit,
				Total:      total,
				TotalPages: totalPages,
				HasNext:    false,
				HasPrev:    page > 1,
			},
		}
	}

	if end > total {
		end = total
	}

	articles := make([]models.Article, end-start)
	for i, article := range filteredArticles[start:end] {
		articles[i] = models.Article{
			Slug:        article.Slug,
			Title:       article.Title,
			Excerpt:     article.Excerpt,
			CoverImage:  article.CoverImage,
			PublishedAt: article.PublishedAt,
			ReadingTime: article.ReadingTime,
			Lang:        article.Lang,
			Private:     article.Private,
			Visibility:  article.Visibility,
		}
	}

	return models.ArticleListResponse{
		Articles: articles,
		Pagination: models.Pagination{
			Page:       page,
			Limit:      limit,
			Total:      total,
			TotalPages: totalPages,
			HasNext:    end < total,
			HasPrev:    page > 1,
		},
	}
}

func (s *ArticleService) GetArticle(slug string, lang string) *models.Article {
	s.cacheMu.RLock()
	defer s.cacheMu.RUnlock()

	slug = strings.TrimSuffix(slug, "/")

	// First try to find article matching both slug and language
	for _, article := range s.cache {
		if article.Slug == slug && article.Lang == lang {
			return &article
		}
	}

	// Fallback: if no match for requested language, return any article with this slug
	for _, article := range s.cache {
		if article.Slug == slug {
			return &article
		}
	}

	return nil
}

// GetAllArticles returns all articles (including private/shared) for admin use
func (s *ArticleService) GetAllArticles(lang string) []models.Article {
	s.cacheMu.RLock()
	defer s.cacheMu.RUnlock()

	var articles []models.Article
	for _, article := range s.cache {
		if article.Lang == lang || (lang == "" && article.Lang == "fr") {
			// Return without content for listing
			articles = append(articles, models.Article{
				Slug:        article.Slug,
				Title:       article.Title,
				Excerpt:     article.Excerpt,
				CoverImage:  article.CoverImage,
				PublishedAt: article.PublishedAt,
				ReadingTime: article.ReadingTime,
				Lang:        article.Lang,
				Private:     article.Private,
				Visibility:  article.Visibility,
			})
		}
	}
	return articles
}

func (s *ArticleService) GetImagePath(slug, filename string) string {
	return filepath.Join(s.articlesDir, slug, filename)
}

// GetArticlesDir returns the base articles directory path for path containment checks
func (s *ArticleService) GetArticlesDir() string {
	return s.articlesDir
}
