# Everybody, Somewhere.

**A thousand fictional people. One ordinary day.**

The complete React version of the approved interactive preview. The same 1,000 people
move among Sleeping, Working / studying, Travelling, Eating, Unwinding, and Home & care.
The population is conserved at every minute, including across midnight.

## Run it

Use Node.js 22.12 or newer (Node 24 is also supported).

```bash
npm ci
npm run dev
```

Open the Local address printed by Vite. To make a production build:

```bash
npm run build
npm run preview
```

## Using your existing Vite project

This is a complete project, not just a replacement App.jsx. To put it into the project
you already created, copy the entire `src/` folder, `public/`, `index.html`,
`package.json`, `package-lock.json`, and `vite.config.js` into its root. Run `npm ci`,
then `npm run dev`. The renderer and data modules are required imports.

Alternatively, extract this folder, open it in VS Code, and run the commands above.
`node_modules` and generated `dist` are deliberately not included in the archive.

## Everything included

- 1,000 stable identities, with reproducible individual routines (seed 042).
- Six activities, with the same colours, layout and visual identity as the preview.
- Organic sunflower clusters, a work grid and three travel lanes.
- A 24-hour timeline that can be scrubbed to any minute.
- Play/pause and 03:00, 08:00, 13:00, 19:00 and 23:00 presets.
- Playback at 0.5×, 1×, 2× and 4×. At 1× a full day takes 160 seconds.
- Smooth GSAP-driven journeys along curved paths, short trails, gentle settling
  and interpolation between activity colours.
- Person following: enter 1–1,000 and press Enter or the Follow button, or click a dot.
- A numbered ring, current activity and next activity/time for the selected person.
- Responsive desktop/mobile arrangements, retina rendering capped at 2×, native
  controls, visible keyboard focus, a canvas text alternative and explicit validation.
- Reduced-motion support: positions update immediately instead of flying between groups.
- Paused rendering when idle; suspended simulation and paused journeys when hidden
  or offscreen. No permanent decorative animation loop.
- React StrictMode-safe cleanup for GSAP journeys, the ticker, observers and listeners.
- A short entrance sequence for the header that respects reduced motion.
- Production configuration, locked dependencies and automated tests.

## How to read it

One dot is one person, not a percentage or a generic decorative particle. Position and
colour show activity. The six labels always count people at the selected time. During
an animated jump, the dots travel toward that snapshot, so the counts describe the
destination state. Short lines are transition trails, not additional people or real routes.

Dot location within a group is an arrangement for readability, not a home address.
Shapes identify activities; the exact numerical comparison is provided by the labels
and the count of dots. The ring and larger white dot identify the selected person.

## This is simulated data

Nothing here is live tracking or a survey. The model deliberately uses fictional day
schedules, 10% shifted schedules and 20% home-focused schedules. Those percentages
are creative assumptions, not estimates of any city or demographic.

Every person has a fixed identity and a cyclic routine. Pseudo-random offsets vary
their waking, meals, commute durations, work ending, dinner and bedtime. Changing
the seed changes the routines; the same seed reproduces the same model.

## Source map

| File | Responsibility |
| --- | --- |
| `src/App.jsx` | Full React interface, control state and lifecycle |
| `src/index.css` | Complete responsive visual styling |
| `src/data/model.js` | Population, schedules, counts and time formatting |
| `src/visualization/geometry.js` | Layout, phyllotaxis, interpolation and Bézier mathematics |
| `src/visualization/createScene.js` | Canvas rendering, GSAP transitions, playback and picking |
| `src/main.jsx` | React entry point and StrictMode |
| `tests/` | Model invariants, geometry, controls and cleanup checks |

## Why React + GSAP + Canvas

React describes the interface and selected state. It does not rerender a component
for each moving dot on each frame. Canvas draws the 1,000 points efficiently. GSAP
animates each moving person's progress along their curve and supplies the shared
ticker. Native CSS styles the interface. No charting library or WebGL is used.

The scene keeps only currently active GSAP journeys in a map and removes completed
ones. It explicitly owns and destroys these later-created animations when the React
component unmounts. The header's entrance animation is scoped and cleaned up by
`useGSAP`. Rendering ends once a paused scene has settled.

## Checks

```bash
npm test
```

Tests cover conservation at all 1,440 minutes, cyclic time, stable identities,
reproducibility, night/morning patterns, next-activity lookup, responsive target
geometry, curve endpoints, timeline/preset controls, playback, speed, person lookup,
invalid input, reduced motion and React StrictMode cleanup.

The DOM tests use a headless DOM and a canvas API stand-in. They verify behavior
and finite coordinates, not screenshot appearance or browser GPU performance.

## Small experiments

1. Change one activity colour in `src/data/model.js`.
2. Change the playback multiplier `9` in `createScene.js` and predict the day duration.
3. Try a different `MODEL_SEED`; watch how the collective rhythm remains recognizable.
4. Inspect `getTarget` in `geometry.js`: replace the work grid with the sunflower
   arrangement and consider what changes in readability.
5. Read `MATH.md` when you want to understand the geometry without starting over.

## Publishing

This is a standard Vite application: build command `npm run build`, output directory
`dist`. No account, backend, API key, external font or data service is required.
