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
- **The ratio** → the module is a square. The service preview plate and the
  grid overlay resolve to 1:1 — and in the hero the ratio is drawn as a
  gesture: two hands, reaching, brought together by the reader.
- **Correspondence** → the colon is the brand's operator. It stays red wherever
  it separates two things, and section 02 reads the name as an argument:
  Idea : Form, Noise : Signal.

Nothing on the site claims clients, projects, awards or metrics, because there
aren't any yet. The proof is the site itself and the six live experiments.

## The hero

**Two hands reaching, drawn in ASCII, and the scroll is what brings them
together.** They start apart; scrolling closes the gap until the fingertips
meet. The contact is something the reader causes rather than something they
watch, which is the only reason a hero animation earns a scroll at all.

**The artwork is the render.** `Left hand.txt` and `Right hand.txt` are the
source of truth — traced contours of the two hands. `handArt.ts` is generated
from them: cropped to content, with the crop-edge artefacts removed (the
source files close the arm outline along the image border, which renders as a
stray vertical bar where the arm should simply run off the frame), and parsed
into glyph buckets ordered outward from the fingertip. **If you edit the .txt,
regenerate `handArt.ts`** — the tip, bounds and reveal order are derived.

Characters are drawn exactly as authored: never resampled, never rasterised
from a bitmap. That is what holds up at any size, and it is where the earlier
procedural rig fell down.

Four things that took measuring rather than guessing:

- **The glyph advance is measured, not assumed.** At an assumed 0.55 the
  characters ran 9% wider than their cell and the artwork smeared into solid
  bars.
- **Weight rides density as much as brightness does.** Set every glyph at one
  size and a run of `A` stays a row of separate specks instead of becoming a
  stroke — the hand reads as texture, not form. Heavy glyphs are set large
  enough to touch their neighbours and close the contour; the light ones that
  shade the interior stay small and faint.
- **The cell size is the whole responsive story.** The artwork is 135 cells
  wide, so on a phone the forearms always run off frame — which is what an arm
  reaching in from outside should do. The floor is set so the hand itself,
  wrist to fingertips, always fits.
- **`dprCap` is 2 here, not 1.5.** Fine characters do not survive being drawn
  at 1.5× and upscaled to a phone's 3×.

**Cost is two `drawImage` calls.** Because the animation is pure translation,
each hand is rastered into its own canvas once and blitted at a **whole-pixel**
offset every frame — a bitmap blitted at a fractional offset resamples, and a
resampled character stops being a character. Characters are only redrawn while
the entrance is still revealing them. The ambient field refreshes a third of
its rows per frame and thickens near the hands by sampling a distance field
built from the artwork itself, so it reacts to the hands rather than merely
sharing a canvas with them.

The stage is held by **native sticky**, like every other held section here —
no pin, no spacer, nothing that can take the wheel.

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
  hero/                the headline composition
  type/                sliceRig — the banded word swap
  canvas/              service plates, process diagram, experiment host
lib/
  experiments.ts       the six generative sketches
  noise.ts             value noise / seeded PRNG
  sequence.ts          one stage change at a time, latest target wins
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

**The cursor re-tests on scroll, not only on pointer events.** The page moves
under a stationary pointer far more often than the pointer moves over the
page, so a label picked up in one section used to stay lit all the way down
the document and back — no pointer event ever fired to clear it. It now
re-resolves from `elementFromPoint` on scroll, throttled to a frame.

**The nav is opaque whenever the page is scrolled.** That state used to come
from a ScrollTrigger ending at `max`, which released at the very bottom of the
document: the bar turned transparent again over the footer and the type behind
it showed through. It is a plain `scrollY > 40` check now — there is no range
for the end of the page to fall outside of.

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

**Words are re-cut, not replaced.** Both word sequences — the Studio pair and
the How We Think stage names — run through `components/type/sliceRig.ts`. The
word is cut into seven horizontal bands; the outgoing bands shear off in
alternating directions and the incoming bands arrive through them from the
opposite side, so for about a third of a second both words share the line,
interleaved strip by strip.

Three things make it work:

- **The rig never styles type.** Every band is a full copy of the word inside
  the host element, clipped to its strip, so face, size, tracking, colour and
  `-webkit-text-stroke` are inherited from whatever the section already set.
- **Throw is measured against the type size, not the word's width.** A short
  word has to shear as hard as a long one or it reads as a wobble.
- **Every band is padded past its own ink and offset back** (`--bleed`,
  `--bleed-x`). A band is clipped to its own box, so that box has to be bigger
  than the type it holds. Vertically because these sections set leading below
  1; horizontally because the negative tracking applies after the final letter
  too, which measures the box narrower than the word paints and shaves the
  last stroke clean off.

The rig appends to a timeline the caller owns, rather than running its own, so
the rule, the copy and the diagram stay in step with the word. Earlier
versions compressed the width axis instead; that squeezed the letterforms
sideways into each other and was rejected.

**Stage changes queue; they never interrupt each other.** Both sequences go
through `lib/sequence.ts`. A fast scroll crosses several boundaries within a
few frames, and playing each one on arrival killed every transition a fraction
into the next — which is what made these sections feel rushed rather than
quick. The sequencer lets the running transition finish, keeps only the latest
stage the reader has reached, then goes straight there and skips what was
passed. The diagram handles the skip by treating everything behind the last
leg as already travelled.

`play` is handed a `done` it must call, and it should call it when the *word*
has landed — not at the end of the timeline. These sections carry much slower
atmosphere tweens that must not hold the next stage up.

**Sections are numbered.** Every section renders a `<Marker>`, which also
supplies the section's `<h2>` — the oversized statements are content, not
headings.

**Canvas sketches share one loop.** `useSketch` registers a draw callback on
`gsap.ticker`, gated by an IntersectionObserver, and hands the sketch **time in
milliseconds** (the ticker itself reports seconds). Experiment tiles run capped
at 30fps, and the hero's chips stop drawing once the hero is off screen.

**Text GSAP writes is not owned by React.** Nodes animated with ScrambleText or
swapped imperatively (`Process`, `Ratio`, the cursor label, the readouts)
are rendered empty and seeded in an effect. Letting React own that text breaks
reconciliation when the tree re-renders.

**The process diagram is driven, not self-animating.** `ProcessDiagram` reads a
`driver` ref (`{ leg, trail, dot }`) that the section's timeline writes to, so
the trail finishes travelling before the destination node scales in. They were
two independent tweens once, and the dot consistently arrived first.

`leg` is the connection being drawn *or withdrawn*. Scrolling back sets it to
the leg the reader arrived on and sends `trail` from 1 to 0, so the line
retreats the way it came instead of vanishing and redrawing itself forwards.
The two ends of that leg hand "current" to each other through `dot` in both
directions, so exactly one node is ever live. Write all three fields
synchronously before adding the tweens: a delayed `fromTo` leaves the old leg
drawn for a frame, which flashes.

**Tight leading plus `overflow: hidden` crops descenders.** The Studio pair lost
the tail of its "Q" that way. Where a mask is not doing real work, drop it and
carry the transition on transform and opacity instead — and where clipping is
the effect, as in the slice rig, give it a bleed.

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
| Move the cursor in the hero | the nearer hand leans a few px, eased; the field opens around the pointer |
| Scroll the hero | the hands close until the index fingertips meet |
| Hover a discipline | live preview plate trails the cursor |
| — | the list is not clickable; it is a list, not a menu |
| Click an experiment | reseed the composition |
| Tab | full keyboard path, visible focus, skip link first |
# oneistoone
