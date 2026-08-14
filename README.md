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

## Two heroes

The site ships two hero versions. The control at the bottom-left switches
between them and the choice persists in `localStorage`.

**Aperture** (`HeroAperture.tsx`) — six framed cards over a dark sheet, each a
window onto the *same* giant 1:1 mark drifting behind the page. The mark is
never shown whole; the reader assembles it from fragments. One card resolves
it as a Bayer dither, so the same object is read at two resolutions at once.
Mechanically it is one full-bleed canvas with `clip-path: path()` set to the
union of the card rectangles, plus a second canvas clipped to the dithered
card — so the artwork stays perfectly continuous across every window with no
per-card offset maths. Three copies of the mark interlock at different scales,
because a single 1:1 is mostly negative space and the windows would land on
emptiness.

**Statement** (`HeroStatement.tsx`) — a light sheet where the sentence *is*
the layout: media sits inside the line rather than beside it. Every chip is a
live generative sketch, not a placeholder image.

`components/hero/system.ts` holds the mark geometry as pure data in module
units, so proportions survive any viewport and only the module size `S`
changes. Both heroes draw from it, which is what keeps them the same identity
rather than two unrelated designs.

**Entrances only run on first reveal.** Both heroes take an `intro` prop; when
a hero is swapped in mid-session it lands at rest and the sheet fades instead.
The entrance exists to chain off the loading curtain, and on the swap path
there is no curtain — the timeline also proved unreliable there, and a
`fromTo` writes its from-state the moment it is built, which stranded the
chips invisible.

## Stack

Next.js 15 (App Router) · React 19 · GSAP (ScrollTrigger, ScrambleText) ·
Lenis. No UI framework — the CSS is hand-written, because the layout is
art-directed rather than composed from utilities. No WebGL: the hero concept
did not need it, and dropping Three.js took first-load JS from 301 kB to
180 kB.

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
  hero/                the twelve-module identity system
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

**Scroll feel lives in one place.** Lenis runs in `lerp` mode (0.075), not
duration mode: the position eases toward the target every frame, so the glide
is frame-rate independent and keeps responding while the wheel is still
moving, instead of restarting a fixed-length tween on every notch. That low
lerp is what produces the heavy, coasting feel — tune it there, not in
individual sections.

**Nothing may take the wheel.** There is one scrolling system: Lenis drives
the window, ScrollTrigger only *observes* it, and sections that need to hold
are held by native `position: sticky`. There are **no ScrollTrigger pins**
anywhere — a pin fixes the element and injects a spacer mid-scroll, which is
what made the Studio and Playground sections feel stuck. There is likewise no
`data-lenis-prevent` and no nested scroll container: that attribute tells
Lenis to ignore wheel events from inside an element, and on a container that
cannot itself scroll the page simply freezes under the pointer.

If you add a held section, use sticky and give ScrollTrigger `onUpdate` only.
Then verify a wheel over it still moves the page — and watch for a later
`position:` declaration in the same rule silently overriding the sticky, which
is exactly how the Studio section lost it once.

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
| Hover a discipline | plate settles on that row, alternating left/right |
| Bottom-left control | switch hero version (persisted) |
| Click an experiment | reseed the composition |
| Tab | full keyboard path, visible focus, skip link first |
# oneistoone
