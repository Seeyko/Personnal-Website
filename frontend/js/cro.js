/**
 * ═══════════════════════════════════════════════════════════════
 * CRO - CONVERSION RATE OPTIMIZATION
 * Behavioral triggers and conversion tracking for 20-30% conversion
 * ═══════════════════════════════════════════════════════════════
 */

(function() {
  'use strict';

  // ─── Configuration ───
  const CRO_CONFIG = {
    exitIntentDelay: 120000,      // Wait 2 minutes before enabling exit intent
    scrollTriggerPercent: 60,     // Trigger attention at 60% scroll
    floatingCtaHideDistance: 400, // Hide floating CTA 400px from contact
    engagementThresholds: [30, 60, 120], // Seconds to track engagement
  };

  // ─── State ───
  let exitIntentShown = false;
  let exitIntentEnabled = false;
  let scrollReminderShown = false;
  let timeOnPage = 0;

  // Scroll position as a % of the page. The page height is cached (reading
  // scrollHeight in a scroll handler forces a layout on every frame) and
  // refreshed at most twice a second, or on resize.
  let docHeight = -1, docHeightAt = 0;
  window.addEventListener('resize', () => { docHeight = -1; }, { passive: true });
  function scrollPercent() {
    const t = performance.now();
    if (docHeight < 0 || t - docHeightAt > 500) {
      docHeight = document.documentElement.scrollHeight - window.innerHeight;
      docHeightAt = t;
    }
    return docHeight > 0 ? Math.min(100, (window.scrollY / docHeight) * 100) : 0;
  }

  // ─── Initialize ───
  function init() {
    // Check if already shown this session
    if (sessionStorage.getItem('cro_exit_shown')) {
      exitIntentShown = true;
    }

    initScrollProgress();
    initFloatingCTA();
    initExitIntent();
    initScrollReminder();
    initConversionTracking();
    initEngagementTracking();

    console.log('%c[CRO] Conversion optimization loaded', 'color: #33ff00;');
  }

  // ─── Scroll Progress Bar ───
  function initScrollProgress() {
    const progressBar = document.getElementById('scroll-progress');
    if (!progressBar) return;

    // Read in the scroll event (layout is clean there, before the frame's
    // animations write), never from a frame callback.
    let shown = '';
    function updateProgress() {
      const v = 'scaleX(' + (scrollPercent() / 100).toFixed(4) + ')';
      if (v !== shown) { progressBar.style.transform = v; shown = v; }
    }

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // ─── Floating CTA ───
  function initFloatingCTA() {
    const floatingCta = document.getElementById('floating-cta');

    if (!floatingCta) return;

    // Track clicks
    floatingCta.addEventListener('click', (e) => {
      trackConversion('floating_cta_click');
    });
  }

  // ─── Exit Intent Detection ───
  function initExitIntent() {
    const modal = document.getElementById('exit-modal');
    if (!modal) return;

    const closeBtn = document.getElementById('exit-modal-close');
    const dismissBtn = document.getElementById('exit-modal-dismiss');
    const ctaBtn = document.getElementById('exit-modal-cta');

    // Enable after delay (don't annoy users immediately)
    setTimeout(() => {
      exitIntentEnabled = true;
    }, CRO_CONFIG.exitIntentDelay);

    // Desktop: Detect mouse leaving viewport top
    document.addEventListener('mouseout', (e) => {
      if (!exitIntentEnabled || exitIntentShown) return;

      // Only trigger when mouse leaves through top of viewport
      if (e.clientY < 10 && e.relatedTarget === null) {
        showExitModal();
      }
    });

    // Mobile: Detect back button or rapid scroll up
    let lastScrollTop = 0;
    let rapidScrollCount = 0;

    window.addEventListener('scroll', () => {
      if (!exitIntentEnabled || exitIntentShown) return;

      const scrollTop = window.scrollY;

      // Rapid scroll up detection (mobile exit intent)
      if (scrollTop < lastScrollTop - 100) {
        rapidScrollCount++;
        if (rapidScrollCount > 2 && scrollTop < 200) {
          showExitModal();
        }
      } else {
        rapidScrollCount = 0;
      }

      lastScrollTop = scrollTop;
    }, { passive: true });

    // Close handlers
    closeBtn?.addEventListener('click', hideExitModal);

    dismissBtn?.addEventListener('click', () => {
      hideExitModal();
      trackConversion('exit_modal_dismissed');
    });

    // CTA click
    ctaBtn?.addEventListener('click', () => {
      trackConversion('exit_modal_cta_click');
      hideExitModal();
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) hideExitModal();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('visible')) {
        hideExitModal();
      }
    });
  }

  function showExitModal() {
    const modal = document.getElementById('exit-modal');
    if (!modal || exitIntentShown) return;

    exitIntentShown = true;
    modal.classList.add('visible');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    trackConversion('exit_modal_shown');

    // Store in session so we don't show again
    sessionStorage.setItem('cro_exit_shown', 'true');
  }

  function hideExitModal() {
    const modal = document.getElementById('exit-modal');
    if (!modal) return;

    modal.classList.remove('visible');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // ─── Scroll Reminder (attention grabber at 60% scroll) ───
  function initScrollReminder() {
    window.addEventListener('scroll', () => {
      if (scrollReminderShown) return;

      if (scrollPercent() >= CRO_CONFIG.scrollTriggerPercent) {
        scrollReminderShown = true;

        // Pulse the floating CTA to grab attention
        const floatingCta = document.getElementById('floating-cta');
        if (floatingCta && !floatingCta.classList.contains('hidden')) {
          floatingCta.style.animation = 'cta-attention 0.5s ease 3';
          setTimeout(() => {
            floatingCta.style.animation = '';
          }, 1500);
        }

        trackConversion('scroll_60_percent');
      }
    }, { passive: true });
  }

  // ─── Conversion Tracking ───
  function initConversionTracking() {
    // Track hero CTA clicks
    const heroCta = document.getElementById('hero-cta');
    heroCta?.addEventListener('click', () => {
      trackConversion('hero_cta_click');
    });

    // Track email link clicks (main conversion!)
    const emailLink = document.getElementById('email-link');
    emailLink?.addEventListener('click', () => {
      trackConversion('email_click', {
        location: 'contact_section',
        is_primary_conversion: true
      });
    });

    // Track social link clicks
    const socialLinks = document.getElementById('social-links');
    socialLinks?.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        const platform = link.textContent?.trim().toLowerCase() || 'unknown';
        trackConversion('social_click', { platform });
      });
    });

    // Track project card clicks
    document.addEventListener('click', (e) => {
      const card = e.target.closest('.project-card');
      if (card) {
        const projectTitle = card.querySelector('h3')?.textContent?.replace('> ', '') || 'unknown';
        trackConversion('project_click', { project: projectTitle });
      }
    });

    // Track navigation clicks
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        const section = link.getAttribute('href')?.replace('#', '') || 'unknown';
        trackConversion('nav_click', { section });
      });
    });
  }

  // ─── Engagement Tracking ───
  function initEngagementTracking() {
    // Track time on page
    const engagementInterval = setInterval(() => {
      timeOnPage += 10;

      CRO_CONFIG.engagementThresholds.forEach(threshold => {
        if (timeOnPage === threshold) {
          trackConversion(`engaged_${threshold}s`);
        }
      });

      // Stop tracking after 5 minutes
      if (timeOnPage >= 300) {
        clearInterval(engagementInterval);
        trackConversion('highly_engaged');
      }
    }, 10000);

    // Track scroll depth milestones
    let maxScrollDepth = 0;
    const scrollMilestones = [25, 50, 75, 100];

    window.addEventListener('scroll', () => {
      const depth = Math.round(scrollPercent());

      scrollMilestones.forEach(milestone => {
        if (depth >= milestone && maxScrollDepth < milestone) {
          maxScrollDepth = milestone;
          trackConversion(`scroll_depth_${milestone}`);
        }
      });
    }, { passive: true });

    // Track page visibility (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        trackConversion('tab_hidden');
      } else {
        trackConversion('tab_visible');
      }
    });
  }

  // ─── Track Conversion Event ───
  function trackConversion(eventName, properties = {}) {
    const eventData = {
      ...properties,
      page_url: window.location.href,
      timestamp: new Date().toISOString(),
      time_on_page: timeOnPage,
      theme: document.body.getAttribute('data-theme') || 'unknown'
    };

    // PostHog tracking
    if (typeof posthog !== 'undefined') {
      posthog.capture(`cro_${eventName}`, eventData);
    }

    // Console log for debugging (in dev)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log(`%c[CRO] ${eventName}`, 'color: #ffb000;', eventData);
    }
  }

  // ─── Run on DOM Ready ───
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ─── Expose for debugging ───
  window.CRO = {
    showExitModal,
    hideExitModal,
    trackConversion,
    getTimeOnPage: () => timeOnPage
  };

})();
