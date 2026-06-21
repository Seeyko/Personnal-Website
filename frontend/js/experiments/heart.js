/**
 * Interactive 3D heart — the Taubin implicit surface, rendered with Three.js.
 * Drag (one finger) to rotate, pinch (two fingers) to zoom. Built for touch.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildHeartGeometry } from './heart-geometry.js';

const canvas = document.getElementById('scene');
const loader = document.getElementById('loader');

// Lower the grid resolution a touch on small / low-power screens so the
// one-time mesh build stays snappy on phones.
const isSmall = Math.min(window.innerWidth, window.innerHeight) < 640;
const RESOLUTION = isSmall ? 80 : 110;

// --- Renderer -------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

// --- Scene & camera -------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b0410');

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 0.6, 4.2);

// --- Lighting -------------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
scene.add(new THREE.HemisphereLight(0xffd9e6, 0x2a0a18, 0.7));

const key = new THREE.DirectionalLight(0xffd9e6, 2.2);
key.position.set(3, 4, 5);
scene.add(key);

const fill = new THREE.DirectionalLight(0x7aa2ff, 1.1);
fill.position.set(-4, -1, 2);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xff5d8f, 1.4);
rim.position.set(-2, 3, -5);
scene.add(rim);

// --- The heart ------------------------------------------------------------
const material = new THREE.MeshPhysicalMaterial({
  color: 0xe0123c,
  metalness: 0.0,
  roughness: 0.28,
  clearcoat: 1.0,
  clearcoatRoughness: 0.18,
  sheen: 0.6,
  sheenColor: new THREE.Color(0xff8fb0),
  // Render both faces so the surface is lit regardless of triangle winding —
  // Three orients the shading normal toward the viewer on double-sided meshes.
  side: THREE.DoubleSide,
});

const heart = new THREE.Group();
scene.add(heart);

let heartMesh = null;

function buildHeart() {
  const { positions, normals, indices } = buildHeartGeometry(RESOLUTION);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  // Centre and normalise scale so it always frames nicely.
  geometry.center();
  const r = geometry.boundingSphere ? geometry.boundingSphere.radius : 1;
  const scale = 1.5 / r;

  heartMesh = new THREE.Mesh(geometry, material);
  // The equation's z-axis is vertical (lobes up) — stand the heart upright.
  heartMesh.rotation.x = -Math.PI / 2;
  heartMesh.scale.setScalar(scale);
  heart.add(heartMesh);
}

// --- Controls (touch-first) ----------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 2.2;
controls.maxDistance = 8;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.9;
controls.rotateSpeed = 0.9;
// One finger rotates, two fingers pinch-zoom — exactly what a phone expects.
controls.touches = {
  ONE: THREE.TOUCH.ROTATE,
  TWO: THREE.TOUCH.DOLLY_ROTATE,
};
// Stop auto-rotating once the user grabs it; resume after a short idle.
let idleTimer = null;
controls.addEventListener('start', () => {
  controls.autoRotate = false;
  if (idleTimer) clearTimeout(idleTimer);
});
controls.addEventListener('end', () => {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { controls.autoRotate = true; }, 2500);
});

// --- Render loop ----------------------------------------------------------
const clock = new THREE.Clock();

// A gentle lub-dub heartbeat: two quick pulses then a rest.
function heartbeat(t) {
  const cycle = t % 1.1;
  const pulse = (phase, width) =>
    Math.exp(-Math.pow((cycle - phase) / width, 2));
  return 1 + 0.045 * pulse(0.0, 0.06) + 0.03 * pulse(0.18, 0.07);
}

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  if (heartMesh) {
    const s = (1.5 / (heartMesh.geometry.boundingSphere?.radius || 1)) * heartbeat(t);
    heartMesh.scale.setScalar(s);
  }
  controls.update();
  renderer.render(scene, camera);
}

// --- Resize ---------------------------------------------------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Boot -----------------------------------------------------------------
// Defer the heavy mesh build one frame so the loader can paint first.
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
