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
	service    *services.ArticleService
	jwtService *services.JWTService
}

func NewArticleHandler(service *services.ArticleService, jwtService *services.JWTService) *ArticleHandler {
	return &ArticleHandler{
		service:    service,
		jwtService: jwtService,
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

	// Filtrer les articles privés
	filteredArticles := []models.Article{}
	for _, article := range response.Articles {
		if !article.Private {
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

	// Si l'article n'est pas privé, retourner directement
	if !article.Private {
		response := models.ArticleResponse{Article: *article}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Article privé : vérifier le JWT
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		// Pas de token : retourner metadata seulement
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
				// Content omis
			},
			RequiresPassword: true,
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Extraire le token
	token := strings.TrimPrefix(authHeader, "Bearer ")

	// Valider le token
	if err := h.jwtService.ValidateToken(token, slug); err != nil {
		// Token invalide : retourner metadata seulement
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
			},
			RequiresPassword: true,
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(response)
		return
	}

	// Token valide : retourner l'article complet
	response := models.ArticleResponse{Article: *article}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
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

	// Charger l'article
	article := h.service.GetArticle(slug, lang)
	if article == nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Article not found"})
		return
	}

	// Vérifier que l'article est privé
	if !article.Private {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Article is not private"})
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
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid password"})
		return
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
