/**
 * Interactive 3D heart — the Taubin implicit surface rendered as a
 * "projected halftone" point cloud on a light backdrop.
 *
 * Gestures:
 *  - one finger drag .... spin it; it keeps its momentum and glides to a
 *                         gentle idle rotation. Wherever you touch, the points
 *                         bloom outward with a warm glow and reform on release.
 *  - two finger pinch ... zoom.
 */
import * as THREE from 'three';
import { buildHeartGeometry } from './heart-geometry.js';

const canvas = document.getElementById('scene');
const loader = document.getElementById('loader');

// Denser grid = more points = finer halftone. Points are cheap, so sample high.
const isSmall = Math.min(window.innerWidth, window.innerHeight) < 640;
const RESOLUTION = isSmall ? 96 : 128;

// --- Renderer (transparent so the CSS backdrop shows through) -------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearAlpha(0);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
let camDistance = 4.4;
camera.position.set(0, 0, camDistance);

// --- Halftone point material with touch deformation ----------------------
// Dot size and tone vary with view-space lighting (lit = dense pale dots,
// shadow = small dark dots). Near the pointer, points bloom outward along
// their normal and glow with an accent colour; the influence fades in/out so
// the cloud reforms when you let go.
const pointMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uScale: { value: (window.innerHeight * renderer.getPixelRatio()) * 0.5 },
    uSize: { value: 0.024 },
    uLightDir: { value: new THREE.Vector3(-0.45, 0.7, 0.65).normalize() },
    uDark: { value: new THREE.Color(0x2a2a30) },
    uLight: { value: new THREE.Color(0xffffff) },
    uAccent: { value: new THREE.Color(0xff2e55) },
    uTime: { value: 0 },
    uAspect: { value: window.innerWidth / window.innerHeight },
    uPointer: { value: new THREE.Vector2(-10, -10) }, // NDC, off-screen = idle
    uStrength: { value: 0 },     // 0..1 touch influence, eased in JS
    uRadius: { value: 0.36 },    // influence radius in NDC
    uPush: { value: 0.35 },      // base bloom distance (object space)
    uScatter: { value: 2.8 },    // chaotic disintegration distance
  },
  transparent: true,
  depthTest: true,
  depthWrite: true,
  vertexShader: /* glsl */`
    uniform float uScale, uSize, uTime, uAspect, uStrength, uRadius, uPush, uScatter;
    uniform vec3 uLightDir;
    uniform vec2 uPointer;
    attribute vec3 aRandom;
    varying float vShade;
    varying float vInfl;

    void main() {
      // Where does this point land on screen (before deformation)?
      vec4 mv0 = modelViewMatrix * vec4(position, 1.0);
      vec4 clip = projectionMatrix * mv0;
      vec2 ndc = clip.xy / clip.w;
      float d = distance(vec2(ndc.x * uAspect, ndc.y),
                         vec2(uPointer.x * uAspect, uPointer.y));
      float infl = smoothstep(uRadius, 0.0, d) * uStrength;
      vInfl = infl;

      // Base bloom along the normal...
      float shimmer = 0.75 + 0.25 * sin(uTime * 7.0 + position.x * 9.0 + position.y * 11.0);
      vec3 dpos = position + normal * (infl * uPush * shimmer);

      // ...then chaotic disintegration: fling each point along its own random
      // direction (ramped sharply with influence) plus a swirling drift, so the
      // heart blows apart near the finger and re-collapses on release.
      float burst = pow(infl, 1.6);
      vec3 dir = normalize(normal * 0.4 + aRandom);
      vec3 swirl = vec3(
        sin(uTime * 2.3 + aRandom.y * 6.28),
        sin(uTime * 2.7 + aRandom.z * 6.28),
        sin(uTime * 2.1 + aRandom.x * 6.28)
      );
      dpos += dir * (burst * uScatter) + swirl * (infl * 0.45);

      vec4 mv = modelViewMatrix * vec4(dpos, 1.0);
      vec3 n = normalize(normalMatrix * normal);
      float lambert = max(dot(n, normalize(uLightDir)), 0.0);
      vShade = 0.18 + 0.82 * lambert;

      gl_Position = projectionMatrix * mv;
      // Scattered points shrink a little as they fly off, like embers.
      float s = uSize * (0.45 + 0.95 * vShade) * (1.0 + infl * 0.8) * (1.0 - 0.35 * burst);
      gl_PointSize = s * uScale / -mv.z;
    }
  `,
  fragmentShader: /* glsl */`
    uniform vec3 uDark, uLight, uAccent;
    varying float vShade;
    varying float vInfl;
    void main() {
      // Round, soft-edged dot.
      float dd = length(gl_PointCoord - vec2(0.5));
      float alpha = smoothstep(0.5, 0.4, dd);
      if (alpha < 0.02) discard;
      vec3 color = mix(uDark, uLight, vShade);
      color = mix(color, uAccent, clamp(vInfl, 0.0, 1.0) * 0.85);
      gl_FragColor = vec4(color, alpha);
    }
  `,
});

// --- Build the point cloud ------------------------------------------------
const heart = new THREE.Group();
scene.add(heart);

function buildHeart() {
  const { positions, normals } = buildHeartGeometry(RESOLUTION);

  // A random direction per point drives the chaotic disintegration scatter.
  const count = positions.length / 3;
  const random = new Float32Array(positions.length);
  for (let i = 0; i < count; i++) {
    // Random point in a unit sphere -> random direction + magnitude.
    let x, y, z, l2;
    do {
      x = Math.random() * 2 - 1;
      y = Math.random() * 2 - 1;
      z = Math.random() * 2 - 1;
      l2 = x * x + y * y + z * z;
    } while (l2 > 1 || l2 < 1e-4);
    random[i * 3] = x;
    random[i * 3 + 1] = y;
    random[i * 3 + 2] = z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(random, 3));
  geometry.computeBoundingSphere();

  geometry.center();
  const r = geometry.boundingSphere ? geometry.boundingSphere.radius : 1;

  const points = new THREE.Points(geometry, pointMaterial);
  // Scattered points leave the bounding sphere; don't let culling hide them.
  points.frustumCulled = false;
  points.rotation.x = -Math.PI / 2; // equation z-axis is up (lobes up)
  points.scale.setScalar(1.6 / r);
  heart.add(points);
}

// --- Inertial drag + pinch zoom + touch bloom (touch-first) --------------
const ROT_AXIS_Y = new THREE.Vector3(0, 1, 0);
const ROT_AXIS_X = new THREE.Vector3(1, 0, 0);
const IDLE_SPIN = 0.0022;
const DRAG_K = 0.006;

let velX = IDLE_SPIN;
let velY = 0;
const pointers = new Map();
let dragging = false;
let lastX = 0, lastY = 0;
let pinchStart = 0, pinchStartDist = camDistance;

const pointerNDC = pointMaterial.uniforms.uPointer.value;
function setPointerNDC(clientX, clientY) {
  pointerNDC.set(
    (clientX / window.innerWidth) * 2 - 1,
    -(clientY / window.innerHeight) * 2 + 1,
  );
}

function applyRotation(ax, ay) {
  heart.rotateOnWorldAxis(ROT_AXIS_Y, ax);
  heart.rotateOnWorldAxis(ROT_AXIS_X, ay);
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    setPointerNDC(e.clientX, e.clientY);
  } else if (pointers.size === 2) {
    dragging = false;
    const pts = [...pointers.values()];
    pinchStart = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    pinchStartDist = camDistance;
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size >= 2) {
    const pts = [...pointers.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (pinchStart > 0) {
      camDistance = THREE.MathUtils.clamp(
        pinchStartDist * (pinchStart / dist), 2.4, 9,
      );
    }
    return;
  }

  if (dragging) {
    setPointerNDC(e.clientX, e.clientY);
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    velX = dx * DRAG_K;
    velY = dy * DRAG_K;
    applyRotation(velX, velY);
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size === 0) dragging = false;
  if (pointers.size < 2) pinchStart = 0;
  if (pointers.size === 1) {
    const p = [...pointers.values()][0];
    dragging = true;
    lastX = p.x;
    lastY = p.y;
    setPointerNDC(p.x, p.y);
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

// --- Render loop ----------------------------------------------------------
const clock = new THREE.Clock();
const u = pointMaterial.uniforms;

function animate() {
  requestAnimationFrame(animate);
  u.uTime.value = clock.getElapsedTime();

  // Touch bloom fades in while a single finger is down, out otherwise.
  const target = (dragging && pointers.size === 1) ? 1 : 0;
  u.uStrength.value += (target - u.uStrength.value) * 0.12;

  if (!dragging) {
    // Coast on momentum, then glide back to a gentle idle spin — "the dance".
    velX += (IDLE_SPIN - velX) * 0.018;
    velY += (0 - velY) * 0.05;
    applyRotation(velX, velY);
  }

  camera.position.z += (camDistance - camera.position.z) * 0.12;
  renderer.render(scene, camera);
}

// --- Resize ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  u.uScale.value = (window.innerHeight * renderer.getPixelRatio()) * 0.5;
  u.uAspect.value = window.innerWidth / window.innerHeight;
});

// --- Boot -----------------------------------------------------------------
requestAnimationFrame(() => {
  try {
    buildHeart();
    if (loader) loader.classList.add('hidden');
    animate();
  } catch (err) {
    console.error('Heart build failed', err);
    if (loader) loader.textContent = 'Erreur lors de la génération du cœur.';
  }
});
