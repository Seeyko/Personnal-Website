# Mediterranean footer illustrations

Every theme has its own 2048 × 748 transparent WebP. The default keeps the
owner-supplied illustration in its natural colors, with only the open sky
removed for integration. The four other scenes are independently redrawn by
the built-in imagegen tool from that original composition.

| Theme | Artwork | Direction |
| --- | --- | --- |
| Default | `mediterranean-garden.webp` | Original painterly Mediterranean garden |
| Terminal | `mediterranean-garden-terminal.webp` | ANSI character clusters, green phosphor, amber wireframe details |
| Blueprint | `mediterranean-garden-blueprint.webp` | Architectural cutaway, dimension chains, botanical sections, survey contours |
| Retro 90s | `mediterranean-garden-retro90s.webp` | Chunky 16-bit sprites, stepped outlines and checkerboard dithering |
| FPS Arena | `mediterranean-garden-fps.webp` | Source-style game-map geometry, modeled foliage and baked light |

All versions keep the house, tree, hanging chair, family with baby, exactly
two cats, sea, coast and foreground flowers. Open sky and gaps between leaves
have genuine alpha transparency. Generated artwork is normalized to the same
dimensions and encoded with Sharp (WebP quality 90, alpha quality 100).
No color transformations, CSS/SVG filters or texture overlays are applied.

## Prompts

`theme-artwork-prompts.json` contains the exact four prompts and shared source
constraints used with the built-in imagegen tool. `animation-prompt.txt` contains
the seamless-cinemagraph brief for an eventual Higgsfield animation.
`animation-prompt-magenta.txt` adds a fixed magenta key plate for video export.
The separate natural PNG prepared for Higgsfield is 1942 × 809 (2.4005:1), below
its 2.5 limit, with transparent and opaque-magenta export variants.

The default alpha cutout was generated with this instruction:

> Remove only the blue sky, including openings between leaves and around the
> roof and distant coast. Preserve the original entire Mediterranean scene,
> placement, proportions, natural colors and painterly texture. Keep the house,
> tree, hanging chair, family with baby, exactly two cats, sea, coast and all
> foreground flowers. Retain soft, translucent cloud edges; keep the sea and
> garden opaque to the lower edge. No new objects, text, cropping, rearrangement
> or baked-in background.

## Integration

- `footer-landscape.js` selects the artwork from `body[data-theme]` after
  ThemeManager initialization and observes later changes to that attribute.
- Both lazy-loaded depth layers share the active artwork URL. Assigning it after
  theme initialization avoids downloading the default during scroll restoration.
- The scene reserves its height before loading and is decorative (`alt=""`,
  `aria-hidden="true"`). Mobile crops around the family and both cats.
- An opacity mask blends trees/clouds into the actual page background. It affects
  transparency, never the illustration's colors or art style.
- A foreground mask anchors the garden while the distant layer moves at most
  10px with scroll. Reduced motion disables this movement.
- The fixed contact CTA clears the visible scene; footer navigation remains
  above it. A default image is available without JavaScript.
- The existing theme selector reloads the page and restores scroll position.

## Verification

Check `?theme=default|terminal|blueprint|retro90s|fps` with `lang=fr` and `lang=en`,
desktop/mobile widths and `prefers-reduced-motion`. Verify correct source URL,
one artwork download per page, no recoloring filters, footer links, real theme
switching, transparent page-edge blending and no horizontal overflow.
