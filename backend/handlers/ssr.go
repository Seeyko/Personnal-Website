package handlers

import (
	"bytes"
	"embed"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/tomandrieu/blog-api/models"
	"github.com/tomandrieu/blog-api/services"
)

//go:embed templates/blog.html
var templateFS embed.FS

// SSRHandler renders server-side HTML for blog pages (SEO).
type SSRHandler struct {
	service          *services.ArticleService
	shareLinkService *services.ShareLinkService
	tmpl             *template.Template
	frontendURL      string
	apiURL           string
}

// TemplateData is the data passed to the blog Go template.
type TemplateData struct {
	PageType     string          // "listing", "article", "not-found"
	Lang         string          // "en" or "fr"
	AltLang      string          // opposite lang for hreflang ("en" if Lang is "fr")
	FrontendURL  string
	APIURL       string
	CanonicalURL string
	AltURL       string          // hreflang alternate URL
	Article      *models.Article
	Articles     []models.Article
	Pagination   models.Pagination
	SSRDataJSON  template.JS   // JSON for window.__SSR_DATA__
	ConfigJSON   template.JS   // JSON for window.APP_CONFIG
	JSONLD       template.HTML // Pre-built JSON-LD script tag content
	NoIndex      bool
}

// ssrArticle is the subset of article data exposed in __SSR_DATA__ (no content for non-public).
type ssrArticle struct {
	Slug             string `json:"slug"`
	Title            string `json:"title"`
	Excerpt          string `json:"excerpt"`
	Content          string `json:"content,omitempty"`
	CoverImage       string `json:"coverImage,omitempty"`
	PublishedAt      string `json:"publishedAt"`
	ReadingTime      int    `json:"readingTime"`
	Lang             string `json:"lang"`
	Visibility       string `json:"visibility,omitempty"`
	RequiresPassword bool   `json:"requiresPassword,omitempty"`
}

func NewSSRHandler(service *services.ArticleService, shareLinkService *services.ShareLinkService, frontendURL, apiURL string) *SSRHandler {
	funcMap := template.FuncMap{
		"formatDate": formatDateForSSR,
		"safeHTML":   func(s string) template.HTML { return template.HTML(s) },
		"toJSON": func(v interface{}) template.JS {
			b, _ := json.Marshal(v)
			return template.JS(b)
		},
		"isoDate": func(t time.Time) string {
			return t.Format("2006-01-02")
		},
		"truncate": func(s string, n int) string {
			runes := []rune(s)
			if len(runes) <= n {
				return s
			}
			return string(runes[:n]) + "..."
		},
	}

	tmpl, err := template.New("blog.html").Funcs(funcMap).ParseFS(templateFS, "templates/blog.html")
	if err != nil {
		log.Fatalf("Failed to parse blog SSR template: %v", err)
	}

	return &SSRHandler{
		service:          service,
		shareLinkService: shareLinkService,
		tmpl:             tmpl,
		frontendURL:      strings.TrimRight(frontendURL, "/"),
		apiURL:           strings.TrimRight(apiURL, "/"),
	}
}

// renderToResponse renders the template into a buffer, then writes to w.
// This prevents partial HTML writes if the template execution fails.
func (h *SSRHandler) renderToResponse(w http.ResponseWriter, statusCode int, data TemplateData) {
	var buf bytes.Buffer
	if err := h.tmpl.Execute(&buf, data); err != nil {
		log.Printf("[SSR] Template render error: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(statusCode)
	buf.WriteTo(w)
}

// ServeBlogPage handles GET /blog/ and GET /blog/{slug}/.
func (h *SSRHandler) ServeBlogPage(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	slug = strings.TrimSuffix(slug, "/")
	lang := h.detectLang(r)

	if slug == "" {
		h.renderListing(w, r, lang)
	} else {
		h.renderArticle(w, r, slug, lang)
	}
}

func (h *SSRHandler) renderListing(w http.ResponseWriter, r *http.Request, lang string) {
	response := h.service.GetPublicArticles(1, 10, lang)

	// Build SSR data for JS hydration
	ssrArticles := make([]ssrArticle, len(response.Articles))
	for i, a := range response.Articles {
		ssrArticles[i] = ssrArticle{
			Slug:        a.Slug,
			Title:       a.Title,
			Excerpt:     a.Excerpt,
			CoverImage:  a.CoverImage,
			PublishedAt: a.PublishedAt.Format("2006-01-02"),
			ReadingTime: a.ReadingTime,
			Lang:        a.Lang,
		}
	}

	ssrData, _ := json.Marshal(map[string]interface{}{
		"articles":   ssrArticles,
		"pagination": response.Pagination,
	})

	configData, _ := json.Marshal(map[string]string{
		"API_URL":      h.apiURL,
		"FRONTEND_URL": h.frontendURL,
	})

	// Prefix cover images with API URL for template rendering
	for i := range response.Articles {
		if response.Articles[i].CoverImage != "" {
			response.Articles[i].CoverImage = h.apiURL + response.Articles[i].CoverImage
		}
	}

	canonicalURL, altURL := buildHreflangURLs(h.frontendURL, "/blog/", lang)

	data := TemplateData{
		PageType:     "listing",
		Lang:         lang,
		AltLang:      altLang(lang),
		FrontendURL:  h.frontendURL,
		APIURL:       h.apiURL,
		CanonicalURL: canonicalURL,
		AltURL:       altURL,
		Articles:     response.Articles,
		Pagination:   response.Pagination,
		SSRDataJSON:  template.JS(ssrData),
		ConfigJSON:   template.JS(configData),
	}

	h.renderToResponse(w, http.StatusOK, data)
}

func (h *SSRHandler) renderArticle(w http.ResponseWriter, r *http.Request, slug, lang string) {
	article := h.service.GetArticle(slug, lang)
	if article == nil {
		h.renderNotFound(w, r, lang)
		return
	}

	// Determine if the request has valid access to non-public articles
	canAccess := article.Visibility == "public"

	// For shared articles, validate share token
	if article.Visibility == "shared" {
		if shareToken := r.URL.Query().Get("token"); shareToken != "" && h.shareLinkService != nil {
			if link, err := h.shareLinkService.ValidateToken(shareToken); err == nil && link.Slug == slug {
				canAccess = true
			}
		}
	}

	// Non-public articles without valid access → 404 (prevent slug enumeration)
	if !canAccess && article.Visibility != "password" {
		h.renderNotFound(w, r, lang)
		return
	}

	noIndex := !canAccess

	// Build SSR data
	var ssr ssrArticle
	if canAccess {
		ssr = ssrArticle{
			Slug:        article.Slug,
			Title:       article.Title,
			Excerpt:     article.Excerpt,
			CoverImage:  article.CoverImage,
			Content:     article.Content,
			PublishedAt: article.PublishedAt.Format("2006-01-02"),
			ReadingTime: article.ReadingTime,
			Lang:        article.Lang,
		}
		if ssr.CoverImage != "" {
			ssr.CoverImage = h.apiURL + ssr.CoverImage
		}
	} else {
		// Password-protected: expose slug only, JS handles the unlock flow
		ssr = ssrArticle{
			Slug:             article.Slug,
			RequiresPassword: true,
		}
	}

	ssrData, _ := json.Marshal(map[string]interface{}{
		"article": ssr,
	})

	configData, _ := json.Marshal(map[string]string{
		"API_URL":      h.apiURL,
		"FRONTEND_URL": h.frontendURL,
	})

	// Copy article for template rendering, prefix cover image
	templateArticle := *article
	if templateArticle.CoverImage != "" {
		templateArticle.CoverImage = h.apiURL + templateArticle.CoverImage
	}
	// Strip content for articles without valid access
	if !canAccess {
		templateArticle.Content = ""
	}

	canonicalURL, altURL := buildHreflangURLs(h.frontendURL, "/blog/"+slug+"/", lang)
	var jsonLD template.HTML
	if article.Visibility == "public" {
		jsonLD = buildArticleJSONLD(&templateArticle, canonicalURL, h.frontendURL)
	}

	data := TemplateData{
		PageType:     "article",
		Lang:         lang,
		AltLang:      altLang(lang),
		FrontendURL:  h.frontendURL,
		APIURL:       h.apiURL,
		CanonicalURL: canonicalURL,
		AltURL:       altURL,
		Article:      &templateArticle,
		SSRDataJSON:  template.JS(ssrData),
		ConfigJSON:   template.JS(configData),
		JSONLD:       jsonLD,
		NoIndex:      noIndex,
	}

	h.renderToResponse(w, http.StatusOK, data)
}

func (h *SSRHandler) renderNotFound(w http.ResponseWriter, r *http.Request, lang string) {
	configData, _ := json.Marshal(map[string]string{
		"API_URL":      h.apiURL,
		"FRONTEND_URL": h.frontendURL,
	})

	data := TemplateData{
		PageType:    "not-found",
		Lang:        lang,
		FrontendURL: h.frontendURL,
		APIURL:      h.apiURL,
		SSRDataJSON: template.JS("null"),
		ConfigJSON:  template.JS(configData),
		NoIndex:     true,
	}

	h.renderToResponse(w, http.StatusNotFound, data)
}

// ServeSitemap generates a dynamic sitemap.xml with hreflang annotations.
func (h *SSRHandler) ServeSitemap(w http.ResponseWriter, r *http.Request) {
	type Link struct {
		XMLName xml.Name `xml:"xhtml:link"`
		Rel     string   `xml:"rel,attr"`
		Hreflang string  `xml:"hreflang,attr"`
		Href    string   `xml:"href,attr"`
	}
	type URL struct {
		XMLName xml.Name `xml:"url"`
		Loc     string   `xml:"loc"`
		LastMod string   `xml:"lastmod,omitempty"`
		Links   []Link   `xml:""`
	}
	type URLSet struct {
		XMLName    xml.Name `xml:"urlset"`
		XMLNS      string   `xml:"xmlns,attr"`
		XMLNSXhtml string   `xml:"xmlns:xhtml,attr"`
		URLs       []URL    `xml:"url"`
	}

	urls := []URL{
		{Loc: h.frontendURL + "/"},
		{Loc: h.frontendURL + "/blog/"},
	}

	// Collect unique slugs from FR articles (canonical), add hreflang links
	resp := h.service.GetPublicArticles(1, 100, "fr")
	for _, a := range resp.Articles {
		base := h.frontendURL + "/blog/" + a.Slug + "/"
		urls = append(urls, URL{
			Loc:     base,
			LastMod: a.PublishedAt.Format("2006-01-02"),
			Links: []Link{
				{Rel: "alternate", Hreflang: "fr", Href: base},
				{Rel: "alternate", Hreflang: "en", Href: base + "?lang=en"},
				{Rel: "alternate", Hreflang: "x-default", Href: base},
			},
		})
	}

	sitemap := URLSet{
		XMLNS:      "http://www.sitemaps.org/schemas/sitemap/0.9",
		XMLNSXhtml: "http://www.w3.org/1999/xhtml",
		URLs:       urls,
	}

	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Write([]byte(xml.Header))
	enc := xml.NewEncoder(w)
	enc.Indent("", "  ")
	enc.Encode(sitemap)
}

// ServeRobots serves a robots.txt pointing to the sitemap.
func (h *SSRHandler) ServeRobots(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	fmt.Fprintf(w, "User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n", h.frontendURL)
}

// detectLang reads the preferred language from cookie, query param, or Accept-Language header.
func (h *SSRHandler) detectLang(r *http.Request) string {
	// 1. Query param ?lang=
	if lang := r.URL.Query().Get("lang"); lang == "en" || lang == "fr" {
		return lang
	}

	// 2. Cookie
	if c, err := r.Cookie("lang"); err == nil {
		if c.Value == "en" || c.Value == "fr" {
			return c.Value
		}
	}

	// 3. Accept-Language header
	accept := r.Header.Get("Accept-Language")
	if strings.Contains(accept, "en") && !strings.Contains(accept, "fr") {
		return "en"
	}

	// 4. Default
	return "fr"
}

// altLang returns the opposite language.
func altLang(lang string) string {
	if lang == "en" {
		return "fr"
	}
	return "en"
}

// buildHreflangURLs returns the canonical URL for `lang` and the alternate URL for the other lang.
func buildHreflangURLs(frontendURL, path, lang string) (canonical, alt string) {
	base := frontendURL + path
	other := altLang(lang)
	if lang == "fr" {
		canonical = base
		alt = base + "?lang=" + other
	} else {
		canonical = base + "?lang=" + lang
		alt = base
	}
	return
}

// buildArticleJSONLD produces a JSON-LD BlogPosting script for an article.
func buildArticleJSONLD(article *models.Article, canonicalURL, frontendURL string) template.HTML {
	type jsonRef struct {
		Type string `json:"@type"`
		Name string `json:"name"`
		URL  string `json:"url,omitempty"`
	}
	type jsonLD struct {
		Context      string  `json:"@context"`
		Type         string  `json:"@type"`
		Headline     string  `json:"headline"`
		Description  string  `json:"description"`
		Published    string  `json:"datePublished"`
		Author       jsonRef `json:"author"`
		Publisher    jsonRef `json:"publisher"`
		MainEntity   string  `json:"mainEntityOfPage"`
		InLanguage   string  `json:"inLanguage"`
		TimeRequired string  `json:"timeRequired"`
		Image        string  `json:"image,omitempty"`
	}

	ld := jsonLD{
		Context:      "https://schema.org",
		Type:         "BlogPosting",
		Headline:     article.Title,
		Description:  article.Excerpt,
		Published:    article.PublishedAt.Format("2006-01-02"),
		Author:       jsonRef{Type: "Person", Name: "Tom Andrieu", URL: frontendURL},
		Publisher:    jsonRef{Type: "Person", Name: "Tom Andrieu"},
		MainEntity:   canonicalURL,
		InLanguage:   article.Lang,
		TimeRequired: fmt.Sprintf("PT%dM", article.ReadingTime),
		Image:        article.CoverImage,
	}

	b, _ := json.MarshalIndent(ld, "  ", "  ")
	return template.HTML(fmt.Sprintf("<script type=\"application/ld+json\">\n  %s\n  </script>", string(b)))
}

// formatDateForSSR formats a date for display based on language.
func formatDateForSSR(t time.Time, lang string) string {
	monthsFR := []string{"", "janvier", "février", "mars", "avril", "mai", "juin",
		"juillet", "août", "septembre", "octobre", "novembre", "décembre"}

	if lang == "fr" {
		return fmt.Sprintf("%d %s %d", t.Day(), monthsFR[t.Month()], t.Year())
	}
	return t.Format("January 2, 2006")
}
