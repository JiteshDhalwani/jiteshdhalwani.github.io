/**
 * Harmonic Topological Manifold Engine
 * ------------------------------------
 * High-DPI interactive wave & mathematical topology canvas.
 * - Continuous sinusoidal harmonic wave ribbons with Gaussian cursor warping
 * - Subtle technical grid & corner crosshair registration
 * - Energy-efficient IntersectionObserver animation loop
 *
 * Note: this site is dark-only (html.dark, no theme toggle), so colors below
 * are dark-theme constants. If a light theme is added later, reintroduce a
 * cached theme object + MutationObserver instead of per-frame classList reads.
 */

// ---------------------------------------------------------------------------
// 1. Harmonic Topological Manifold Engine (canvas setup + input)
// ---------------------------------------------------------------------------
const canvas = document.getElementById('anthropicCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let width = 0;
let height = 0;
let dpr = 1;
let isCanvasVisible = true;
let animationFrameId = null;

// Dark-only palette (matches Tailwind config: ink/surface/line/cream/terra)
const THEME = {
    grid: 'rgba(250, 249, 245, 0.035)',
    cross: 'rgba(250, 249, 245, 0.12)',
    highlight: '#E28E75',
    tertiary: 'rgba(226, 142, 117, 0.45)',
    strut: 'rgba(250, 249, 245, 0.14)',
    dot: 'rgba(250, 249, 245, 0.65)',
    halo: 'rgba(226, 142, 117, 0.35)',
    hud: 'rgba(226, 142, 117, 0.4)',
    hudText: '#FAF9F5',
};

// Mouse & Touch Tracking with Smooth Damping
const mouse = {
    x: null,
    y: null,
    targetX: null,
    targetY: null,
    radius: 120,
    active: false
};

function getCanvasCoords(clientX, clientY) {
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

if (canvas) {
    canvas.addEventListener('mouseenter', (e) => {
        mouse.active = true;
        const coords = getCanvasCoords(e.clientX, e.clientY);
        mouse.targetX = coords.x;
        mouse.targetY = coords.y;
        mouse.x = coords.x;
        mouse.y = coords.y;
    });

    canvas.addEventListener('mousemove', (e) => {
        mouse.active = true;
        const coords = getCanvasCoords(e.clientX, e.clientY);
        mouse.targetX = coords.x;
        mouse.targetY = coords.y;
    });

    canvas.addEventListener('mouseleave', () => {
        mouse.active = false;
        mouse.targetX = null;
        mouse.targetY = null;
    });

    // Touch support for mobile devices (passive so vertical page scroll still works)
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length > 0) {
            mouse.active = true;
            const coords = getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
            mouse.targetX = coords.x;
            mouse.targetY = coords.y;
            mouse.x = coords.x;
            mouse.y = coords.y;
        }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            mouse.active = true;
            const coords = getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
            mouse.targetX = coords.x;
            mouse.targetY = coords.y;
        }
    }, { passive: true });

    const cancelTouch = () => {
        mouse.active = false;
        mouse.targetX = null;
        mouse.targetY = null;
    };
    canvas.addEventListener('touchend', cancelTouch, { passive: true });
    canvas.addEventListener('touchcancel', cancelTouch, { passive: true });
}

/**
 * Wave configuration
 */
const numWaves = 11; // 11 horizontal contour lines

/**
 * Resize canvas with Retina (High-DPI) crisp resolution and mobile battery optimization
 */
function resizeCanvas() {
    if (!canvas || !ctx) return;
    // Cap DPR to 2 to prevent excessive GPU load on 3x mobile devices while maintaining sharp rendering
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    // Guard: canvas may report 0 if hidden or pre-layout
    if (rect.width < 1 || rect.height < 1) return;
    width = rect.width;
    height = rect.height;

    // Dynamically scale touch/pointer ripple radius based on screen width
    mouse.radius = Math.min(width * 0.32, 120);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset scale
    ctx.scale(dpr, dpr);
}

/**
 * Draw subtle technical background grid & corner registration marks.
 * Batched into as few strokes as possible (one path for grid, one per corner set).
 */
function drawTechnicalGrid() {
    const gridSize = 28;

    ctx.strokeStyle = THEME.grid;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    // Vertical lines in one path
    for (let x = gridSize; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    // Horizontal lines in same path
    for (let y = gridSize; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Subtle corner crosshairs (+) batched into one path
    const markSize = 4;
    ctx.strokeStyle = THEME.cross;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const corners = [
        [gridSize, gridSize],
        [width - gridSize, gridSize],
        [gridSize, height - gridSize],
        [width - gridSize, height - gridSize]
    ];
    for (const [cx, cy] of corners) {
        ctx.moveTo(cx - markSize, cy);
        ctx.lineTo(cx + markSize, cy);
        ctx.moveTo(cx, cy - markSize);
        ctx.lineTo(cx, cy + markSize);
    }
    ctx.stroke();
}

function startLoop() {
    if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(render);
    }
}

function stopLoop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
}

/**
 * Main animation loop
 */
function render(timestamp) {
    // If hidden, clear the frame id so a later IntersectionObserver callback can restart.
    // (Previous bug: early return left a stale truthy id, so the loop never restarted.)
    if (!isCanvasVisible || !ctx) {
        animationFrameId = null;
        return;
    }
    // Zero-size guard (pre-layout): retry next frame after a resize attempt
    if (width < 1 || height < 1) {
        resizeCanvas();
        animationFrameId = requestAnimationFrame(render);
        return;
    }

    ctx.clearRect(0, 0, width, height);

    const safeTimestamp = Number.isFinite(timestamp) ? timestamp : performance.now();
    const time = safeTimestamp * 0.001;

    // Smooth mouse interpolation (fluid damping)
    if (mouse.active && mouse.targetX !== null && mouse.targetY !== null) {
        if (mouse.x === null) mouse.x = mouse.targetX;
        if (mouse.y === null) mouse.y = mouse.targetY;
        mouse.x += (mouse.targetX - mouse.x) * 0.12;
        mouse.y += (mouse.targetY - mouse.y) * 0.12;
    } else {
        mouse.x = null;
        mouse.y = null;
    }

    // 1. Draw technical background grid
    drawTechnicalGrid();

    // 2. Compute and render the harmonic contour ribbons
    const highlightNodes = [];
    const regularNodes = [];
    // Adaptive step resolution: 6px on small mobile viewports for battery preservation, 4px on desktop
    const currentStepX = width < 500 ? 6 : 4;
    // Index-based sampling so marker spacing is stable regardless of step size
    // (~110px for highlights, ~160px for regular markers)
    const highlightEvery = Math.max(1, Math.round(110 / currentStepX));
    const regularEvery = Math.max(1, Math.round(160 / currentStepX));

    for (let i = 0; i < numWaves; i++) {
        // Base vertical distribution with breathing margins
        const progress = i / (numWaves - 1);
        const baseY = height * (0.16 + 0.68 * progress);

        // Highlight specific ridges in Terracotta
        const isHighlight = (i === 3 || i === 7);
        const isTertiary = (i === 5);

        ctx.beginPath();
        let firstPoint = true;
        let pointIndex = 0;

        for (let x = 0; x <= width + currentStepX; x += currentStepX, pointIndex++) {
            // Compound harmonic sinusoidal oscillations
            const freq1 = 0.008 + i * 0.0006;
            const freq2 = 0.019 + i * 0.0008;
            const speed1 = 0.9 + i * 0.08;
            const speed2 = 1.3 - i * 0.06;

            const wave1 = Math.sin(x * freq1 + time * speed1 + i * 0.42) * (14 + i * 1.5);
            const wave2 = Math.cos(x * freq2 - time * speed2 + i * 0.28) * (8 + (numWaves - i) * 0.8);
            const harmonic = Math.sin((x * 0.004) + time * 0.5) * 6;

            const yBase = baseY + wave1 + wave2 + harmonic;
            let y = yBase;

            // Interactive Gaussian Topological Distortion Field (radial around cursor)
            if (mouse.x !== null && mouse.y !== null) {
                const dx = x - mouse.x;
                const dy = yBase - mouse.y;
                const distSq = dx * dx + dy * dy;
                const radiusSq = mouse.radius * mouse.radius;

                if (distSq < radiusSq * 2.5) {
                    // Gaussian bell curve falloff
                    const influence = Math.exp(-distSq / (2 * radiusSq));
                    // Directional topological warp
                    const warp = -influence * 48 * Math.cos(influence * Math.PI * 0.8);
                    y += warp;
                }
            }

            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }

            // Stable index-based marker sampling (not Math.floor(x) % N, which
            // misses when step size doesn't divide N — e.g. step 4 never hits 110)
            if (x > 40 && x < width - 40) {
                if (isHighlight) {
                    if (pointIndex % highlightEvery === 0) highlightNodes.push({ x, y });
                } else if (x > 60 && x < width - 60) {
                    if (pointIndex % regularEvery === 0) regularNodes.push({ x, y });
                }
            }
        }

        // Stroke styling
        if (isHighlight) {
            ctx.strokeStyle = THEME.highlight;
            ctx.lineWidth = 1.65;
        } else if (isTertiary) {
            ctx.strokeStyle = THEME.tertiary;
            ctx.lineWidth = 1.1;
        } else {
            // Hairlines with progressive atmospheric depth
            const alpha = 0.16 + (i / numWaves) * 0.35;
            ctx.strokeStyle = `rgba(250, 249, 245, ${alpha})`;
            ctx.lineWidth = 0.85;
        }

        ctx.stroke();
    }

    // 3. Draw vertical projection drop-lines & resonant nodes (batched by style)
    const allNodes = [
        ...highlightNodes.map((n) => ({ ...n, isHighlight: true })),
        ...regularNodes.map((n) => ({ ...n, isHighlight: false })),
    ];
    if (allNodes.length > 0) {
        // All dashed struts in one path
        ctx.beginPath();
        for (const node of allNodes) {
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(node.x, node.y + (node.isHighlight ? 24 : 14));
        }
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = THEME.strut;
        ctx.lineWidth = 0.75;
        ctx.stroke();
        ctx.setLineDash([]); // reset line dash

        // Regular dots in one path
        ctx.beginPath();
        for (const node of allNodes) {
            if (!node.isHighlight) {
                ctx.moveTo(node.x + 1.8, node.y);
                ctx.arc(node.x, node.y, 1.8, 0, Math.PI * 2);
            }
        }
        ctx.fillStyle = THEME.dot;
        ctx.fill();

        // Highlight dots + halos
        for (const node of allNodes) {
            if (!node.isHighlight) continue;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 2.8, 0, Math.PI * 2);
            ctx.fillStyle = THEME.highlight;
            ctx.fill();
            // Outer subtle halo ring
            ctx.beginPath();
            ctx.arc(node.x, node.y, 5.5, 0, Math.PI * 2);
            ctx.strokeStyle = THEME.halo;
            ctx.lineWidth = 0.75;
            ctx.stroke();
        }
    }

    // 4. Subtle Crosshair & Scientific Coordinate HUD when hovering
    if (mouse.x !== null && mouse.y !== null && mouse.active && width > 0 && height > 0) {
        ctx.save();
        ctx.strokeStyle = THEME.hud;
        ctx.lineWidth = 0.75;
        ctx.setLineDash([3, 4]);

        // Crosshair horizontal & vertical lines
        ctx.beginPath();
        ctx.moveTo(mouse.x - 30, mouse.y);
        ctx.lineTo(mouse.x + 30, mouse.y);
        ctx.moveTo(mouse.x, mouse.y - 30);
        ctx.lineTo(mouse.x, mouse.y + 30);
        ctx.stroke();

        // Subtle coordinate badge (clamped so it doesn't run off the right edge)
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = THEME.hudText;
        const normX = (mouse.x / width).toFixed(2);
        const normY = (mouse.y / height).toFixed(2);
        const label = `∇ (${normX}, ${normY})`;
        const labelX = Math.min(mouse.x + 8, width - 72);
        ctx.fillText(label, Math.max(4, labelX), Math.max(12, mouse.y - 8));

        ctx.restore();
    }

    animationFrameId = requestAnimationFrame(render);
}

// ---------------------------------------------------------------------------
// 2. Lifecycle & Performance Optimizations
// ---------------------------------------------------------------------------
if (canvas && ctx) {
    // Synchronous initial sizing so the first frame never renders at 0x0
    resizeCanvas();

    // Seamless dynamic fluid responsiveness
    const resizeObserver = new ResizeObserver(() => {
        resizeCanvas();
    });
    resizeObserver.observe(canvas);

    // Re-size on viewport/DPR changes (orientation change, zoom, monitor move)
    let resizeQueued = false;
    window.addEventListener('resize', () => {
        if (resizeQueued) return;
        resizeQueued = true;
        requestAnimationFrame(() => {
            resizeQueued = false;
            resizeCanvas();
        });
    }, { passive: true });

    // Pause animation when scrolled off-screen to preserve battery & CPU
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                isCanvasVisible = entry.isIntersecting;
                if (isCanvasVisible) {
                    startLoop();
                } else {
                    stopLoop();
                }
            }
        }, { threshold: 0.05 });

        observer.observe(canvas);
    }

    startLoop();
}

// ---------------------------------------------------------------------------
// 3. Active Nav State Controller (white = active, gray = inactive)
// ---------------------------------------------------------------------------
// Previous bug analysis:
// - Old code used `rect.top <= 260` on every scroll. 260px is desktop-centric:
//   on small viewports the Projects top crosses 260 while Overview still fills
//   most of the screen, so it switched too early and flickered.
// - Click handler set state instantly, then the next scroll event flipped it
//   back mid-smooth-scroll (flicker / wrong final state).
// - Toggling Tailwind arbitrary classes (text-[#...]) from JS depends on the
//   Play CDN JIT observing mutations; plain .nav-active/.nav-inactive CSS is
//   deterministic on desktop + mobile.
// Fix: IntersectionObserver over both sections with a middle viewport band.
// Whoever owns the band is active. During transitions neither may intersect —
// keep the last state instead of flickering. Click still gives instant
// feedback; the observer is the source of truth right after.
const navOverview = document.getElementById('nav-overview');
const navProjects = document.getElementById('nav-projects');
const sectionOverview = document.getElementById('overview');
const sectionProjects = document.getElementById('projects');

let currentSection = 'overview';

function setActiveNav(state) {
    if (state !== 'overview' && state !== 'projects') return;
    if (state === currentSection) {
        // Still sync ARIA on first run even if state matches default
        syncNavAria(state);
        return;
    }
    currentSection = state;
    const isProjects = state === 'projects';

    navProjects?.classList.toggle('nav-active', isProjects);
    navProjects?.classList.toggle('nav-inactive', !isProjects);
    navOverview?.classList.toggle('nav-active', !isProjects);
    navOverview?.classList.toggle('nav-inactive', isProjects);
    syncNavAria(state);
}

function syncNavAria(state) {
    const isProjects = state === 'projects';
    if (isProjects) {
        navProjects?.setAttribute('aria-current', 'page');
        navOverview?.removeAttribute('aria-current');
    } else {
        navOverview?.setAttribute('aria-current', 'page');
        navProjects?.removeAttribute('aria-current');
    }
    // Ensure classes match ARIA even on first run
    navProjects?.classList.toggle('nav-active', isProjects);
    navProjects?.classList.toggle('nav-inactive', !isProjects);
    navOverview?.classList.toggle('nav-active', !isProjects);
    navOverview?.classList.toggle('nav-inactive', isProjects);
}

// Instant feedback on tap/click; observer corrects during/after smooth scroll
navOverview?.addEventListener('click', () => setActiveNav('overview'));
navProjects?.addEventListener('click', () => setActiveNav('projects'));

function initNavObserver() {
    // Honor deep links like /#projects on load
    const hash = window.location.hash.replace('#', '');
    if (hash === 'projects' || hash === 'overview') {
        setActiveNav(hash);
    } else {
        syncNavAria(currentSection);
    }

    if (!sectionOverview || !sectionProjects) return;

    if ('IntersectionObserver' in window) {
        // Middle band: top 35% + bottom 55% are margins, ~10% band decides.
        // Works on 360px phones and 1440px desktops without pixel magic.
        // NOTE: entries only contains *changed* sections, so we must persist
        // visibility per section. Deriving state from entries alone uses stale
        // data (e.g. projects still in band but absent from entries) and flips
        // to the wrong link at the boundary, widening the window where a
        // sticky touch :hover made both links look active.
        const bandVisible = { overview: false, projects: false };
        const navObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.target.id === 'overview') bandVisible.overview = entry.isIntersecting;
                if (entry.target.id === 'projects') bandVisible.projects = entry.isIntersecting;
            }
            // Projects wins ties (it's lower on the page = further progress)
            if (bandVisible.projects) setActiveNav('projects');
            else if (bandVisible.overview) setActiveNav('overview');
            // If neither intersects (mid-transition), keep last state — no flicker
        }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });

        navObserver.observe(sectionOverview);
        navObserver.observe(sectionProjects);
    } else {
        // Fallback: rAF-throttled scroll with viewport-proportional threshold
        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                ticking = false;
                const rect = sectionProjects.getBoundingClientRect();
                if (rect.top <= window.innerHeight * 0.4) {
                    setActiveNav('projects');
                } else {
                    setActiveNav('overview');
                }
            });
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }
}

initNavObserver();

// ---------------------------------------------------------------------------
// 4. Terminal Typing Engine (Hero Art Option B)
// ---------------------------------------------------------------------------
// Runs only if #art-terminal exists and is not hidden. Waves engine above is
// untouched — to revert, hide this block in HTML and unhide #art-waves.
(function initTerminal() {
    const termWindow = document.getElementById('art-terminal');
    const termBody = document.getElementById('terminalBody');
    const replayBtn = document.getElementById('terminalReplay');
    if (!termWindow || !termBody) return;

    const LINES = [
        { cmd: 'whoami', out: 'jitesh dhalwani — software engineer · dubai' },
        { cmd: 'stack', out: 'python · django · react · llms' },
        { cmd: 'cat experience.txt', out: 'ex-dubizzle — end-to-end features + ai solutions' },
        { cmd: 'ls projects/', out: 'eli5-ai  blog.j  tic-tac-toe  network  mail → scroll ↓' },
    ];

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Slightly slower on desktop for readability, snappier on touch
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const CHAR_MS = isCoarse ? 22 : 34;
    const LINE_PAUSE_MS = reduceMotion ? 0 : 320;
    const OUT_PAUSE_MS = reduceMotion ? 0 : 180;

    let runId = 0;
    let hasPlayed = false;

    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    function promptEl() {
        const p = document.createElement('p');
        p.className = 'break-words';
        const dollar = document.createElement('span');
        dollar.className = 'text-terra';
        dollar.textContent = '$ ';
        const cmd = document.createElement('span');
        cmd.className = 'text-cream';
        p.append(dollar, cmd);
        termBody.appendChild(p);
        return cmd;
    }

    function outputEl(text) {
        const p = document.createElement('p');
        p.className = 'text-muted break-words';
        p.textContent = text;
        termBody.appendChild(p);
    }

    function renderInstant() {
        termBody.innerHTML = '';
        for (const { cmd, out } of LINES) {
            const c = promptEl();
            c.textContent = cmd;
            outputEl(out);
        }
        const cursor = document.createElement('span');
        cursor.className = 'term-cursor';
        termBody.appendChild(cursor);
    }

    async function play(myRun) {
        termBody.innerHTML = '';
        for (const { cmd, out } of LINES) {
            if (myRun !== runId) return; // superseded by replay
            const cmdSpan = promptEl();
            const cursor = document.createElement('span');
            cursor.className = 'term-cursor';
            cmdSpan.after(cursor);
            // Type command char by char
            for (let i = 1; i <= cmd.length; i++) {
                if (myRun !== runId) return;
                cmdSpan.textContent = cmd.slice(0, i);
                await sleep(CHAR_MS);
            }
            cursor.remove();
            await sleep(LINE_PAUSE_MS);
            if (myRun !== runId) return;
            outputEl(out);
            await sleep(OUT_PAUSE_MS);
        }
        const endCursor = document.createElement('span');
        endCursor.className = 'term-cursor';
        termBody.appendChild(endCursor);
    }

    function start() {
        runId++;
        if (reduceMotion) renderInstant();
        else play(runId);
    }

    replayBtn?.addEventListener('click', start);

    // Play once when scrolled into view; replay only via button after that
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting && !hasPlayed) {
                    hasPlayed = true;
                    start();
                    io.disconnect();
                }
            }
        }, { threshold: 0.3 });
        io.observe(termWindow);
        // If already in view on load, IO fires immediately — no extra call needed
    } else {
        start();
    }
})();
