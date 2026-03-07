package services

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/tomandrieu/blog-api/models"
)

type AccessLogService struct {
	db      *Database
	posthog *PostHogService
}

func NewAccessLogService(db *Database, posthog *PostHogService) *AccessLogService {
	return &AccessLogService{
		db:      db,
		posthog: posthog,
	}
}

func (s *AccessLogService) HashVisitor(ip, userAgent string) string {
	h := sha256.Sum256([]byte(ip + "|" + userAgent))
	return hex.EncodeToString(h[:])[:16]
}

func (s *AccessLogService) LogAccess(slug, accessMethod string, shareLinkID *int, visitorHash, referrer, userAgent string) error {
	_, err := s.db.DB.Exec(
		`INSERT INTO access_log (slug, access_method, share_link_id, visitor_hash, referrer, user_agent) VALUES ($1, $2, $3, $4, $5, $6)`,
		slug, accessMethod, shareLinkID, visitorHash, referrer, userAgent,
	)
	if err != nil {
		return fmt.Errorf("insert access_log: %w", err)
	}

	// PostHog tracking — look up share link label if needed
	var shareLinkLabel string
	if shareLinkID != nil {
		var label string
		row := s.db.DB.QueryRow(`SELECT label FROM share_links WHERE id = $1`, *shareLinkID)
		if row.Scan(&label) == nil {
			shareLinkLabel = label
		}
	}

	s.posthog.TrackArticleViewed(visitorHash, slug, accessMethod, shareLinkID, shareLinkLabel, referrer)

	return nil
}

func (s *AccessLogService) LogPasswordAttempt(slug, visitorHash string, success bool) {
	s.posthog.TrackPasswordAttempt(visitorHash, slug, success)
}

func (s *AccessLogService) GetArticleStats(slug string) (*models.ArticleStats, error) {
	stats := &models.ArticleStats{
		Slug:          slug,
		ViewsByMethod: make(map[string]int),
	}

	// Total views
	err := s.db.DB.QueryRow(`SELECT COUNT(*) FROM access_log WHERE slug = $1`, slug).Scan(&stats.TotalViews)
	if err != nil {
		return nil, fmt.Errorf("count total views: %w", err)
	}

	// Unique visitors
	err = s.db.DB.QueryRow(`SELECT COUNT(DISTINCT visitor_hash) FROM access_log WHERE slug = $1`, slug).Scan(&stats.UniqueVisitors)
	if err != nil {
		return nil, fmt.Errorf("count unique visitors: %w", err)
	}

	// Views by method
	rows, err := s.db.DB.Query(`SELECT access_method, COUNT(*) FROM access_log WHERE slug = $1 GROUP BY access_method`, slug)
	if err != nil {
		return nil, fmt.Errorf("query views by method: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var method string
		var count int
		if err := rows.Scan(&method, &count); err != nil {
			return nil, fmt.Errorf("scan views by method: %w", err)
		}
		stats.ViewsByMethod[method] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate views by method: %w", err)
	}

	// Views per share link
	linkRows, err := s.db.DB.Query(
		`SELECT al.share_link_id, COUNT(*), COUNT(DISTINCT al.visitor_hash), COALESCE(sl.label, '')
		 FROM access_log al
		 LEFT JOIN share_links sl ON al.share_link_id = sl.id
		 WHERE al.slug = $1 AND al.share_link_id IS NOT NULL
		 GROUP BY al.share_link_id, sl.label`,
		slug,
	)
	if err != nil {
		return nil, fmt.Errorf("query views per link: %w", err)
	}
	defer linkRows.Close()

	for linkRows.Next() {
		var ls models.LinkViewStats
		if err := linkRows.Scan(&ls.LinkID, &ls.Views, &ls.Unique, &ls.Label); err != nil {
			return nil, fmt.Errorf("scan views per link: %w", err)
		}
		stats.ViewsByLink = append(stats.ViewsByLink, ls)
	}
	if err := linkRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate views per link: %w", err)
	}

	// Daily views (last 30 days)
	dayRows, err := s.db.DB.Query(
		`SELECT DATE(created_at) as date, COUNT(*)
		 FROM access_log
		 WHERE slug = $1 AND created_at >= NOW() - INTERVAL '30 days'
		 GROUP BY DATE(created_at)
		 ORDER BY date`,
		slug,
	)
	if err != nil {
		return nil, fmt.Errorf("query daily views: %w", err)
	}
	defer dayRows.Close()

	for dayRows.Next() {
		var dv models.DailyViewStats
		if err := dayRows.Scan(&dv.Date, &dv.Views); err != nil {
			return nil, fmt.Errorf("scan daily views: %w", err)
		}
		stats.DailyViews = append(stats.DailyViews, dv)
	}
	if err := dayRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate daily views: %w", err)
	}

	return stats, nil
}

func (s *AccessLogService) GetArticleViewCount(slug string) (int, error) {
	var count int
	err := s.db.DB.QueryRow(`SELECT COUNT(*) FROM access_log WHERE slug = $1`, slug).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count article views: %w", err)
	}
	return count, nil
}

func (s *AccessLogService) GetAllArticleViewCounts() (map[string]int, error) {
	rows, err := s.db.DB.Query(`SELECT slug, COUNT(*) FROM access_log GROUP BY slug`)
	if err != nil {
		return nil, fmt.Errorf("query all article view counts: %w", err)
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var slug string
		var count int
		if err := rows.Scan(&slug, &count); err != nil {
			return nil, fmt.Errorf("scan article view count: %w", err)
		}
		counts[slug] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate article view counts: %w", err)
	}

	return counts, nil
}
