package handlers

import (
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/tomandrieu/blog-api/services"
)

// newTestSSRServer serves the blog routes from a temp articles dir holding one
// public French article.
func newTestSSRServer(t *testing.T) *httptest.Server {
	t.Helper()
	dir := t.TempDir()
	article := "---\ntitle: \"Bonjour\"\nexcerpt: \"Un premier article.\"\npublishedAt: \"2026-01-16\"\nlang: fr\n---\n\nDu texte.\n"
	if err := os.MkdirAll(filepath.Join(dir, "bonjour"), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "bonjour", "index.fr.md"), []byte(article), 0o644); err != nil {
		t.Fatal(err)
	}

	log.SetOutput(io.Discard) // the article service is chatty
	t.Cleanup(func() { log.SetOutput(os.Stderr) })

	h := NewSSRHandler(services.NewArticleService(dir), nil, "https://tomandrieu.com", "https://api.tomandrieu.com")
	r := chi.NewRouter()
	r.Get("/blog", h.ServeBlogPage)
	r.Get("/blog/", h.ServeBlogPage)
	r.Get("/blog/{slug}/", h.ServeBlogPage)
	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	return srv
}

func get(t *testing.T, url string) (int, string) {
	t.Helper()
	res, err := http.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	body, err := io.ReadAll(res.Body)
	if err != nil {
		t.Fatal(err)
	}
	return res.StatusCode, string(body)
}

var (
	headerRe  = regexp.MustCompile(`(?s)<header class="header".*?</header>`)
	commentRe = regexp.MustCompile(`(?s)<!--.*?-->`)
	spaceRe   = regexp.MustCompile(`\s+`)
)

// normalizedHeader returns the page's <header>, without comments or layout
// whitespace, so markup can be compared across the two blog pages.
func normalizedHeader(html string) string {
	h := commentRe.ReplaceAllString(headerRe.FindString(html), "")
	return strings.TrimSpace(strings.ReplaceAll(spaceRe.ReplaceAllString(h, " "), "> <", "><"))
}

// The production blog is this template, not frontend/blog.html: both must
// ship the same header and the same self-hosted assets.
func TestBlogTemplateMatchesFrontendPage(t *testing.T) {
	srv := newTestSSRServer(t)

	pages := map[string]int{
		"/blog/":                200,
		"/blog/bonjour/":        200,
		"/blog/does-not-exist/": 404,
	}
	for path, want := range pages {
		code, html := get(t, srv.URL+path)
		if code != want {
			t.Fatalf("%s: status %d, want %d", path, code, want)
		}

		nav := regexp.MustCompile(`<a href="([^"]+)" class="nav-link`).FindAllStringSubmatch(html, -1)
		var hrefs []string
		for _, m := range nav {
			hrefs = append(hrefs, m[1])
		}
		if got := strings.Join(hrefs, " "); got != "/#now /#work /#timeline /#about /#contact /blog" {
			t.Errorf("%s: nav links = %q", path, got)
		}
		if !strings.Contains(html, `<a href="/blog" class="nav-link active" data-section="06" aria-current="page">`) {
			t.Errorf("%s: Writing is not marked as the current page", path)
		}

		for _, s := range []string{
			`href="/assets/fonts/fonts.css"`,
			`src="/assets/vendor/gsap.min.js"`,
			`src="/assets/vendor/ScrollTrigger.min.js"`,
			`src="/js/theme-manager.js?v=`,
			`window.__SSR_DATA__`,
		} {
			if !strings.Contains(html, s) {
				t.Errorf("%s: missing %s", path, s)
			}
		}
		for _, s := range []string{"fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"} {
			if strings.Contains(html, s) {
				t.Errorf("%s: still requests %s", path, s)
			}
		}
	}

	_, article := get(t, srv.URL+"/blog/bonjour/")
	if !strings.Contains(article, `"@type": "BlogPosting"`) || !strings.Contains(article, `<meta property="og:type" content="article" />`) {
		t.Error("article page lost its JSON-LD / Open Graph tags")
	}
	_, notFound := get(t, srv.URL+"/blog/does-not-exist/")
	if !strings.Contains(notFound, `<meta name="robots" content="noindex, nofollow" />`) {
		t.Error("not-found page is indexable")
	}

	// Same header markup as the dev page (frontend/blog.html), when the repo is there.
	frontend, err := os.ReadFile(filepath.Join("..", "..", "frontend", "blog.html"))
	if err != nil {
		t.Skipf("frontend/blog.html not available: %v", err)
	}
	_, listing := get(t, srv.URL+"/blog/")
	if got, want := normalizedHeader(listing), normalizedHeader(string(frontend)); got != want {
		t.Errorf("template header drifted from frontend/blog.html:\n got: %s\nwant: %s", got, want)
	}
}
