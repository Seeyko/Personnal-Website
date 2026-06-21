/**
 * Interactive 3D heart — the Taubin implicit surface rendered as a
 * "projected halftone" point cloud on a light backdrop. Drag to spin it;
 * it keeps its momentum and glides to a gentle idle rotation. Pinch to zoom.
 */
import * as THREE from 'three';
import { buildHeartGeometry } from './heart-geometry.js';

const canvas = document.getElementById('scene');
const loader = document.getElementById('loader');

// Denser grid = more points = finer halftone. Points are cheap to draw, so we
// can afford a high sampling resolution; ease off a touch on small screens.
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

// --- Halftone point material ---------------------------------------------
// Dot size and tone both vary with how much each point faces the light, so
// lit areas read as dense pale dots and shadowed areas as small dark dots —
// a 3D halftone. Lighting is in view space, so the shading stays fixed to the
// camera and the form is revealed as the heart turns.
const pointMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uScale: { value: (window.innerHeight * renderer.getPixelRatio()) * 0.5 },
    uSize: { value: 0.024 },
    uLightDir: { value: new THREE.Vector3(-0.45, 0.7, 0.65).normalize() },
    uDark: { value: new THREE.Color(0x2a2a30) },
    uLight: { value: new THREE.Color(0xffffff) },
  },
  transparent: true,
  depthTest: true,
  depthWrite: true,
  vertexShader: /* glsl */`
    uniform float uScale;
    uniform float uSize;
    uniform vec3 uLightDir;
    varying float vShade;
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize(normalMatrix * normal);
      float lambert = max(dot(n, normalize(uLightDir)), 0.0);
      float shade = 0.18 + 0.82 * lambert;
      vShade = shade;
      gl_Position = projectionMatrix * mvPosition;
      // Bigger dots where brighter -> halftone tone via dot size.
      float s = uSize * (0.45 + 0.95 * shade);
      gl_PointSize = s * uScale / -mvPosition.z;
    }
  `,
  fragmentShader: /* glsl */`
    uniform vec3 uDark;
    uniform vec3 uLight;
    varying float vShade;
    void main() {
      // Round, soft-edged dot.
      float d = length(gl_PointCoord - vec2(0.5));
      float alpha = smoothstep(0.5, 0.4, d);
      if (alpha < 0.02) discard;
      vec3 color = mix(uDark, uLight, vShade);
      gl_FragColor = vec4(color, alpha);
    }
  `,
});

// --- Build the point cloud ------------------------------------------------
const heart = new THREE.Group();
scene.add(heart);

function buildHeart() {
  const { positions, normals } = buildHeartGeometry(RESOLUTION);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.computeBoundingSphere();

  // Centre and normalise scale so it always frames nicely.
  geometry.center();
  const r = geometry.boundingSphere ? geometry.boundingSphere.radius : 1;

  const points = new THREE.Points(geometry, pointMaterial);
  // The equation's z-axis is vertical (lobes up) — stand the heart upright.
  points.rotation.x = -Math.PI / 2;
  points.scale.setScalar(1.6 / r);
  heart.add(points);
}

// --- Inertial drag + pinch zoom (touch-first) ----------------------------
const ROT_AXIS_Y = new THREE.Vector3(0, 1, 0);
const ROT_AXIS_X = new THREE.Vector3(1, 0, 0);
const IDLE_SPIN = 0.0022; // gentle self-rotation it always glides back to
const DRAG_K = 0.006;     // finger sensitivity

let velX = IDLE_SPIN; // angular velocity around world Y
let velY = 0;         // angular velocity around world X
const pointers = new Map();
let dragging = false;
let lastX = 0, lastY = 0;
let pinchStart = 0, pinchStartDist = camDistance;

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
  }
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

// --- Render loop ----------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);

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
  pointMaterial.uniforms.uScale.value =
    (window.innerHeight * renderer.getPixelRatio()) * 0.5;
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
