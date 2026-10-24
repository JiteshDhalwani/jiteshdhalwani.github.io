# jiteshdhalwani.github.io

Personal portfolio served by GitHub Pages from `main`. Static site, no build step.

- `index.html` is the whole page: HTML + inline CSS, plus a tiny Dubai-clock script at the bottom.
- `assets/hero.js` animates the hero on two canvases. `.fx-sky` (behind the clouds) draws twinkling stars and shooting stars. `.fx-air` (in front of the clouds and moon, behind the palms) draws flapping bird flocks: each bird is a small 3D wing rig projected to 2D. It also adds pointer parallax (fine pointers only) and generates the film-grain tile. It pauses when the hero is off-screen and draws one static frame under `prefers-reduced-motion`.
- `assets/` holds the painted sky layers (`sky.jpg`, `clouds.webp`, `palm-*.webp`), the moon (`moon.webp`), the icons (`favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`) and `og.jpg` (link-preview image, a 1200×630 capture of the hero).
- `moon.webp` is RGB on black and must stay under `mix-blend-mode: screen` (set on `.moonwrap`), so its unlit side disappears into the sky. It was rendered offline from NASA's public-domain CGI Moon Kit (colour + elevation maps; credit: NASA's Scientific Visualization Studio): waxing gibbous, about 66% lit, bright limb toward the lower left.
- Keep the Google Analytics tag (`G-YNV7SD3Y8P`), the Search Console verification meta and the JSON-LD block in `<head>`.
- Bump `<lastmod>` in `sitemap.xml` when page content changes.

## Preview
`python3 -m http.server 8765` in the repo root, then open http://127.0.0.1:8765/.
Check desktop and phone widths, and short heights too: real laptop viewports are roughly 650–870px tall, and iPhone Safari is roughly 550–750px.
Block `googletagmanager.com` in any automated browser runs so tests don't log fake GA visits.

## Design notes ("Night Gallery", from Claude Design)
- Fonts: Newsreader (serif) + Instrument Sans, from Google Fonts.
- Accent colours: indigo `--clay #5A6BC8` / `--clayd #3A4793` for UI; project figures use orange `#D97757` (set per plate in `.pl-*`).
- Plate colours are scoped as `.pf .pl-*` on purpose; otherwise `.pf a { color: inherit }` would make the SVG lines dark on the dark plates.
- Scroll-linked effects use CSS `animation-timeline: view()`. `.hero` must use `overflow: clip`, not `hidden`. `hidden` makes the hero its own scroll container, which kills the hero fade-out and moon parallax.
- All motion is disabled under `prefers-reduced-motion`.
- Breakpoints: 960px (stack to one column) and 600px (phone). Extra height-based rules (`max-height: 860px` / `700px` desktop, `760px` phone) keep the hero above the fold on short screens.
- `viewport-fit=cover` is on, so horizontal paddings use `max(<gutter>, env(safe-area-inset-*))` for notched phones in landscape.
- `favicon-32.png` / `apple-touch-icon.png` are rendered from `favicon.svg`. The apple icon is full-bleed (no `rx`) because iOS applies its own mask.
