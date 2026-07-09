# Enderman Minecraft Redesign

**Status**: completed
**Branch**: `claude/enderman-design-minecraft-hgljf7`
**Started**: 2026-07-09 12:00

## Task
Redesign the hidden Enderman easter egg (terminal theme, bottom-left) to look
much closer to an actual Minecraft Enderman: authentic pixel-art proportions
(tall/thin, long arms & legs, square head), magenta glowing eyes, ender
particles, carried grass block.

## Files Being Modified
- frontend/themes/terminal/terminal.js
- frontend/themes/terminal/terminal.css

## Progress
- [x] Locate existing easter egg code
- [x] Gather visual references (official model: head 8x8, body 8x12, limbs 2x30;
      eyes 3x2 each with 2px gap; eye palette #ed8cff/#cb59ff/#aa1bab)
- [x] Implement pixel-art enderman (JS pixel map → inline SVG rects)
- [x] Browser test (Playwright screenshots: hidden eyes, hover trigger,
      appear/tremble/particles, teleport, no new console errors)
- [x] Commit & push

## Notes/Discoveries
- Easter egg lives in `createEndermanElement()` in terminal.js + CSS section
  "Enderman Easter Egg" in terminal.css. `window.enderman()` console command
  reuses the same element.
- `.enderman-ascii` class renamed to `.enderman-pixel`; the pixel map lives in
  `ENDERMAN_PIXELS` (12x50 char grid) and is rendered by `buildPixelSvg()`,
  which merges horizontal runs into single SVG rects.
- Theme switching reloads the page, so the DOM elements can't leak into other
  themes.

## Follow-up: dance animation (2026-07-09)
- Removed the carried grass block; the enderman now dances while visible:
  whole-body groove bounce, arms swinging up (rotate from shoulder), head
  bob, alternating leg kicks, slight torso sway. Visible time 3s → 5.5s.
- SVG is now grouped per body part (edm-head/body/arm-l/arm-r/leg-l/leg-r)
  with `transform-box: fill-box` so CSS rotations pivot at joints.
- Gotcha: `buildPixelSvg` is shared with the hidden-eyes trigger; it must not
  emit empty part groups or `document.querySelector('.edm-*')` matches the
  wrong SVG.
- The site's custom green block cursor (z-index 9999) follows the mouse; it
  parks over the hidden eyes while triggering. Enderman z-index raised
  99 → 9997 (above content, below CRT overlay + cursor).
- Skin brightened slightly + 2px purple rim light so the dark limbs stay
  readable against the dark background while dancing.

## Follow-up 2: crop fix + elaborate choreography (2026-07-09)
- Limbs were clipped by the SVG viewBox and the viewport edge while
  dancing → `overflow: visible` on the svg + moved left 14px → 120px so
  full arm swings (which pass through horizontal) always fit on screen.
- Choreography upgraded to a 3.6s / 8 half-beat cycle: double overhead
  arm pumps (115deg), disco points above the head (135deg, alternating
  left/right), bigger head/torso leans, step-touch leg kicks. Visible
  time 5.5s → 8s (two full cycles).
- Reminder: arm rotations below 90deg point DOWN-out from the shoulder
  pivot; overhead poses need angles past horizontal.

## Follow-up 3: articulated goofy act with block volley (2026-07-09)
- Skeleton now has real joints: forearms nest inside upper arms (elbow
  pivot), shins inside thighs (knee pivot), jaw inside head. A purple
  glowing mouth-interior rect sits behind the jaw and is revealed when
  the jaw drops (translateY up to 2 units = fully agape).
- Replaced the dance loop with a one-shot 9s act (all part animations
  `9s ... 1 forwards`, groove bounce stays infinite): goofy floppy dance
  → dirt block materializes in his hands → tossed high → falls while he
  watches mouth open → left-leg volley kick → block rockets off spinning
  → celebration with jaw wide open. Visible time 8s → 9.6s.
- The dirt block is a separate `.edm-ball` div (flat pixel SVG via new
  `buildFlatSvg`) animated with per-keyframe timing functions for
  gravity (decelerate up, accelerate down).
