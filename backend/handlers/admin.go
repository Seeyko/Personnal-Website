package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/tomandrieu/blog-api/models"
	"github.com/tomandrieu/blog-api/services"
)

// AccessLogQuerier is an interface for querying access log stats.
// The actual implementation is provided by AccessLogService (built by another agent).
// This allows the admin handler to work even when the access log service is not yet available.
type AccessLogQuerier interface {
	GetArticleStats(slug string) (*models.ArticleStats, error)
}

type AdminHandler struct {
	articleService   *services.ArticleService
	shareLinkService *services.ShareLinkService
	accessLogService AccessLogQuerier
}

func NewAdminHandler(articleService *services.ArticleService, shareLinkService *services.ShareLinkService, accessLogService AccessLogQuerier) *AdminHandler {
	return &AdminHandler{
		articleService:   articleService,
		shareLinkService: shareLinkService,
		accessLogService: accessLogService,
	}
}

func (h *AdminHandler) ListArticles(w http.ResponseWriter, r *http.Request) {
	lang := r.URL.Query().Get("lang")

	articles := h.articleService.GetAllArticles(lang)

	// Build admin summaries with stats
	summaries := make([]models.AdminArticleSummary, 0, len(articles))
	for _, article := range articles {
		summary := models.AdminArticleSummary{
			Slug:        article.Slug,
			Title:       article.Title,
			Lang:        article.Lang,
			Visibility:  article.Visibility,
			PublishedAt: article.PublishedAt,
		}

		// Get link count for this article
		links, err := h.shareLinkService.GetLinksForSlug(article.Slug)
		if err == nil {
			summary.LinkCount = len(links)
		}

		// Get view stats if access log service is available
		if h.accessLogService != nil {
			stats, err := h.accessLogService.GetArticleStats(article.Slug)
			if err == nil && stats != nil {
				summary.TotalViews = stats.TotalViews
			}
		}

		summaries = append(summaries, summary)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"articles": summaries,
	})
}

func (h *AdminHandler) CreateShareLink(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	slug = strings.TrimSuffix(slug, "/")

	var req models.CreateShareLinkRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	// Parse expiresIn duration
	var expiresAt *time.Time
	if req.ExpiresIn != "" {
		duration, err := parseDuration(req.ExpiresIn)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid expiresIn format. Use: 24h, 7d, 30d"})
			return
		}
		t := time.Now().Add(duration)
		expiresAt = &t
	}

	link, err := h.shareLinkService.CreateLink(slug, req.Label, req.MaxUses, expiresAt)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create share link"})
		return
	}

	// Construct full share link URL
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:8000"
	}
	link.URL = frontendURL + "/blog/" + slug + "?token=" + link.Token

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(link)
}

func (h *AdminHandler) ListShareLinks(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	slug = strings.TrimSuffix(slug, "/")

	links, err := h.shareLinkService.GetLinksForSlug(slug)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch share links"})
		return
	}

	if links == nil {
		links = []models.ShareLink{}
	}

	// Add URLs to links
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:8000"
	}
	for i := range links {
		links[i].URL = frontendURL + "/blog/" + links[i].Slug + "?token=" + links[i].Token
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"links": links,
	})
}

func (h *AdminHandler) ListAllShareLinks(w http.ResponseWriter, r *http.Request) {
	links, err := h.shareLinkService.GetAllLinks()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch share links"})
		return
	}

	if links == nil {
		links = []models.ShareLink{}
	}

	// Add URLs to links
	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:8000"
	}
	for i := range links {
		links[i].URL = frontendURL + "/blog/" + links[i].Slug + "?token=" + links[i].Token
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"links": links,
	})
}

func (h *AdminHandler) RevokeShareLink(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid link ID"})
		return
	}

	if err := h.shareLinkService.RevokeLink(id); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Share link not found"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "revoked"})
}

func (h *AdminHandler) GetArticleStats(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	slug = strings.TrimSuffix(slug, "/")

	// Return empty stats if access log service is not available
	if h.accessLogService == nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(models.ArticleStats{
			Slug:          slug,
			TotalViews:    0,
			UniqueVisitors: 0,
			ViewsByMethod: map[string]int{},
			ViewsByLink:   []models.LinkViewStats{},
			DailyViews:    []models.DailyViewStats{},
		})
		return
	}

	stats, err := h.accessLogService.GetArticleStats(slug)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch stats"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// parseDuration parses duration strings like "24h", "7d", "30d"
func parseDuration(s string) (time.Duration, error) {
	s = strings.TrimSpace(s)

	// Handle "d" suffix for days
	if strings.HasSuffix(s, "d") {
		numStr := strings.TrimSuffix(s, "d")
		days, err := strconv.Atoi(numStr)
		if err != nil {
			return 0, err
		}
		return time.Duration(days) * 24 * time.Hour, nil
	}

	// Fall back to standard Go duration parsing
	return time.ParseDuration(s)
}
