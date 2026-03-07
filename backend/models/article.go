package models

import "time"

type Article struct {
	Slug         string    `json:"slug"`
	Title        string    `json:"title"`
	Excerpt      string    `json:"excerpt"`
	Content      string    `json:"content,omitempty"`
	CoverImage   string    `json:"coverImage"`
	PublishedAt  time.Time `json:"publishedAt"`
	ReadingTime  int       `json:"readingTime"`
	Lang         string    `json:"lang"`
	Private      bool      `json:"private,omitempty"`      // Kept for frontend backward compat
	Visibility   string    `json:"visibility,omitempty"`   // "public", "password", "shared"
	PasswordHash string    `json:"-"`                      // Jamais exposé dans l'API
}

type ArticleListResponse struct {
	Articles   []Article  `json:"articles"`
	Pagination Pagination `json:"pagination"`
}

type ArticleResponse struct {
	Article          Article `json:"article"`
	RequiresPassword bool    `json:"requiresPassword,omitempty"`
}

type UnlockRequest struct {
	Password string `json:"password"`
}

type UnlockResponse struct {
	Token     string `json:"token"`
	ExpiresAt string `json:"expiresAt"`
}

type Pagination struct {
	Page       int  `json:"page"`
	Limit      int  `json:"limit"`
	Total      int  `json:"total"`
	TotalPages int  `json:"totalPages"`
	HasNext    bool `json:"hasNext"`
	HasPrev    bool `json:"hasPrev"`
}

// --- Share Link types ---

type ShareLink struct {
	ID        int        `json:"id"`
	Token     string     `json:"token"`
	Slug      string     `json:"slug"`
	Label     string     `json:"label"`
	MaxUses   *int       `json:"maxUses"`
	UseCount  int        `json:"useCount"`
	ExpiresAt *time.Time `json:"expiresAt"`
	Revoked   bool       `json:"revoked"`
	CreatedAt time.Time  `json:"createdAt"`
	RevokedAt *time.Time `json:"revokedAt,omitempty"`
	URL       string     `json:"url,omitempty"`
}

type CreateShareLinkRequest struct {
	Label   string `json:"label"`
	MaxUses *int   `json:"maxUses"`
	// ExpiresIn is duration string like "24h", "7d", "30d"
	ExpiresIn string `json:"expiresIn"`
}

// --- Access Log & Stats types ---

type AccessLogEntry struct {
	ID           int       `json:"id"`
	Slug         string    `json:"slug"`
	AccessMethod string    `json:"accessMethod"` // "public", "password", "share_link"
	ShareLinkID  *int      `json:"shareLinkId,omitempty"`
	VisitorHash  string    `json:"visitorHash"`
	Referrer     string    `json:"referrer"`
	UserAgent    string    `json:"userAgent"`
	CreatedAt    time.Time `json:"createdAt"`
}

type ArticleStats struct {
	Slug           string            `json:"slug"`
	TotalViews     int               `json:"totalViews"`
	UniqueVisitors int               `json:"uniqueVisitors"`
	ViewsByMethod  map[string]int    `json:"viewsByMethod"`
	ViewsByLink    []LinkViewStats   `json:"viewsByLink"`
	DailyViews     []DailyViewStats  `json:"dailyViews"`
}

type LinkViewStats struct {
	LinkID   int    `json:"linkId"`
	Label    string `json:"label"`
	Views    int    `json:"views"`
	Unique   int    `json:"unique"`
}

type DailyViewStats struct {
	Date  string `json:"date"`
	Views int    `json:"views"`
}

// --- Admin article summary ---

type AdminArticleSummary struct {
	Slug        string    `json:"slug"`
	Title       string    `json:"title"`
	Lang        string    `json:"lang"`
	Visibility  string    `json:"visibility"`
	TotalViews  int       `json:"totalViews"`
	LinkCount   int       `json:"linkCount"`
	PublishedAt time.Time `json:"publishedAt"`
}
