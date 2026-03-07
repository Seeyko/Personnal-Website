package services

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/lib/pq"
)

type Database struct {
	DB *sql.DB
}

func NewDatabase() (*Database, error) {
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL environment variable is required")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Verify connectivity
	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	database := &Database{DB: db}
	if err := database.migrate(); err != nil {
		return nil, err
	}

	log.Println("PostgreSQL database initialized")
	return database, nil
}

func (d *Database) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS share_links (
		id         SERIAL PRIMARY KEY,
		token      TEXT UNIQUE NOT NULL,
		slug       TEXT NOT NULL,
		label      TEXT NOT NULL DEFAULT '',
		max_uses   INTEGER,
		use_count  INTEGER NOT NULL DEFAULT 0,
		expires_at TIMESTAMPTZ,
		revoked    BOOLEAN NOT NULL DEFAULT false,
		created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
		revoked_at TIMESTAMPTZ
	);

	CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
	CREATE INDEX IF NOT EXISTS idx_share_links_slug ON share_links(slug);

	CREATE TABLE IF NOT EXISTS access_log (
		id            SERIAL PRIMARY KEY,
		slug          TEXT NOT NULL,
		access_method TEXT NOT NULL,
		share_link_id INTEGER,
		visitor_hash  TEXT NOT NULL,
		referrer      TEXT DEFAULT '',
		user_agent    TEXT DEFAULT '',
		created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
	);

	CREATE INDEX IF NOT EXISTS idx_access_log_slug ON access_log(slug);
	CREATE INDEX IF NOT EXISTS idx_access_log_created_at ON access_log(created_at);
	`

	_, err := d.DB.Exec(schema)
	if err != nil {
		return err
	}

	log.Println("Database schema migration completed")
	return nil
}

func (d *Database) Close() error {
	return d.DB.Close()
}
