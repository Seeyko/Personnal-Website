# Mediterranean footer

`mediterranean-garden.webp` is a 2048 × 748 transparent WebP (~745 KiB).
The source illustration was supplied by the site owner. It keeps the house,
family, two cats, sea and garden. The sky is transparent, including openings
between leaves; the clouds retain their soft edges.

## Artwork preparation

The built-in imagegen tool produced the alpha cutout with this instruction:

> Remove only the blue sky, including openings between leaves and around the
> roof and distant coast. Preserve the original entire Mediterranean scene,
> placement, proportions, natural colors and painterly texture. Keep the house,
> tree, hanging chair, family with baby, exactly two cats, sea, coast and all
> foreground flowers. Retain soft, translucent cloud edges; keep the sea and
> garden opaque to the lower edge. No new objects, text, cropping, rearrangement
> or baked-in background.

The cutout was resized and encoded with Sharp (WebP quality 88, alpha quality
100). No theme-specific raster copies are needed: `footer-landscape.css` and
the inline SVG palettes in `index.html` render the existing five themes.

## Integration

- Both lazy-loaded image elements share one URL and one browser-cached asset.
- The scene reserves its height before loading and is decorative (`alt=""`,
  `aria-hidden="true"`). Mobile crops around the family and both cats.
- A top alpha mask blends trees/clouds into each theme's actual page background.
- A foreground mask keeps the garden at the bottom while the distant image
  moves at most 10px with scroll. Reduced motion disables this movement.
- The fixed contact CTA clears the scene when it is visible; footer navigation
  remains available above it.
- The normal theme selector remains the single source of truth via
  `body[data-theme]`. It reloads the page while restoring scroll position.

## Verification

Check `?theme=default|terminal|blueprint|retro90s|fps` with both `lang=fr` and
`lang=en`, desktop/mobile widths and `prefers-reduced-motion`. Verify the
footer links, theme switching near the footer, image loading, page-edge blend
and the absence of horizontal overflow.
