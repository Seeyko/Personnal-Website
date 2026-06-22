/**
 * Homepage 3D heart — a theme-aware halftone point cloud of the Taubin surface.
 *
 * This module is *dynamically imported only when the section nears the viewport*
 * (see the IntersectionObserver in index.html), so neither this file nor Three.js
 * is fetched on initial page load — zero impact on SEO / Lighthouse.
 *
 * It also:
 *  - pauses its render loop whenever the heart is off-screen or the tab is hidden,
 *  - honours prefers-reduced-motion (renders a single static frame, no animation),
 *  - never blocks page scrolling (touch swipes scroll the page AND ripple the heart),
 *  - restyles itself per theme (default / terminal / blueprint / retro90s).
 */
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { buildHeartGeometry } from '/js/experiments/heart-geometry.js';

// Per-theme look: each theme gets a genuinely different particle — its own
// shape, palette, size and how violently it disintegrates — so switching theme
// is an unmistakable change, not just a recolour.
// shape: 0 round · 1 square · 2 cross · 3 diamond · 4 ring · 5 star · 6 triangle · 7 heart
const THEME_STYLES = {
  default:  { shape: 7, colA: 0x14141a, colB: 0xb23047, accent: 0xff2e55, rainbow: 0, size: 0.17, scatter: 2.4, swirl: 1.0 },
  terminal: { shape: 1, colA: 0x0a5a0a, colB: 0x49ff49, accent: 0xd6ffd6, rainbow: 0, size: 0.12, scatter: 3.1, swirl: 1.6 },
  blueprint:{ shape: 2, colA: 0x4f86c6, colB: 0xeaf6ff, accent: 0x76e6ff, rainbow: 0, size: 0.15, scatter: 2.7, swirl: 0.9 },
  retro90s: { shape: 5, colA: 0x6a00ff, colB: 0xffe600, accent: 0x00ffd0, rainbow: 1, size: 0.18, scatter: 3.6, swirl: 2.4 },
};

let started = false;

export function initHeart(section) {
  if (started) return;
  started = true;

  const canvas = section.querySelector('#heart-canvas');
  if (!canvas) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const themeId = document.body.dataset.theme || 'default';
  const style = THEME_STYLES[themeId] || THEME_STYLES.default;

  // Fewer points than a dense halftone, so each particle is big enough to read
  // as its theme's shape (a heart, a star, …) rather than a generic speck.
  const isSmall = Math.min(window.innerWidth, window.innerHeight) < 640;
  const RESOLUTION = isSmall ? 38 : 48;

  // --- Renderer (transparent: sits on the theme's own background) ---------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 4.8);

  function sizeToSection() {
    const w = canvas.clientWidth || section.clientWidth;
    const h = canvas.clientHeight || section.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uni.uScale.value = (h * renderer.getPixelRatio()) * 0.5;
    uni.uAspect.value = w / h;
    if (typeof frameHeart === 'function') frameHeart();
  }

  // --- Material -----------------------------------------------------------
  const uni = {
    uScale: { value: 1 },
    uSize: { value: style.size },
    uLightDir: { value: new THREE.Vector3(-0.45, 0.7, 0.65).normalize() },
    uColA: { value: new THREE.Color(style.colA) },
    uColB: { value: new THREE.Color(style.colB) },
    uAccent: { value: new THREE.Color(style.accent) },
    uRainbow: { value: style.rainbow },
    uShape: { value: style.shape },
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uPointer: { value: new THREE.Vector2(-10, -10) },
    uStrength: { value: 0 },
    uRadius: { value: 0.34 },
    uPush: { value: 0.35 },
    uScatter: { value: style.scatter },
    uSwirl: { value: style.swirl },
  };

  const material = new THREE.ShaderMaterial({
    uniforms: uni,
    transparent: true,
    depthTest: true,
    depthWrite: true,
    vertexShader: /* glsl */`
      uniform float uScale, uSize, uTime, uAspect, uStrength, uRadius, uPush, uScatter, uSwirl;
      uniform vec3 uLightDir;
      uniform vec2 uPointer;
      attribute vec3 aRandom;
      varying float vShade;
      varying float vInfl;
      varying float vHue;
      void main() {
        vec4 mv0 = modelViewMatrix * vec4(position, 1.0);
        vec4 clip = projectionMatrix * mv0;
        vec2 ndc = clip.xy / clip.w;
        float d = distance(vec2(ndc.x * uAspect, ndc.y), vec2(uPointer.x * uAspect, uPointer.y));
        float infl = smoothstep(uRadius, 0.0, d) * uStrength;
        vInfl = infl;
        vHue = fract((position.x + position.z) * 0.28 + 0.5);

        float shimmer = 0.75 + 0.25 * sin(uTime * 7.0 + position.x * 9.0 + position.y * 11.0);
        vec3 dpos = position + normal * (infl * uPush * shimmer);

        float burst = pow(max(infl, 0.0), 1.6);
        vec3 dir = normalize(normal * 0.4 + aRandom);
        vec3 swirl = vec3(
          sin(uTime * 2.3 * uSwirl + aRandom.y * 6.28),
          sin(uTime * 2.7 * uSwirl + aRandom.z * 6.28),
          sin(uTime * 2.1 * uSwirl + aRandom.x * 6.28)
        );
        dpos += dir * (burst * uScatter) + swirl * (infl * 0.45);

        vec4 mv = modelViewMatrix * vec4(dpos, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vShade = 0.18 + 0.82 * max(dot(n, normalize(uLightDir)), 0.0);

        gl_Position = projectionMatrix * mv;
        float s = uSize * (0.45 + 0.95 * vShade) * (1.0 + infl * 0.8) * (1.0 - 0.35 * burst);
        gl_PointSize = s * uScale / -mv.z;
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uColA, uColB, uAccent;
      uniform float uRainbow;
      uniform float uShape;
      uniform float uTime;
      varying float vShade;
      varying float vInfl;
      varying float vHue;
      vec3 hsv2rgb(vec3 c) {
        vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
        return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
      }
      void main() {
        vec2 p = gl_PointCoord - vec2(0.5);
        int shp = int(uShape + 0.5);
        float m;
        if (shp == 1) {               // square
          m = smoothstep(0.5, 0.45, max(abs(p.x), abs(p.y)));
        } else if (shp == 2) {        // cross / plus
          float inBox = step(max(abs(p.x), abs(p.y)), 0.5);
          float plus = max(step(abs(p.x), 0.16), step(abs(p.y), 0.16));
          m = inBox * plus;
        } else if (shp == 3) {        // diamond
          m = smoothstep(0.5, 0.44, abs(p.x) + abs(p.y));
        } else if (shp == 4) {        // ring / hollow circle
          float r = length(p);
          m = smoothstep(0.5, 0.42, r) * smoothstep(0.20, 0.28, r);
        } else if (shp == 5) {        // 5-point star
          float ang = atan(p.y, p.x);
          float r = length(p);
          float k = 0.30 + 0.20 * cos(5.0 * ang);
          m = smoothstep(k, k - 0.06, r);
        } else if (shp == 6) {        // upward triangle
          vec2 q = vec2(p.x, -p.y);
          float base = smoothstep(0.0, 0.04, q.y + 0.4);
          float sides = smoothstep(0.0, 0.04, (0.45 - q.y) - 1.9 * abs(q.x));
          m = base * sides;
        } else if (shp == 7) {        // heart
          vec2 q = (gl_PointCoord - vec2(0.5, 0.435)) * 2.3;
          q.y = -q.y;                 // y up
          float xx = q.x * q.x;
          float a = xx + q.y * q.y - 1.0;
          float hh = a * a * a - xx * q.y * q.y * q.y;
          m = 1.0 - smoothstep(-0.05, 0.05, hh);
        } else {                      // round
          m = smoothstep(0.5, 0.42, length(p));
        }
        if (m < 0.02) discard;

        vec3 col;
        if (uRainbow > 0.5) {
          col = hsv2rgb(vec3(fract(vHue + uTime * 0.05), 0.85, 1.0)) * (0.55 + 0.45 * vShade);
        } else {
          col = mix(uColA, uColB, vShade);
        }
        col = mix(col, uAccent, clamp(vInfl, 0.0, 1.0) * 0.85);
        gl_FragColor = vec4(col, m);
      }
    `,
  });

  // --- Build the point cloud ----------------------------------------------
  const { positions, normals } = buildHeartGeometry(RESOLUTION);
  const count = positions.length / 3;
  const random = new Float32Array(positions.length);
  for (let i = 0; i < count; i++) {
    let x, y, z, l2;
    do {
      x = Math.random() * 2 - 1; y = Math.random() * 2 - 1; z = Math.random() * 2 - 1;
      l2 = x * x + y * y + z * z;
    } while (l2 > 1 || l2 < 1e-4);
    random[i * 3] = x; random[i * 3 + 1] = y; random[i * 3 + 2] = z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(random, 3));
  geometry.computeBoundingBox();
  geometry.center();
  // After the -90° x-rotation below: geometry x -> screen-horizontal,
  // geometry z -> screen-vertical (lobes up), geometry y -> depth (toward camera).
  const bb = geometry.boundingBox;
  const heartW = bb.max.x - bb.min.x;
  const heartH = bb.max.z - bb.min.z;
  const heartD = bb.max.y - bb.min.y;
  // As it idly spins about the vertical axis, the on-screen width and the depth
  // swap, so the widest horizontal extent — and the deepest point — is the
  // larger of width/depth. Size against that so it never clips mid-spin.
  const span = Math.max(heartW, heartD);

  const heart = new THREE.Group();
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.rotation.x = -Math.PI / 2;
  heart.add(points);
  scene.add(heart);

  // Fit the heart to (almost) the whole frustum, accounting for perspective:
  // its nearest face sits at camZ - span*s/2, where it is magnified most, so we
  // solve the scale per axis at that near plane. This makes it as big as
  // possible while guaranteeing the lobes/tip never get cropped — on any aspect
  // ratio (wide desktop and tall phone). Recomputed on every resize.
  function frameHeart() {
    const T = Math.tan((camera.fov * Math.PI / 180) / 2);
    const camZ = camera.position.z;
    const F = 0.96; // leave a hair of margin for the point radius
    const sV = (2 * F * T * camZ) / (heartH + F * T * span);
    const sW = (2 * F * camera.aspect * T * camZ) / (span + F * camera.aspect * T * span);
    points.scale.setScalar(Math.min(sV, sW));
  }

  sizeToSection();

  // --- Interaction: grab to spin (inertial) + hover-bloom — never blocks scroll
  const ROT_Y = new THREE.Vector3(0, 1, 0);
  const ROT_X = new THREE.Vector3(1, 0, 0);
  const IDLE_SPIN = reduced ? 0 : 0.0026;
  const DRAG_K = 0.006;            // pixels -> radians
  // Bloom strength is driven by a spring (not a snap): it holds while the
  // pointer is over the heart, then reconstructs slowly with a bouncy overshoot
  // when the pointer leaves. Lower stiffness = slower, lower damping = bouncier.
  const STR_STIFF = 0.045;
  const STR_DAMP = 0.16;
  let dragging = false;
  let hovering = false;
  let strengthVel = 0;
  let activePointer = null;
  let lastX = 0, lastY = 0;
  let velX = IDLE_SPIN, velY = 0;  // current rotation velocity (coasts to idle)

  function pointerToNDC(e) {
    const rect = canvas.getBoundingClientRect();
    uni.uPointer.value.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    );
  }

  function onMove(e) {
    if (dragging && e.pointerId === activePointer) {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      velX = dx * DRAG_K;
      velY = dy * DRAG_K;
      heart.rotateOnWorldAxis(ROT_Y, velX);
      heart.rotateOnWorldAxis(ROT_X, velY);
    }
    pointerToNDC(e);
    hovering = true;
    requestFrame();
  }

  function onEnter(e) { hovering = true; pointerToNDC(e); requestFrame(); }
  function onLeave() { hovering = false; requestFrame(); } // let it spring back

  function onDown(e) {
    dragging = true;
    hovering = true;
    activePointer = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    canvas.classList.add('grabbing');
    pointerToNDC(e);
    requestFrame();
  }

  function onUp(e) {
    if (e.pointerId !== activePointer) return;
    dragging = false;
    activePointer = null;
    hovering = false;            // touch has no lingering hover after release
    try { canvas.releasePointerCapture(e.pointerId); } catch {}
    canvas.classList.remove('grabbing');
    requestFrame();
  }

  if (!reduced) {
    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerenter', onEnter, { passive: true });
    canvas.addEventListener('pointerleave', onLeave, { passive: true });
    canvas.addEventListener('pointerdown', onDown, { passive: true });
    canvas.addEventListener('pointerup', onUp, { passive: true });
    canvas.addEventListener('pointercancel', onUp, { passive: true });
  }

  // --- Render loop with visibility gating ---------------------------------
  const clock = new THREE.Clock();
  let rafId = 0;
  let visible = false;

  function frame() {
    rafId = 0;
    uni.uTime.value = clock.getElapsedTime();

    // Bloom strength springs toward 1 while interacting and back to 0 otherwise,
    // overshooting on the way back so the heart reconstructs slowly and bouncy.
    const target = (hovering || dragging) ? 1 : 0;
    strengthVel += (target - uni.uStrength.value) * STR_STIFF - strengthVel * STR_DAMP;
    uni.uStrength.value += strengthVel;

    if (!reduced && !dragging) {
      // Coast on the drag's momentum, then glide back to the gentle idle spin.
      velX += (IDLE_SPIN - velX) * 0.02;
      velY += (0 - velY) * 0.06;
      heart.rotateOnWorldAxis(ROT_Y, velX);
      heart.rotateOnWorldAxis(ROT_X, velY);
    }
    renderer.render(scene, camera);

    // Keep going while the heart spins, the spring is still settling, or we are
    // interacting — and only while it is on-screen.
    const settling = Math.abs(strengthVel) > 0.0005 || Math.abs(uni.uStrength.value - target) > 0.002;
    const animating = !reduced || settling || target > 0;
    if (visible && animating) rafId = requestAnimationFrame(frame);
  }
  function requestFrame() {
    if (!rafId && visible) rafId = requestAnimationFrame(frame);
  }

  // Pause/resume as the heart scrolls in and out of view.
  const vis = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) { clock.getDelta(); requestFrame(); }
    else if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }, { threshold: 0 });
  vis.observe(section);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    else if (!document.hidden) requestFrame();
  });

  let resizeT;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => { sizeToSection(); requestFrame(); }, 150);
  }, { passive: true });
}
