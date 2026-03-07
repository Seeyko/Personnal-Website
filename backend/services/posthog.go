package services

import (
	"log"
	"os"

	"github.com/posthog/posthog-go"
)

type PostHogService struct {
	client  posthog.Client
	enabled bool
}

func NewPostHogService() *PostHogService {
	apiKey := os.Getenv("POSTHOG_API_KEY")
	if apiKey == "" {
		log.Println("WARNING: POSTHOG_API_KEY not set — PostHog tracking disabled")
		return &PostHogService{enabled: false}
	}

	host := os.Getenv("POSTHOG_HOST")
	if host == "" {
		host = "https://eu.i.posthog.com"
	}

	client, err := posthog.NewWithConfig(apiKey, posthog.Config{
		Endpoint: host,
	})
	if err != nil {
		log.Printf("WARNING: Failed to initialize PostHog client: %v — tracking disabled", err)
		return &PostHogService{enabled: false}
	}

	log.Printf("PostHog tracking enabled (host: %s)", host)
	return &PostHogService{
		client:  client,
		enabled: true,
	}
}

func (s *PostHogService) Close() {
	if s.enabled && s.client != nil {
		s.client.Close()
	}
}

func (s *PostHogService) TrackArticleViewed(visitorHash, slug, accessMethod string, shareLinkID *int, shareLinkLabel, referrer string) {
	if !s.enabled {
		return
	}

	properties := posthog.NewProperties().
		Set("slug", slug).
		Set("access_method", accessMethod).
		Set("referrer", referrer)

	if shareLinkID != nil {
		properties.Set("share_link_id", *shareLinkID)
		properties.Set("share_link_label", shareLinkLabel)
	}

	s.client.Enqueue(posthog.Capture{
		DistinctId: visitorHash,
		Event:      "article_viewed",
		Properties: properties,
	})
}

func (s *PostHogService) TrackPasswordAttempt(visitorHash, slug string, success bool) {
	if !s.enabled {
		return
	}

	s.client.Enqueue(posthog.Capture{
		DistinctId: visitorHash,
		Event:      "password_attempt",
		Properties: posthog.NewProperties().
			Set("slug", slug).
			Set("success", success),
	})
}

func (s *PostHogService) TrackShareLinkCreated(slug string, linkID int, label string) {
	if !s.enabled {
		return
	}

	s.client.Enqueue(posthog.Capture{
		DistinctId: "admin",
		Event:      "share_link_created",
		Properties: posthog.NewProperties().
			Set("slug", slug).
			Set("link_id", linkID).
			Set("label", label),
	})
}

func (s *PostHogService) TrackShareLinkRevoked(slug string, linkID int, label string) {
	if !s.enabled {
		return
	}

	s.client.Enqueue(posthog.Capture{
		DistinctId: "admin",
		Event:      "share_link_revoked",
		Properties: posthog.NewProperties().
			Set("slug", slug).
			Set("link_id", linkID).
			Set("label", label),
	})
}
