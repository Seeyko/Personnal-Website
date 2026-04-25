/**
 * GitTimeline - Horizontal git-style career visualization
 *
 * Renders career history as a git graph with:
 * - Main trunk (horizontal timeline) at the bottom
 * - Branches for each job/project (up, horizontal, merge back down)
 * - Commits on branches
 * - CDK-style overlay popups for details
 */
const GitTimeline = (() => {
    // ═══════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════
    let data = null;
    let overlay = null;
    let activeCommit = null;
    let scrollContainer = null;

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    const CONFIG = {
        // Dimensions (yearWidth calculated dynamically to fit viewport)
        yearWidth: 130,          // Default, will be recalculated
        laneHeight: 50,          // Height per branch lane (compact)
        trunkPadding: 40,        // Padding below trunk for year axis
        padding: { left: 20, right: 0},  // Minimal padding for full-width

        // Node sizes
        commitRadius: 8,
        trunkNodeRadius: 10,

        // Branch curves
        curveRadius: 20,
        lineWidth: 3,

        // Colors by type
        colors: {
            work: '#33ff00',
            project: '#ff6b6b',
            education: '#4ecdc4',
            trunk: 'rgba(255, 255, 255, 0.3)'
        }
    };

    /**
     * Calculate yearWidth dynamically to fit timeline in viewport
     */
    function calculateYearWidth() {
        const viewport = document.querySelector('.git-timeline-viewport');
        if (!viewport || !data) return CONFIG.yearWidth;

        const availableWidth = viewport.clientWidth;
        const startYear = data.config?.startYear || 2017;
        // Use +2 to match renderSvg (current year + some future buffer)
        const endYear = data.config?.endYear || new Date().getFullYear() + 2;
        // +1 because we need intervals from startYear to endYear inclusive
        const yearCount = endYear - startYear + 1;

        // Calculate width per year to fit everything in viewport
        // Account for left and right padding only
        const totalPadding = CONFIG.padding.left + CONFIG.padding.right;
        const yearWidth = (availableWidth - totalPadding) / yearCount;

        // Minimum 140px per year — keeps each year readable.
        // When the timeline grows past the viewport, we let it overflow and
        // auto-scroll the user to the right (latest events) on init/render.
        return Math.max(yearWidth, 140);
    }

    // ═══════════════════════════════════════════════════════════════
    // DATA LOADING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Load git history data based on current language
     */
    async function loadData() {
        const lang = window.LanguageManager?.currentLang || 'en';
        try {
            const response = await fetch(`/data/${lang}/git-history.json`);
            if (!response.ok) throw new Error('Failed to load git history');
            data = await response.json();
            return data;
        } catch (err) {
            console.error('[GitTimeline] Failed to load data:', err);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DATE UTILITIES
    // ═══════════════════════════════════════════════════════════════

    /**
     * Parse date string (YYYY-MM or "ongoing") to year decimal
     */
    function parseDate(dateStr) {
        if (!dateStr || dateStr === 'ongoing') return null;
        const [year, month] = dateStr.split('-').map(Number);
        return year + (month - 1) / 12;
    }

    /**
     * Convert year decimal to X position
     */
    function yearToX(year) {
        const startYear = data?.config?.startYear || 2017;
        return CONFIG.padding.left + (year - startYear) * CONFIG.yearWidth;
    }

    /**
     * Check if branch is ongoing
     */
    function isOngoing(branch) {
        return branch.endDate === 'ongoing';
    }

    // ═══════════════════════════════════════════════════════════════
    // LANE ASSIGNMENT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Assign lanes to branches to prevent overlap
     * Reuses lanes when a branch ends before another begins
     * Returns branches with _lane property assigned
     */
    function assignLanes(branches) {
        // Sort by start date
        const sorted = [...branches].sort((a, b) => {
            return parseDate(a.startDate) - parseDate(b.startDate);
        });

        // Lane end times and usage count tracker
        const laneEnds = [];
        const laneUsageCount = []; // Track how many times each lane has been used
        const endYear = data?.config?.endYear || new Date().getFullYear() + 1;

        sorted.forEach(branch => {
            const start = parseDate(branch.startDate);
            const end = isOngoing(branch) ? endYear + 1 : parseDate(branch.endDate);

            // Find first available lane (reuse if previous branch ended)
            let lane = -1;
            for (let i = 0; i < laneEnds.length; i++) {
                if (laneEnds[i] < start) {
                    lane = i;
                    break;
                }
            }

            // Create new lane if needed
            if (lane === -1) {
                lane = laneEnds.length;
                laneEnds.push(0);
                laneUsageCount.push(0);
            }

            laneEnds[lane] = end;
            branch._lane = lane;
            branch._lanePosition = laneUsageCount[lane]; // 0, 1, 2... for alternating positions
            laneUsageCount[lane]++;
            branch._startX = yearToX(start);
            branch._endX = isOngoing(branch) ? null : yearToX(end);
        });

        return { branches: sorted, laneCount: laneEnds.length };
    }

    // ═══════════════════════════════════════════════════════════════
    // SVG RENDERING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create SVG element with attributes
     */
    function createSvgElement(tag, attrs = {}) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
        Object.entries(attrs).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });
        return el;
    }

    /**
     * Generate branch path with smooth S-curve bezier transitions
     * Uses cubic bezier (C command) for smoother curves than quadratic (Q)
     * Branches go UP from trunk, then merge back DOWN
     */
    function createBranchPath(branch, laneY, trunkY, totalWidth) {
        const startX = branch._startX;
        const r = CONFIG.curveRadius;
        const ongoing = isOngoing(branch);
        const endX = ongoing ? totalWidth - CONFIG.padding.right : branch._endX;

        // Calculate vertical distance for smooth S-curve (laneY is above trunkY)
        const verticalDist = trunkY - laneY;
        const curveControl = Math.min(r * 1.5, verticalDist * 0.4);

        let path = '';

        // Start: S-curve from trunk UP to lane
        path += `M ${startX} ${trunkY}`;
        // Cubic bezier: C x1 y1, x2 y2, x y
        // Control point 1: straight up from start
        // Control point 2: from end point, going down
        path += ` C ${startX} ${trunkY - curveControl}, ${startX + r} ${laneY + curveControl}, ${startX + r} ${laneY}`;

        // Horizontal line along lane
        if (ongoing) {
            // Ongoing: go to the end
            path += ` L ${endX} ${laneY}`;
        } else {
            // Completed: go to merge point
            path += ` L ${endX - r} ${laneY}`;

            // S-curve from lane back DOWN to trunk
            path += ` C ${endX - r} ${laneY + curveControl}, ${endX} ${trunkY - curveControl}, ${endX} ${trunkY}`;
        }

        return path;
    }

    /**
     * Render the complete SVG graph
     * Trunk is at the bottom, branches go UP
     */
    function renderSvg(container, branches, laneCount) {
        const startYear = data?.config?.startYear || 2017;
        const endYear = data?.config?.endYear || new Date().getFullYear() + 2;
        const totalWidth = CONFIG.padding.left + CONFIG.padding.right +
                          (endYear - startYear + 1) * CONFIG.yearWidth;

        // Calculate total height: lanes at top, trunk at bottom
        const lanesHeight = (laneCount + 1) * CONFIG.laneHeight;
        const totalHeight = lanesHeight + CONFIG.trunkPadding;

        // Trunk Y is at the bottom (after all lanes)
        const trunkY = lanesHeight;

        // Create SVG
        const svg = createSvgElement('svg', {
            class: 'git-timeline-svg',
            width: totalWidth,
            height: totalHeight,
            viewBox: `0 0 ${totalWidth} ${totalHeight}`
        });

        // Defs for glow filter
        const defs = createSvgElement('defs');
        defs.innerHTML = `
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        `;
        svg.appendChild(defs);

        // Main trunk line (at the bottom)
        const trunk = createSvgElement('line', {
            class: 'git-trunk',
            x1: CONFIG.padding.left - 30,
            y1: trunkY,
            x2: totalWidth - CONFIG.padding.right + 30,
            y2: trunkY,
            stroke: CONFIG.colors.trunk,
            'stroke-width': CONFIG.lineWidth,
            'stroke-linecap': 'round'
        });
        svg.appendChild(trunk);

        // Draw branches (reverse order for z-index)
        // laneY goes UP from trunk (smaller Y values)
        [...branches].reverse().forEach(branch => {
            const laneY = trunkY - (branch._lane + 1) * CONFIG.laneHeight;
            const color = CONFIG.colors[branch.type] || CONFIG.colors.work;
            const ongoing = isOngoing(branch);

            // Branch path (now passes trunkY)
            const pathD = createBranchPath(branch, laneY, trunkY, totalWidth);
            const path = createSvgElement('path', {
                class: `git-branch git-branch-${branch.type}`,
                d: pathD,
                stroke: color,
                'stroke-width': CONFIG.lineWidth,
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                fill: 'none'
            });
            svg.appendChild(path);

            // Start node on trunk
            const startNode = createSvgElement('circle', {
                class: `git-node git-node-${branch.type}`,
                cx: branch._startX,
                cy: trunkY,
                r: CONFIG.trunkNodeRadius,
                fill: color,
                filter: 'url(#glow)'
            });
            svg.appendChild(startNode);

            // End node: on trunk if merged, on lane if ongoing
            if (ongoing) {
                const endX = totalWidth - CONFIG.padding.right;
                const endNode = createSvgElement('circle', {
                    class: `git-node git-node-ongoing git-node-${branch.type}`,
                    cx: endX,
                    cy: laneY,
                    r: CONFIG.commitRadius,
                    fill: color
                });
                svg.appendChild(endNode);
            } else {
                const endNode = createSvgElement('circle', {
                    class: `git-node git-node-${branch.type}`,
                    cx: branch._endX,
                    cy: trunkY,
                    r: CONFIG.trunkNodeRadius,
                    fill: color,
                    filter: 'url(#glow)'
                });
                svg.appendChild(endNode);
            }
        });

        container.appendChild(svg);
        // Store trunkY for use by commit cards
        container.dataset.trunkY = trunkY;
        return { totalWidth, totalHeight, trunkY };
    }

    // ═══════════════════════════════════════════════════════════════
    // COMMIT MARKERS (HTML)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Render compact commit markers for each branch
     * Shows only hash + title pill to prevent overlap
     * Full details appear in overlay on hover (in fixed corner position)
     * Branches are now ABOVE the trunk
     */
    function renderCommitCards(container, branches, totalWidth, trunkY) {
        branches.forEach(branch => {
            // laneY is above the trunk (smaller Y value)
            const laneY = trunkY - (branch._lane + 1) * CONFIG.laneHeight;
            const color = CONFIG.colors[branch.type] || CONFIG.colors.work;
            const ongoing = isOngoing(branch);

            branch.commits.forEach((commit, idx) => {
                // Position commits along the branch:
                // - idx 0 sits near the branch start
                // - subsequent commits use their own date if available,
                //   otherwise fall back to a fixed horizontal stride (220px)
                let commitX;
                if (idx === 0) {
                    commitX = branch._startX + CONFIG.curveRadius + 10;
                } else {
                    const commitDate = parseDate(commit.date);
                    if (commitDate != null) {
                        commitX = yearToX(commitDate);
                    } else {
                        commitX = branch._startX + CONFIG.curveRadius + 10 + (idx * 220);
                    }
                }

                // All markers sit just above the branch line for visual
                // consistency. The compact label (markerLabel) keeps things
                // single-line so multiple commits on the same branch (e.g. CBA)
                // can sit on the same horizontal axis without colliding.
                const verticalStagger = -14;

                const marker = document.createElement('div');
                marker.className = `git-commit-marker git-commit-${branch.type} ${ongoing ? 'ongoing' : ''}`;
                marker.dataset.branchId = branch.id;
                //Do not show hash for the first one
                //marker.dataset.commitHash = commit.hash;
                marker.style.left = `${commitX}px`;
                marker.style.top = `${laneY + verticalStagger}px`;
                marker.style.setProperty('--branch-color', color);

                // Format date range
                const startYear = branch.startDate.split('-')[0];
                const endYear = ongoing ? 'Present' : branch.endDate.split('-')[0];
                const dateRange = `${startYear} - ${endYear}`;

                // Compact marker label:
                // - Projects: just the project name (branch.name) — e.g. "Skoolbook"
                // - Work/education: details.markerLabel if present, else details.title
                // The full title always shows in the hover overlay for context.
                let displayTitle;
                if (branch.type === 'project') {
                    displayTitle = branch.name;
                } else {
                    displayTitle = commit.details.markerLabel || commit.details.title;
                }

                marker.innerHTML = `
                    <!-- Do not show for first one <span class="marker-hash">${commit.hash.substring(0, 7)}</span>-->
                    <span class="marker-title">${displayTitle}</span>
                    ${ongoing ? '<span class="marker-badge">●</span>' : ''}
                `;

                // Store data for overlay
                marker.dataset.title = commit.details.title;
                marker.dataset.company = commit.details.company;
                marker.dataset.location = commit.details.location;
                marker.dataset.description = commit.details.description;
                marker.dataset.tags = JSON.stringify(commit.details.tags);
                marker.dataset.dateRange = dateRange;
                //Do not show hash for the first one
                //marker.dataset.hash = commit.hash;

                container.appendChild(marker);
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // YEAR AXIS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Render year markers (now at the bottom, ticks point up)
     */
    function renderYearAxis(container, totalWidth) {
        const startYear = data?.config?.startYear || 2017;
        const endYear = data?.config?.endYear || new Date().getFullYear() + 1;
        const currentYear = new Date().getFullYear();

        const axis = document.createElement('div');
        axis.className = 'git-timeline-axis';
        axis.style.width = `${totalWidth}px`;

        for (let year = startYear; year <= endYear; year++) {
            const x = yearToX(year);
            const isCurrent = year === currentYear;
            const isFuture = year > currentYear;

            const marker = document.createElement('div');
            marker.className = `git-year-marker ${isCurrent ? 'current' : ''} ${isFuture ? 'future' : ''}`;
            marker.style.left = `${x}px`;
            // Tick now comes BEFORE label (tick points up to trunk)
            marker.innerHTML = `
                <div class="git-year-tick"></div>
                <span class="git-year-label">${year}</span>
            `;
            axis.appendChild(marker);
        }

        // NOW marker (positioned above the axis)
        const nowX = yearToX(currentYear) + (CONFIG.yearWidth * (new Date().getMonth() / 12));
        const nowMarker = document.createElement('div');
        nowMarker.className = 'git-now-marker';
        nowMarker.style.left = `${nowX}px`;
        nowMarker.innerHTML = '<span>NOW</span>';
        axis.appendChild(nowMarker);

        container.appendChild(axis);
    }

    // ═══════════════════════════════════════════════════════════════
    // CDK-STYLE OVERLAY
    // ═══════════════════════════════════════════════════════════════

    /**
     * Create overlay element (appended to timeline section for proper positioning)
     */
    function createOverlay() {
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.className = 'git-timeline-overlay';
        overlay.innerHTML = `
            <div class="overlay-content">
                <div class="overlay-header">
                    <span class="overlay-hash"></span>
                    <span class="overlay-date"></span>
                </div>
                <h4 class="overlay-title"></h4>
                <div class="overlay-meta">
                    <span class="overlay-company"></span>
                    <span class="overlay-location"></span>
                </div>
                <p class="overlay-description"></p>
                <div class="overlay-tags"></div>
            </div>
        `;
        // Append to timeline section for relative positioning below header
        const section = document.getElementById('timeline');
        if (section) {
            section.appendChild(overlay);
        } else {
            document.body.appendChild(overlay);
        }
    }

    /**
     * Show overlay for a commit marker
     * Positions in a fixed corner (top-right of viewport) to not obstruct navigation
     */
    function showOverlay(card) {
        if (!overlay) createOverlay();

        // Populate content
        overlay.querySelector('.overlay-hash').textContent = card.dataset.hash;
        overlay.querySelector('.overlay-date').textContent = card.dataset.dateRange;
        overlay.querySelector('.overlay-title').textContent = card.dataset.title;
        overlay.querySelector('.overlay-company').textContent = card.dataset.company;
        overlay.querySelector('.overlay-location').textContent = card.dataset.location;
        overlay.querySelector('.overlay-description').textContent = card.dataset.description;

        const tags = JSON.parse(card.dataset.tags || '[]');
        overlay.querySelector('.overlay-tags').innerHTML =
            tags.map(t => `<span class="overlay-tag">${t}</span>`).join('');

        // Get branch type for styling
        const branchType = card.className.match(/git-commit-(\w+)/)?.[1] || 'work';

        // Fixed position: top-right corner of viewport
        overlay.className = `git-timeline-overlay active git-overlay-${branchType} fixed-corner`;

        activeCommit = card;
    }

    /**
     * Hide overlay
     */
    function hideOverlay() {
        if (overlay) {
            overlay.classList.remove('active');
        }
        activeCommit = null;
    }

    // ═══════════════════════════════════════════════════════════════
    // EVENT HANDLING
    // ═══════════════════════════════════════════════════════════════

    /**
     * Set up all event listeners
     */
    function setupEvents() {
        // Commit marker hover/click
        document.querySelectorAll('.git-commit-marker').forEach(marker => {
            marker.addEventListener('mouseenter', () => showOverlay(marker));
            marker.addEventListener('mouseleave', (e) => {
                if (!overlay?.contains(e.relatedTarget)) {
                    hideOverlay();
                }
            });
            marker.addEventListener('click', (e) => {
                e.stopPropagation();
                if (activeCommit === marker && overlay?.classList.contains('active')) {
                    hideOverlay();
                } else {
                    showOverlay(marker);
                }
            });
        });

        // Overlay hover
        if (overlay) {
            overlay.addEventListener('mouseleave', hideOverlay);
        }

        // Click outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.git-commit-marker') && !e.target.closest('.git-timeline-overlay')) {
                hideOverlay();
            }
        });

        // Update overlay position on scroll
        scrollContainer?.addEventListener('scroll', () => {
            if (activeCommit && overlay?.classList.contains('active')) {
                showOverlay(activeCommit);
            }
        });

        // Scroll-jacking for horizontal scroll
        setupScrollJacking();
    }

    /**
     * Horizontal scroll-jacking when timeline is in view
     * Only active if content exceeds viewport width
     */
    function setupScrollJacking() {
        const section = document.getElementById('timeline');
        const viewport = document.querySelector('.git-timeline-viewport');

        if (!section || !scrollContainer || !viewport) return;

        window.addEventListener('wheel', (e) => {
            const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;

            // Skip scroll-jacking if content fits in viewport (no horizontal scroll needed)
            if (maxScroll <= 1) return;

            const rect = viewport.getBoundingClientRect();
            const vh = window.innerHeight;

            // Active when viewport is in view
            const inView = rect.top <= vh * 0.3 && rect.bottom > vh * 0.2;

            if (!inView) {
                section.classList.remove('scroll-locked');
                return;
            }

            const currentScroll = scrollContainer.scrollLeft;
            const scrollingRight = e.deltaY > 0;
            const scrollingLeft = e.deltaY < 0;
            const atStart = currentScroll <= 0;
            const atEnd = currentScroll >= maxScroll - 1;

            if ((atStart && scrollingLeft) || (atEnd && scrollingRight)) {
                section.classList.remove('scroll-locked');
                return;
            }

            e.preventDefault();
            section.classList.add('scroll-locked');
            scrollContainer.scrollLeft += e.deltaY * 1.5;
        }, { passive: false });

        // Re-render on resize to recalculate yearWidth
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (data) render();
            }, 250);
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // MOBILE TIMELINE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Render mobile vertical timeline
     */
    function renderMobileTimeline() {
        // Create or get mobile container
        let mobileContainer = document.querySelector('.git-timeline-mobile');
        if (!mobileContainer) {
            mobileContainer = document.createElement('div');
            mobileContainer.className = 'git-timeline-mobile';
            const section = document.getElementById('timeline');
            const viewport = section?.querySelector('.git-timeline-viewport');
            if (viewport) {
                viewport.after(mobileContainer);
            }
        }

        // Sort branches by start date (most recent first for mobile)
        const sortedBranches = [...data.branches].sort((a, b) => {
            return parseDate(b.startDate) - parseDate(a.startDate);
        });

        const timeline = document.createElement('div');
        timeline.className = 'mobile-timeline';

        sortedBranches.forEach(branch => {
            const ongoing = isOngoing(branch);
            const color = CONFIG.colors[branch.type] || CONFIG.colors.work;

            branch.commits.forEach(commit => {
                const startYear = branch.startDate.split('-')[0];
                const endYear = ongoing ? 'Present' : branch.endDate.split('-')[0];
                const dateRange = `${startYear} - ${endYear}`;

                // Format title based on type (mirror desktop logic)
                let displayTitle;
                if (branch.type === 'project') {
                    displayTitle = branch.name;
                } else {
                    displayTitle = commit.details.markerLabel || commit.details.title;
                }

                const commitEl = document.createElement('div');
                commitEl.className = `mobile-commit mobile-commit-${branch.type}`;
                commitEl.style.setProperty('--branch-color', color);

                commitEl.innerHTML = `
                    <div class="mobile-commit-card">
                        <div class="mobile-commit-header">
                            <span class="mobile-commit-title">${displayTitle}</span>
                            <span class="mobile-commit-date">${dateRange}</span>
                            ${ongoing ? '<span class="mobile-commit-badge"></span>' : ''}
                            <span class="mobile-commit-chevron">›</span>
                        </div>
                        <div class="mobile-commit-details">
                            <div class="mobile-commit-company">${commit.details.company}</div>
                            <div class="mobile-commit-location">${commit.details.location}</div>
                            <p class="mobile-commit-description">${commit.details.description}</p>
                            <div class="mobile-commit-tags">
                                ${commit.details.tags.map(tag => `<span class="mobile-commit-tag">${tag}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                `;

                // Click to expand
                const card = commitEl.querySelector('.mobile-commit-card');
                card.addEventListener('click', () => {
                    // Close other expanded cards
                    document.querySelectorAll('.mobile-commit.expanded').forEach(el => {
                        if (el !== commitEl) el.classList.remove('expanded');
                    });
                    // Toggle this card
                    commitEl.classList.toggle('expanded');
                });

                timeline.appendChild(commitEl);
            });
        });

        mobileContainer.innerHTML = '';
        mobileContainer.appendChild(timeline);
    }

    // ═══════════════════════════════════════════════════════════════
    // MAIN RENDER
    // ═══════════════════════════════════════════════════════════════

    /**
     * Render the complete timeline
     */
    function render() {
        const lanesContainer = document.getElementById('git-timeline-lanes');
        const axisContainer = document.getElementById('git-timeline-axis');
        scrollContainer = document.querySelector('.git-timeline-scroll');

        if (!lanesContainer || !axisContainer || !data) {
            console.error('[GitTimeline] Missing containers or data');
            return;
        }

        // Calculate yearWidth to fit viewport (no horizontal scroll)
        CONFIG.yearWidth = calculateYearWidth();

        // Clear containers
        lanesContainer.innerHTML = '';
        axisContainer.innerHTML = '';

        // Process branches
        const { branches, laneCount } = assignLanes(data.branches);

        // Render SVG graph first to get dimensions and trunkY
        const { totalWidth, totalHeight, trunkY } = renderSvg(lanesContainer, branches, laneCount);

        // Set container size. Width must be explicit so absolute markers
        // beyond the viewport contribute to scrollWidth (auto-scroll right).
        lanesContainer.style.height = `${totalHeight}px`;
        lanesContainer.style.width = `${totalWidth}px`;

        // Render commit cards (with trunkY for positioning)
        renderCommitCards(lanesContainer, branches, totalWidth, trunkY);

        // Render year axis (now at the bottom)
        renderYearAxis(axisContainer, totalWidth);

        // Render mobile timeline
        renderMobileTimeline();

        // Update subtitle
        const subtitle = document.querySelector('.git-timeline-subtitle');
        if (subtitle && data.config?.subtitle) {
            subtitle.textContent = data.config.subtitle;
        }

        // Create overlay and setup events (desktop only)
        createOverlay();
        setupEvents();

        // Auto-scroll horizontally to the right so the latest events are
        // visible by default. Older events stay accessible by scrolling left.
        // Wait one frame for layout to settle before reading scrollWidth.
        requestAnimationFrame(() => {
            if (scrollContainer) {
                scrollContainer.scrollLeft = scrollContainer.scrollWidth;
            }
        });

        console.log('%c[GitTimeline] Rendered', 'color: #33ff00');
    }

    // ═══════════════════════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════════════════════

    /**
     * Initialize the timeline
     */
    async function init() {
        console.log('%c[GitTimeline] Initializing...', 'color: #ffb000');

        const loaded = await loadData();
        if (!loaded) {
            console.error('[GitTimeline] No data loaded');
            return;
        }

        render();
        console.log('%c[GitTimeline] Ready', 'color: #33ff00');
    }

    /**
     * Refresh (reload data and re-render)
     */
    async function refresh() {
        await loadData();
        render();
    }

    return { init, refresh, render };
})();

// Export to window
window.GitTimeline = GitTimeline;
