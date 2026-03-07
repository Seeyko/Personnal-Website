package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/tomandrieu/blog-api/models"
	"github.com/tomandrieu/blog-api/services"
	"golang.org/x/crypto/bcrypt"
)

// validSlugPattern matches only safe slug characters (lowercase alphanumeric and hyphens)
var validSlugPattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$`)

type ArticleHandler struct {
	service          *services.ArticleService
	jwtService       *services.JWTService
	shareLinkService *services.ShareLinkService
	accessLogService *services.AccessLogService
	posthogService   *services.PostHogService
}

func NewArticleHandler(
	service *services.ArticleService,
	jwtService *services.JWTService,
	shareLinkService *services.ShareLinkService,
	accessLogService *services.AccessLogService,
	posthogService *services.PostHogService,
) *ArticleHandler {
	return &ArticleHandler{
		service:          service,
		jwtService:       jwtService,
		shareLinkService: shareLinkService,
		accessLogService: accessLogService,
		posthogService:   posthogService,
	}
}

func (h *ArticleHandler) ListArticles(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 50 {
		limit = 6
	}

	// Get language filter from query param, default to "fr"
	lang := r.URL.Query().Get("lang")
	if lang == "" {
		lang = "fr"
	}

	response := h.service.GetArticles(page, limit, lang)

	// Only show public articles in listing
	filteredArticles := []models.Article{}
	for _, article := range response.Articles {
		if article.Visibility == "public" {
			filteredArticles = append(filteredArticles, article)
		}
	}

	response.Articles = filteredArticles
	response.Pagination.Total = len(filteredArticles)
	if limit > 0 {
		response.Pagination.TotalPages = (len(filteredArticles) + limit - 1) / limit
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *ArticleHandler) GetArticle(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	slug = strings.TrimSuffix(slug, "/")

	// Get language from query param, default to "fr"
	lang := r.URL.Query().Get("lang")
	if lang == "" {
		lang = "fr"
	}

	article := h.service.GetArticle(slug, lang)
	if article == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Article not found"})
		return
	}

	// Compute visitor hash for logging
	visitorHash := ""
	if h.accessLogService != nil {
		ip := extractClientIP(r)
		ua := r.UserAgent()
		visitorHash = h.accessLogService.HashVisitor(ip, ua)
	}
	referrer := r.Referer()
	userAgent := r.UserAgent()

	switch article.Visibility {
	case "public":
		// Public article: return content
		response := models.ArticleResponse{Article: *article}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

		// Log access: attribute to share link if token present, otherwise public
		if h.accessLogService != nil {
			accessType := "public"
			var linkID *int
			if shareToken := r.URL.Query().Get("token"); shareToken != "" {
				if link, err := h.shareLinkService.ValidateToken(shareToken); err == nil && link.Slug == slug {
					accessType = "share_link"
					linkID = &link.ID
				}
			}
			go h.accessLogService.LogAccess(slug, accessType, linkID, visitorHash, referrer, userAgent)
		}
		return

	case "shared":
		// Shared article: only accessible via share token
		shareToken := r.URL.Query().Get("token")
		if shareToken == "" {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "access_denied"})
			return
		}

		// Validate share token
		link, err := h.shareLinkService.ValidateToken(shareToken)
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid_token"})
			return
		}

		// Verify token is for this article
		if link.Slug != slug {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "invalid_token"})
			return
		}

		// Token valid: return full content
		response := models.ArticleResponse{Article: *article}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

		// Log access with share link attribution
		if h.accessLogService != nil {
			linkID := link.ID
			go h.accessLogService.LogAccess(slug, "share_link", &linkID, visitorHash, referrer, userAgent)
		}
		return

	case "password":
		// Check share token first (share links bypass password)
		if shareToken := r.URL.Query().Get("token"); shareToken != "" {
			link, err := h.shareLinkService.ValidateToken(shareToken)
			if err == nil && link.Slug == slug {
				response := models.ArticleResponse{Article: *article}
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(response)

				if h.accessLogService != nil {
					linkID := link.ID
					go h.accessLogService.LogAccess(slug, "share_link", &linkID, visitorHash, referrer, userAgent)
				}
				return
			}
		}

		// Password-protected article: existing JWT flow
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
			// No token: return metadata only
			response := models.ArticleResponse{
				Article: models.Article{
					Slug:        article.Slug,
					Title:       article.Title,
					Excerpt:     article.Excerpt,
					CoverImage:  article.CoverImage,
					PublishedAt: article.PublishedAt,
					ReadingTime: article.ReadingTime,
					Lang:        article.Lang,
					Private:     true,
					Visibility:  article.Visibility,
				},
				RequiresPassword: true,
			}
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(response)
			return
		}

		// Extract and validate JWT token
		token := strings.TrimPrefix(authHeader, "Bearer ")
		if err := h.jwtService.ValidateToken(token, slug); err != nil {
			// Invalid token: return metadata only
			response := models.ArticleResponse{
				Article: models.Article{
					Slug:        article.Slug,
					Title:       article.Title,
					Excerpt:     article.Excerpt,
					CoverImage:  article.CoverImage,
					PublishedAt: article.PublishedAt,
					ReadingTime: article.ReadingTime,
					Lang:        article.Lang,
					Private:     true,
					Visibility:  article.Visibility,
				},
				RequiresPassword: true,
			}
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(response)
			return
		}

		// Valid JWT: return full content
		response := models.ArticleResponse{Article: *article}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)

		// Log access
		if h.accessLogService != nil {
			go h.accessLogService.LogAccess(slug, "password", nil, visitorHash, referrer, userAgent)
		}
		return

	default:
		// Unknown visibility: treat as public
		response := models.ArticleResponse{Article: *article}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}
}

func (h *ArticleHandler) ServeImage(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	filename := chi.URLParam(r, "filename")

	slug = strings.TrimSuffix(slug, "/")
	filename = filepath.Base(filename)

	// Validate slug contains only safe characters (prevents path traversal)
	if !validSlugPattern.MatchString(slug) {
		http.NotFound(w, r)
		return
	}

	imagePath := h.service.GetImagePath(slug, filename)

	// Path containment check: ensure resolved path is within articles directory
	absPath, err := filepath.Abs(imagePath)
	if err != nil {
		http.NotFound(w, r)
		return
	}

	absArticlesDir, err := filepath.Abs(h.service.GetArticlesDir())
	if err != nil {
		http.NotFound(w, r)
		return
	}

	// Ensure the path starts with the articles directory (with separator to prevent prefix attacks)
	if !strings.HasPrefix(absPath, absArticlesDir+string(filepath.Separator)) {
		http.NotFound(w, r)
		return
	}

	if _, err := os.Stat(imagePath); os.IsNotExist(err) {
		http.NotFound(w, r)
		return
	}

	ext := strings.ToLower(filepath.Ext(filename))
	contentTypes := map[string]string{
		".jpg":  "image/jpeg",
		".jpeg": "image/jpeg",
		".png":  "image/png",
		".gif":  "image/gif",
		".webp": "image/webp",
		".svg":  "image/svg+xml",
	}

	if ct, ok := contentTypes[ext]; ok {
		w.Header().Set("Content-Type", ct)
	}

	w.Header().Set("Cache-Control", "public, max-age=31536000")
	http.ServeFile(w, r, imagePath)
}

func (h *ArticleHandler) UnlockArticle(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	slug = strings.TrimSuffix(slug, "/")

	lang := r.URL.Query().Get("lang")
	if lang == "" {
		lang = "fr"
	}

	// Compute visitor hash for logging
	visitorHash := ""
	if h.accessLogService != nil {
		ip := extractClientIP(r)
		ua := r.UserAgent()
		visitorHash = h.accessLogService.HashVisitor(ip, ua)
	}

	// Charger l'article
	article := h.service.GetArticle(slug, lang)
	if article == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Article not found"})
		return
	}

	// Vérifier que l'article est privé
	if article.Visibility != "password" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Article is not password-protected"})
		return
	}

	// Vérifier que l'article a un mot de passe
	if article.PasswordHash == "" {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Article has no password configured"})
		return
	}

	// Parser le body
	var req models.UnlockRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
		return
	}

	// Valider le mot de passe
	if err := bcrypt.CompareHashAndPassword([]byte(article.PasswordHash), []byte(req.Password)); err != nil {
		// Log failed password attempt
		if h.accessLogService != nil {
			go h.accessLogService.LogPasswordAttempt(slug, visitorHash, false)
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid password"})
		return
	}

	// Log successful password attempt
	if h.accessLogService != nil {
		go h.accessLogService.LogPasswordAttempt(slug, visitorHash, true)
	}

	// Générer le JWT
	token, expiresAt, err := h.jwtService.GenerateToken(slug)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to generate token"})
		return
	}

	// Retourner le token
	response := models.UnlockResponse{
		Token:     token,
		ExpiresAt: expiresAt.Format(time.RFC3339),
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *ArticleHandler) RefreshCache(w http.ResponseWriter, r *http.Request) {
	if err := h.service.RefreshCache(); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "cache refreshed"})
}

// extractClientIP extracts the real client IP from the request
func extractClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ips := strings.Split(xff, ",")
		return strings.TrimSpace(ips[0])
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	ip := r.RemoteAddr
	if colon := strings.LastIndex(ip, ":"); colon != -1 {
		ip = ip[:colon]
	}
	return ip
}
