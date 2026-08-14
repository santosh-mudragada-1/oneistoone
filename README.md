# 1:1 — Creative Studio

The studio's own site, built as its first piece of work.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## The idea

**1:1 is a ratio — actual size, no reduction, no distortion.** That reading drives
the whole system:

- **Actual size** → the page is framed like a print production sheet: registration
  crosses, a scroll rule, live viewport and clock readouts in the colophon.
- **The ratio** → the module is a square. The service preview plate, the hero
  point cloud's frame and the grid overlay all resolve to 1:1.
- **Correspondence** → the colon is the brand's operator. It stays red wherever
  it separates two things, and section 02 reads the name as an argument:
  Idea : Form, Noise : Signal.

Nothing on the site claims clients, projects, awards or metrics, because there
aren't any yet. The proof is the site itself and the six live experiments.

## Stack

Next.js 15 (App Router) · React 19 · Three.js · GSAP (ScrollTrigger, SplitText,
ScrambleText) · Lenis. No UI framework — the CSS is hand-written, because the
layout is art-directed rather than composed from utilities.

## Structure

```
app/
  globals.css          design tokens, type scale, ink/paper surfaces
  layout.tsx           fonts (Archivo variable, Instrument Serif, JetBrains Mono)
  page.tsx             section order + chrome
components/
  SmoothScroll.tsx     Lenis, wired to the GSAP ticker and ScrollTrigger
  Cursor.tsx           two-part cursor; inverts per surface
  PageFrame.tsx        registration marks, progress rule, scroll position
  GridOverlay.tsx      press G to reveal the 12-column grid
  Preloader.tsx        load sequence and curtain
  Nav.tsx              section tracking, surface-aware bar, overlay menu
  sections/            01 Hero … 07 Footer
  webgl/               hero survey field (point terrain)
  canvas/              service plates, process diagram, experiment host
lib/
  experiments.ts       the six generative sketches
  noise.ts             value noise / seeded PRNG
  hooks.ts             gsap context, sketch ticker, magnetic, media queries
```

## Conventions worth knowing

**The wordmark is Inter, monochrome, and nothing else uses that face.** It has
its own token (`--f-logo`) and carries no accent colour — no red colon, no
hover tint. On dark surfaces it is white; in the nav it takes `currentColor` so
it stays legible when the page inverts. Red is an accent everywhere *except*
inside the mark.

**Surfaces.** Sections carry `data-surface="ink" | "paper" | "red"`, which
re-binds `--bg`/`--fg`/`--line`. The nav and cursor read the same attribute so
they invert with the page instead of guessing.

**Nothing may take the wheel.** The Playground is ordinary vertical flow: no
pin, no horizontal track, no nested scroll container, and no
`data-lenis-prevent` anywhere in the app. That attribute tells Lenis to ignore
wheel events originating inside an element — on a container that cannot itself
scroll, the page simply freezes under the pointer. The cards' sideways
character is a transform-only parallax on scroll, which cannot capture input.
If you add a scrolling region, verify a wheel over it still moves the page.

**Transitions compress, they do not cut.** Where a word is replaced (How We
Think, the Studio pair), the width axis and tracking travel continuously across
the whole event and the text is exchanged at the pinch, while opacity is zero.
The reader sees one object reshaping. Avoid mask-and-slide swaps here — they
read as two words, which is what this replaced.

**Sections are numbered.** Every section renders a `<Marker>`, which also
supplies the section's `<h2>` — the oversized statements are content, not
headings.

**Canvas sketches share one loop.** `useSketch` registers a draw callback on
`gsap.ticker`, gated by an IntersectionObserver, and hands the sketch **time in
milliseconds** (the ticker itself reports seconds). Experiment tiles run capped
at 30fps; the hero's WebGL loop pauses when the hero leaves the viewport.

**Text GSAP writes is not owned by React.** Nodes animated with ScrambleText or
swapped imperatively (`Process`, `PointOfView`, the cursor label, the readouts)
are rendered empty and seeded in an effect. Letting React own that text breaks
reconciliation when the tree re-renders.

**The process diagram is driven, not self-animating.** `ProcessDiagram` reads a
`driver` ref (`{ trail, dot }`) that the section's timeline writes to, so the
trail finishes travelling before the destination node scales in. They were two
independent tweens once, and the dot consistently arrived first.

**Tight leading plus `overflow: hidden` crops descenders.** The Studio pair lost
the tail of its "Q" that way. Where a mask is not doing real work, drop it and
carry the transition on transform and opacity instead.

**Reduced motion is a layout, not a switch.** Sections with pinned sequences
also render a static editorial version; CSS picks one and `gsap.matchMedia`
decides whether to build the ScrollTrigger. The React tree never changes shape,
because ScrollTrigger's pin spacer moves DOM that React would otherwise try to
remove.

## Interaction reference

| | |
|---|---|
| `G` | toggle the layout grid |
| `Esc` | close the menu |
| Hover a discipline | live generative plate follows the cursor |
| Click an experiment | reseed the composition |
| Tab | full keyboard path, visible focus, skip link first |
# oneistoone
