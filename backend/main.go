package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/tomandrieu/blog-api/handlers"
	custommiddleware "github.com/tomandrieu/blog-api/middleware"
	"github.com/tomandrieu/blog-api/services"
	"github.com/tomandrieu/blog-api/services/ratelimit"
)

// DetailedLogger is a custom middleware that logs full request details for debugging
func DetailedLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Log incoming request details
		log.Printf("=== INCOMING REQUEST ===")
		log.Printf("Method: %s", r.Method)
		log.Printf("URL.Path: %s", r.URL.Path)
		log.Printf("URL.RawPath: %s", r.URL.RawPath)
		log.Printf("URL.RawQuery: %s", r.URL.RawQuery)
		log.Printf("RequestURI: %s", r.RequestURI)
		log.Printf("Host: %s", r.Host)
		log.Printf("RemoteAddr: %s", r.RemoteAddr)

		// Log relevant headers
		log.Printf("--- Headers ---")
		for _, header := range []string{"X-Forwarded-For", "X-Forwarded-Proto", "X-Forwarded-Host", "X-Real-IP", "X-Original-URI"} {
			if val := r.Header.Get(header); val != "" {
				log.Printf("%s: %s", header, val)
			}
		}

		// Wrap response writer to capture status code
		ww := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(ww, r)

		// Log response
		log.Printf("--- Response ---")
		log.Printf("Status: %d", ww.statusCode)
		log.Printf("Duration: %v", time.Since(start))
		log.Printf("========================\n")
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

func main() {
	articlesDir := os.Getenv("ARTICLES_DIR")
	if articlesDir == "" {
		articlesDir = "/app/articles"
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	// Get frontend URL for CORS (supports subdomain setup)
	frontendURL := os.Getenv("FRONTEND_URL")
	allowedOrigins := []string{"http://localhost:8000", "http://localhost:3000"}
	if frontendURL != "" {
		allowedOrigins = append(allowedOrigins, frontendURL)
	}

	// Admin secret path (hidden route — no public references anywhere)
	adminSecretPath := os.Getenv("ADMIN_SECRET_PATH")
	if adminSecretPath == "" {
		adminSecretPath = "***REMOVED***"
	}

	// Admin API key (required in production)
	adminAPIKey := os.Getenv("ADMIN_API_KEY")
	if adminAPIKey == "" {
		adminAPIKey = "dev-admin-key-change-me"
		log.Println("WARNING: Using default ADMIN_API_KEY — set ADMIN_API_KEY env var in production!")
	}

	// Admin IP allowlist (optional)
	var adminAllowedIPs []string
	if ips := os.Getenv("ADMIN_ALLOWED_IPS"); ips != "" {
		for _, ip := range strings.Split(ips, ",") {
			ip = strings.TrimSpace(ip)
			if ip != "" {
				adminAllowedIPs = append(adminAllowedIPs, ip)
			}
		}
		log.Printf("Admin IP allowlist enabled: %v", adminAllowedIPs)
	}

	// Initialize services
	articleService := services.NewArticleService(articlesDir)
	jwtService := services.NewJWTService()

	// Initialize PostgreSQL database
	db, err := services.NewDatabase()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize PostHog (gracefully optional)
	posthogService := services.NewPostHogService()
	defer posthogService.Close()

	// Initialize share link and access log services
	shareLinkService := services.NewShareLinkService(db)
	accessLogService := services.NewAccessLogService(db, posthogService)

	// Initialize handlers
	articleHandler := handlers.NewArticleHandler(articleService, jwtService, shareLinkService, accessLogService, posthogService)
	adminHandler := handlers.NewAdminHandler(articleService, shareLinkService, accessLogService)

	// Initialize admin auth middleware
	adminAuth := custommiddleware.NewAdminAuthMiddleware(adminAPIKey, adminAllowedIPs)

	// Initialize rate limiter for article unlock protection
	rateLimiter := ratelimit.NewRateLimiter(
		5,              // 5 attempts per minute
		10,             // lockout after 10 failures
		15*time.Minute, // lockout duration: 15 minutes
		5*time.Minute,  // cleanup interval: 5 minutes
	)
	rateLimitMW := custommiddleware.NewRateLimitMiddleware(rateLimiter)

	r := chi.NewRouter()

	// Use detailed logger for debugging (remove in production if too verbose)
	r.Use(DetailedLogger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Compress(5))

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   allowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Content-Type", "Authorization"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Root health check (useful to test if server is reachable at all)
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status":"ok","message":"Backend is running. API routes are under /api"}`)
	})

	r.Route("/api", func(r chi.Router) {
		r.Get("/health", handlers.HealthCheck)

		r.Get("/articles", articleHandler.ListArticles)
		r.Get("/articles/{slug}", articleHandler.GetArticle)
		r.Get("/articles/{slug}/", articleHandler.GetArticle)
		r.Get("/articles/{slug}/image/{filename}", articleHandler.ServeImage)

		// Apply rate limiting middleware to unlock endpoint
		r.With(rateLimitMW.UnlockRateLimit).Post("/articles/{slug}/unlock", articleHandler.UnlockArticle)

		r.Post("/refresh", articleHandler.RefreshCache)

		// Admin routes (hidden behind secret path + API key auth)
		r.Route("/"+adminSecretPath, func(r chi.Router) {
			r.Use(adminAuth.Authenticate)

			r.Get("/articles", adminHandler.ListArticles)
			r.Get("/articles/{slug}/share-links", adminHandler.ListShareLinks)
			r.Post("/articles/{slug}/share-links", adminHandler.CreateShareLink)
			r.Get("/articles/{slug}/stats", adminHandler.GetArticleStats)
			r.Get("/share-links", adminHandler.ListAllShareLinks)
			r.Delete("/share-links/{id}", adminHandler.RevokeShareLink)
		})
	})

	// Catch-all route to debug unmatched requests
	r.NotFound(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("!!! 404 NOT FOUND !!!")
		log.Printf("No route matched for: %s %s", r.Method, r.URL.Path)

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprintf(w, `{"error":"not_found","path":"%s","message":"Route not found. Available: /api/health, /api/articles, /api/articles/{slug}"}`, r.URL.Path)
	})

	log.Printf("===========================================")
	log.Printf("Starting server on port %s", port)
	log.Printf("Articles directory: %s", articlesDir)
	log.Printf("CORS allowed origins: %v", allowedOrigins)
	log.Printf("Rate limiting: ENABLED (5 attempts/min, lockout after 10 failures)")
	log.Printf("Admin API: /api/%s/* (hidden route)", adminSecretPath)
	log.Printf("Available routes:")
	log.Printf("  GET  /                         - Root health check")
	log.Printf("  GET  /api/health               - API health check")
	log.Printf("  GET  /api/articles             - List articles")
	log.Printf("  GET  /api/articles/{slug}      - Get article by slug")
	log.Printf("  GET  /api/articles/{slug}/image/{filename} - Serve image")
	log.Printf("  POST /api/articles/{slug}/unlock - Unlock private article (rate limited)")
	log.Printf("  POST /api/refresh              - Refresh cache")
	log.Printf("  [ADMIN] GET/POST/DELETE /api/%s/* - Admin endpoints (auth required)", adminSecretPath)
	log.Printf("===========================================")

	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}
