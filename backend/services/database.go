package services

import (
	"database/sql"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

type Database struct {
	DB *sql.DB
}

func NewDatabase() (*Database, error) {
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "/app/data/blog.db"
	}

	// Ensure directory exists
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, err
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	// Enable WAL mode for better concurrent read performance
	if _, err := db.Exec("PRAGMA journal_mode=WAL"); err != nil {
		return nil, err
	}

	// Enable foreign keys
	if _, err := db.Exec("PRAGMA foreign_keys=ON"); err != nil {
		return nil, err
	}

	database := &Database{DB: db}
	if err := database.migrate(); err != nil {
		return nil, err
	}

	log.Printf("SQLite database initialized at %s", dbPath)
	return database, nil
}

func (d *Database) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS share_links (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		token      TEXT UNIQUE NOT NULL,
		slug       TEXT NOT NULL,
		label      TEXT NOT NULL DEFAULT '',
		max_uses   INTEGER,
		use_count  INTEGER NOT NULL DEFAULT 0,
		expires_at DATETIME,
		revoked    INTEGER NOT NULL DEFAULT 0,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		revoked_at DATETIME
	);

	CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
	CREATE INDEX IF NOT EXISTS idx_share_links_slug ON share_links(slug);

	CREATE TABLE IF NOT EXISTS access_log (
		id            INTEGER PRIMARY KEY AUTOINCREMENT,
		slug          TEXT NOT NULL,
		access_method TEXT NOT NULL,
		share_link_id INTEGER,
		visitor_hash  TEXT NOT NULL,
		referrer      TEXT DEFAULT '',
		user_agent    TEXT DEFAULT '',
		created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
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
