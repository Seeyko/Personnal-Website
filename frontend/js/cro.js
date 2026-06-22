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
  let lastScrollTop = 0;
  let rapidScrollCount = 0;
  let maxScrollDepth = 0;
  let docHeight = 0; // cached: scrollHeight - innerHeight (recomputed on resize/load)

  // ─── Initialize ───
  function init() {
    // Check if already shown this session
    if (sessionStorage.getItem('cro_exit_shown')) {
      exitIntentShown = true;
    }

    initScrollController();
    initFloatingCTA();
    initExitIntent();
    initConversionTracking();
    initEngagementTracking();

    console.log('%c[CRO] Conversion optimization loaded', 'color: #33ff00;');
  }

  // ─── Unified Scroll Controller ───
  // ONE passive scroll listener, rAF-throttled, that reads scrollY once and
  // caches docHeight (recomputed on resize/load, NOT per scroll) so there is no
  // forced synchronous reflow. Fans out to: progress bar, 60%-reminder, mobile
  // exit-intent, and scroll-depth milestones.
  function initScrollController() {
    const progressBar = document.getElementById('scroll-progress');
    const scrollMilestones = [25, 50, 75, 100];
    let ticking = false;

    const recompute = () => { docHeight = document.documentElement.scrollHeight - window.innerHeight; };
    recompute();
    window.addEventListener('resize', recompute, { passive: true });
    window.addEventListener('load', () => { recompute(); setTimeout(recompute, 1000); });

    function onFrame() {
      ticking = false;
      const scrollTop = window.scrollY;               // single read
      const dh = docHeight > 0 ? docHeight : (document.documentElement.scrollHeight - window.innerHeight);
      const pct = dh > 0 ? (scrollTop / dh) * 100 : 0;

      // Progress bar — write after all reads (no read-after-write thrash).
      if (progressBar) progressBar.style.width = pct + '%';

      // Attention pulse at 60%.
      if (!scrollReminderShown && pct >= CRO_CONFIG.scrollTriggerPercent) {
        scrollReminderShown = true;
        const fc = document.getElementById('floating-cta');
        if (fc && !fc.classList.contains('hidden')) {
          fc.style.animation = 'cta-attention 0.5s ease 3';
          setTimeout(() => { fc.style.animation = ''; }, 1500);
        }
        trackConversion('scroll_60_percent');
      }

      // Mobile exit-intent: rapid scroll up near the top.
      if (exitIntentEnabled && !exitIntentShown) {
        if (scrollTop < lastScrollTop - 100) {
          rapidScrollCount++;
          if (rapidScrollCount > 2 && scrollTop < 200) showExitModal();
        } else {
          rapidScrollCount = 0;
        }
      }
      lastScrollTop = scrollTop;

      // Scroll-depth milestones.
      const pctRound = Math.round(pct);
      for (const m of scrollMilestones) {
        if (pctRound >= m && maxScrollDepth < m) { maxScrollDepth = m; trackConversion(`scroll_depth_${m}`); }
      }
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(onFrame); }
    }, { passive: true });

    onFrame();
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

    // (Mobile rapid-scroll-up exit-intent is handled by the unified scroll
    //  controller above — no separate scroll listener here.)

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

    // (Scroll-depth milestones are tracked by the unified scroll controller.)

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
