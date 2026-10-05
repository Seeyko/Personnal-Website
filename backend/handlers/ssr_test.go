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

// The articles must come in the language of the UI around them: detectLang
// follows the same order as the frontend's LanguageManager (?lang, the `lang`
// cookie it writes, the browser's ranked languages, then French).
func TestDetectLang(t *testing.T) {
	h := &SSRHandler{}
	cases := []struct{ name, query, cookie, accept, want string }{
		{"no header (crawler)", "", "", "", "fr"},
		{"English browser", "", "", "en-US", "en"},
		{"French browser", "", "", "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7", "fr"},
		{"English first, French listed too", "", "", "en-US,en;q=0.9,fr;q=0.8", "en"},
		{"q-values win over order", "", "", "fr;q=0.5, en;q=0.8", "en"},
		{"other language first, then English", "", "", "de-DE,de;q=0.9,en;q=0.8", "en"},
		{"neither language", "", "", "de-DE,de;q=0.9", "fr"},
		{"English refused", "", "", "en;q=0", "fr"},
		{"cookie beats Accept-Language", "", "fr", "en-US", "fr"},
		{"cookie en on a French browser", "", "en", "fr-FR,fr", "en"},
		{"?lang beats the cookie", "lang=en", "fr", "fr-FR", "en"},
		{"unknown cookie ignored", "", "de", "en-US", "en"},
		{"unknown ?lang ignored", "lang=de", "", "en-GB", "en"},
	}
	for _, c := range cases {
		r := httptest.NewRequest(http.MethodGet, "/blog/?"+c.query, nil)
		if c.cookie != "" {
			r.AddCookie(&http.Cookie{Name: "lang", Value: c.cookie})
		}
		if c.accept != "" {
			r.Header.Set("Accept-Language", c.accept)
		}
		if got := h.detectLang(r); got != c.want {
			t.Errorf("%s: detectLang = %q, want %q", c.name, got, c.want)
		}
	}
}

// What crawlers get is unchanged: no cookie and no Accept-Language means the
// French canonical page, with its English alternate.
func TestBlogLanguageSEO(t *testing.T) {
	srv := newTestSSRServer(t)
	fetch := func(path, accept string) string {
		t.Helper()
		req, err := http.NewRequest(http.MethodGet, srv.URL+path, nil)
		if err != nil {
			t.Fatal(err)
		}
		if accept != "" {
			req.Header.Set("Accept-Language", accept)
		}
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		body, err := io.ReadAll(res.Body)
		if err != nil {
			t.Fatal(err)
		}
		return string(body)
	}

	cases := []struct{ path, accept, lang, canonical, alt string }{
		{"/blog/", "", "fr", "https://tomandrieu.com/blog/", `hreflang="en" href="https://tomandrieu.com/blog/?lang=en"`},
		{"/blog/bonjour/", "", "fr", "https://tomandrieu.com/blog/bonjour/", `hreflang="en" href="https://tomandrieu.com/blog/bonjour/?lang=en"`},
		{"/blog/?lang=en", "", "en", "https://tomandrieu.com/blog/?lang=en", `hreflang="fr" href="https://tomandrieu.com/blog/"`},
		{"/blog/", "en-US,en;q=0.9,fr;q=0.8", "en", "https://tomandrieu.com/blog/?lang=en", `hreflang="fr" href="https://tomandrieu.com/blog/"`},
	}
	for _, c := range cases {
		html := fetch(c.path, c.accept)
		if !strings.Contains(html, `<html lang="`+c.lang+`">`) {
			t.Errorf("%s (%q): page not rendered in %s", c.path, c.accept, c.lang)
		}
		if !strings.Contains(html, `<link rel="canonical" href="`+c.canonical+`" />`) {
			t.Errorf("%s (%q): canonical is not %s", c.path, c.accept, c.canonical)
		}
		if !strings.Contains(html, c.alt) {
			t.Errorf("%s (%q): missing alternate %s", c.path, c.accept, c.alt)
		}
	}
}
