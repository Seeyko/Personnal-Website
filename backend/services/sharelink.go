package services

import (
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/tomandrieu/blog-api/models"
)

type ShareLinkService struct {
	db *Database
}

func NewShareLinkService(db *Database) *ShareLinkService {
	return &ShareLinkService{db: db}
}

// generateToken creates a cryptographically secure 22-char base64url token (128-bit)
func generateToken() (string, error) {
	b := make([]byte, 16) // 128 bits
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func (s *ShareLinkService) CreateLink(slug, label string, maxUses *int, expiresAt *time.Time) (*models.ShareLink, error) {
	token, err := generateToken()
	if err != nil {
		return nil, err
	}

	var id int
	err = s.db.DB.QueryRow(
		`INSERT INTO share_links (token, slug, label, max_uses, expires_at) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
		token, slug, label, maxUses, expiresAt,
	).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("failed to create share link: %w", err)
	}

	return s.GetLinkByID(id)
}

func (s *ShareLinkService) ValidateToken(token string) (*models.ShareLink, error) {
	link, err := s.scanLink(
		s.db.DB.QueryRow(`SELECT id, token, slug, label, max_uses, use_count, expires_at, revoked, created_at, revoked_at FROM share_links WHERE token = $1`, token),
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("share link not found")
		}
		return nil, err
	}

	if link.Revoked {
		return nil, fmt.Errorf("share link has been revoked")
	}

	if link.ExpiresAt != nil && time.Now().After(*link.ExpiresAt) {
		return nil, fmt.Errorf("share link has expired")
	}

	if link.MaxUses != nil && link.UseCount >= *link.MaxUses {
		return nil, fmt.Errorf("share link has reached maximum uses")
	}

	// Increment use_count atomically
	_, err = s.db.DB.Exec(`UPDATE share_links SET use_count = use_count + 1 WHERE id = $1`, link.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to increment use count: %w", err)
	}

	link.UseCount++
	return link, nil
}

func (s *ShareLinkService) GetLinksForSlug(slug string) ([]models.ShareLink, error) {
	rows, err := s.db.DB.Query(
		`SELECT id, token, slug, label, max_uses, use_count, expires_at, revoked, created_at, revoked_at FROM share_links WHERE slug = $1 ORDER BY created_at DESC`,
		slug,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return s.scanLinks(rows)
}

func (s *ShareLinkService) GetAllLinks() ([]models.ShareLink, error) {
	rows, err := s.db.DB.Query(
		`SELECT id, token, slug, label, max_uses, use_count, expires_at, revoked, created_at, revoked_at FROM share_links ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return s.scanLinks(rows)
}

func (s *ShareLinkService) RevokeLink(id int) error {
	result, err := s.db.DB.Exec(
		`UPDATE share_links SET revoked = true, revoked_at = $1 WHERE id = $2`,
		time.Now().UTC(), id,
	)
	if err != nil {
		return fmt.Errorf("failed to revoke link: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected == 0 {
		return fmt.Errorf("share link not found")
	}

	return nil
}

func (s *ShareLinkService) GetLinkByID(id int) (*models.ShareLink, error) {
	return s.scanLink(
		s.db.DB.QueryRow(`SELECT id, token, slug, label, max_uses, use_count, expires_at, revoked, created_at, revoked_at FROM share_links WHERE id = $1`, id),
	)
}

// scanLink scans a single row into a ShareLink
func (s *ShareLinkService) scanLink(row *sql.Row) (*models.ShareLink, error) {
	var link models.ShareLink
	var maxUses *int
	var expiresAt *time.Time
	var revokedAt *time.Time

	err := row.Scan(
		&link.ID, &link.Token, &link.Slug, &link.Label,
		&maxUses, &link.UseCount, &expiresAt,
		&link.Revoked, &link.CreatedAt, &revokedAt,
	)
	if err != nil {
		return nil, err
	}

	link.MaxUses = maxUses
	link.ExpiresAt = expiresAt
	link.RevokedAt = revokedAt

	return &link, nil
}

// scanLinks scans multiple rows into a slice of ShareLinks
func (s *ShareLinkService) scanLinks(rows *sql.Rows) ([]models.ShareLink, error) {
	var links []models.ShareLink

	for rows.Next() {
		var link models.ShareLink
		var maxUses *int
		var expiresAt *time.Time
		var revokedAt *time.Time

		err := rows.Scan(
			&link.ID, &link.Token, &link.Slug, &link.Label,
			&maxUses, &link.UseCount, &expiresAt,
			&link.Revoked, &link.CreatedAt, &revokedAt,
		)
		if err != nil {
			return nil, err
		}

		link.MaxUses = maxUses
		link.ExpiresAt = expiresAt
		link.RevokedAt = revokedAt

		links = append(links, link)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return links, nil
}
