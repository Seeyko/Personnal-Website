# 3D Heart Experiment (Taubin implicit surface)

**Status**: completed
**Branch**: `claude/3d-heart-mobile-interaction-rwew60`
**Started**: 2026-06-21 15:00

## Task
Standalone interactive experiment: render the Taubin heart algebraic surface
as a real 3D mesh, rotatable/zoomable with fingers on mobile. Deploy to staging.

Equation: (x² + (9/4)y² + z² − 1)³ − x²z³ − (9/80)y²z³ = 0

## Files Added
- frontend/experiments/heart.html — standalone touch-first page
- frontend/js/experiments/heart-geometry.js — pure marching-cubes mesh generator (no deps)
- frontend/js/experiments/heart.js — Three.js scene + OrbitControls (touch)
- frontend/Dockerfile — added COPY for experiments/ dir

## Progress
- [x] Implicit field + analytic gradient
- [x] Marching cubes (Bourke tables) with vertex dedup -> watertight mesh
- [x] Three.js scene, physical material, 3-point lighting, heartbeat pulse
- [x] OrbitControls: 1 finger rotate, 2 finger pinch-zoom, auto-rotate idle
- [x] Node verification (manifold/symmetry/normals/on-surface) — all PASS
- [x] Dockerfile wired for staging image

## Notes/Discoveries
- Three.js loaded via CDN importmap (unpkg r0.160), matching the project's CDN pattern (GSAP).
- Geometry module is dependency-free so it can be unit-tested in Node.
- URL once deployed: https://staging.tomandrieu.com/experiments/heart.html
- Staging deploy = Docker image (Dokploy + Traefik) rebuilt from this branch; the
  page is copied into the nginx image via the new Dockerfile COPY line.
