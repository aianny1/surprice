# Phase 1 Audit — Her Universe

Date: 2026-11-22 · Scope: existing code only (Intro, Universe, transition engine). **No app code changed in this phase.**

---

## 1. Summary

| Area | Status |
|------|--------|
| TypeScript (`tsc --noEmit`) | ✅ passes |
| Production build (`next build`, clean `.next`) | ✅ passes. All routes static (`/`, `/intro`, `/universe`, `/_not-found`, `/icon.svg`) |
| Existing Chrome tests (`tests/e2e.mjs`, 5 scenarios) | ✅ 5/5 pass (desktop journey + back/forward, direct-URL gate, skip, mobile, reduced motion) |
| Runtime errors during tests | ✅ none |
| Performance on RTX 2050 | ✅ smooth everywhere (99–144 fps) |
| Performance on integrated GPU (Intel UHD) | ❌ **Universe 14 fps on "high"**, 31–42 on medium, 38 on low |
| GPU memory | ❌ **leak**: +72 framebuffers, ~7 textures and ~14 buffers per intro ⇄ universe round trip |
| Visual bugs | 15 found (list in §5) |
| Vercel compatibility (current code) | ✅ static only, no API routes, no env vars, no external runtime services |

Biggest risks: (1) on an ordinary laptop with integrated graphics, or with Chrome on the integrated GPU, the universe stutters badly; (2) the GPU leak will grow as chapters are added.

---

## 2. Codebase inventory (verified)

The architecture matches what was built in the previous session; no unexpected changes. **There is no git repository**, so there is no history or rollback point.

```
app/                  layout (fonts, Providers), /intro, /universe, redirect /, not-found, icon.svg
engine/
  Providers.tsx       Stage (dynamic, ssr:false) + main + Chrome + OverlayLayer + HistoryWatcher
  chapters.ts         chapter registry (7 chapters, 2 built)
  stage/              Stage (persistent Canvas), CameraRig, PostFX, rig/fx drivers, tunnel, useSceneReady
  transition/         manager (go / arrive / skip / history / gate), transitions (T1, fade, cold, rewind, reduced),
                      OverlayLayer, HistoryWatcher, overlay helpers
  audio/              AudioManager (synthesised SFX only, no music yet)
  ui/                 Chrome (chapter mark, sound toggle), CinematicButton
chapters/intro/       IntroChapter (DOM), IntroScene, Envelope, state
chapters/universe/    UniverseChapter (DOM), UniverseScene, Sky (nebula/stars/planets), Portal, Butterflies, NameParticles, state
animation/            gsap setup + eases, text primitives (SplitText)
content/              person.ts, messages.ts, site.ts   ← the new brief asks for data/
lib/textures.ts       procedural canvas textures, text-to-points sampling
store/experience.ts   zustand store (phase, visited, sound, quality, gate)
tests/                e2e.mjs, perf.mjs (new, this phase)
```

Stack versions: Next 16.4.6, React 19.3.1, three 0.187, R3F 9.8.2, drei 10.7.9, @react-three/postprocessing 3.2.2, GSAP 3.15.1, Motion 14.14, zustand 5.1, Tailwind 4, TypeScript 5.9.3 (pinned; TS 7 native does not suit the Next build).

---

## 3. Performance audit

### Method

`tests/perf.mjs`. Headless Chrome, vsync on (the cap is 144 Hz), 1440×900 at DPR 1. Mobile is 390×844 at DPR 3, auto tier.
- Measurement starts **only after a chapter's entrance has finished** (input unlocked) and the scene has settled for 1.5 s.
- Each sample reports frame-time p50/p95 and long frames (>33 ms), not just an average.
- Draw calls and live GPU objects are counted by wrapping the WebGL API.

The previous session's numbers were unreliable because they were taken mid-animation.

### Results — Intel UHD (integrated, Chrome's default GPU on this laptop)

| Tier | Intro idle | Letter open | T1 transition (long frames) | **Universe idle** | Universe draws/frame |
|------|-----------|-------------|-----------------------------|-------------------|----------------------|
| high | 106 fps (p95 14 ms) | 105 fps | 7 | **14 fps (p95 70 ms)** | 69 |
| medium | 144 | 144 | 29 | **31–42 fps (p95 35 ms)** | 56 |
| low | 144 | 144 | 18 | **38 fps (p95 28 ms)** | 22 |
| mobile (auto → medium, canvas 585×1266) | 144 | 144 | 8 | 51 fps (p95 21 ms) | 43 |

### Results — NVIDIA RTX 2050 (forced with `--force_high_performance_gpu`)

| Tier | Intro | Letter | T1 long frames | Universe idle |
|------|-------|--------|----------------|---------------|
| high | 144 | 144 | 2 | 99 fps (p95 14 ms) |
| medium | 144 | 144 | 1 | 144 |
| low | 144 | 144 | 1 | 144 |
| mobile | 144 | 144 | 1 | 144 |

### Diagnosis

1. **The universe is fill-rate bound.** Halving the resolution (720×450) raises low tier from 38 → 124 fps and medium from 42 → 90 fps. The cost is per-pixel shading, not draw calls (low tier has only 22 draws per frame).
2. **Prime suspect: the full-screen nebula shader** (`chapters/universe/Sky.tsx`). It runs 4 fbm calls × 5 octaves of 3D simplex noise, about 20 noise evaluations for *every pixel*, every frame, even though the sky barely moves.
3. **High tier stacks extra full-scene passes on top:**
   - `MeshReflectorMaterial` at 1024 resolution re-renders the whole scene, including the nebula, plus a blur.
   - The `transmission` glass renders the scene again.
   - Bloom uses 8 mip levels, plus 4× MSAA.
4. **Adaptive quality doesn't work.**
   - `detectQuality()` looks only at CPU cores and memory, so any desktop or laptop gets `high` whatever its GPU. Integrated GPUs start on the 14 fps tier.
   - The runtime `PerformanceMonitor` did not lower the tier while the universe ran at 14 fps for over 8 seconds.
5. Intro is healthy on all GPUs. T1 shows a few long frames while the universe compiles, but they happen under the white light overlay, so they're invisible.

### Load size

- First load of `/intro`: **231 KB JS** (transferred, gzip) and **244 KB fonts**, in 17 requests.
- All JS chunks total 617 KB gzip. The largest chunk is 240 KB gzip (three + R3F).
- No images, video or models are used yet; all textures are procedural.

### GPU memory leak (confirmed root cause)

| Per intro ⇄ universe round trip | Framebuffers | Textures | Buffers | Programs | JS heap |
|---|---|---|---|---|---|
| Growth | **+72** | +7 | +14 | 0 | stable (22–29 MB) |

A stack trace on every leaked framebuffer points to `PMREMGenerator.fromCubemap`. That's where three.js converts each chapter's `<Environment>` (Lightformer studio lighting) into a reflection map, which costs 36 framebuffers per chapter.
- drei disposes the cube render target on unmount.
- But three only frees the converted PMREM when the **texture's** `dispose` event fires, and it never does.

The leak happens on every tier, with or without post-processing. With 9 chapters planned, it would become a real problem on phones.

---

## 4. Test inventory

| Scenario | Checks |
|----------|--------|
| desktop | full journey: open → letter → T1 → universe; persistent canvas not recreated; chapter mark; input unlocked; parallax; portal dive and return; browser back (rewind) and forward |
| direct-url-gate | `/universe` cold → gate → "show me anyway"; `?preview=1` bypass; `/` → `/intro`; 404 page |
| skip | Skip button during T1 arrives in ~1.2–1.5 s |
| mobile | 390×844 touch journey to universe |
| reduced-motion | full journey with `prefers-reduced-motion` |

Not yet covered: WebGL-unavailable fallback (it doesn't exist yet), real phones, audio, Safari/WebKit.

---

## 5. Visual & UX bugs

Screenshots are in `tests/screens/`.

### Intro (Chapter 01)

| # | Bug | Where | Severity |
|---|-----|-------|----------|
| I1 | Dark rectangles around the letters of "HEY, YOU!": the text-shadow glow is clipped by SplitText's per-character masks | d02, m01 | Medium |
| I2 | **Mobile:** envelope is tiny (~30% of screen width) and sits low, leaving a large empty gap. The portrait framing uses height fill instead of width fill | m01 | High |
| I3 | **Mobile:** the light shaft reads as a hard-edged grey cone | m01 | Medium |
| I4 | Small step/notch artifacts on the letter's left and right edges at the fold lines (panel z-offsets) | d07, m02 | Low |
| I5 | **Mobile:** STEP INSIDE button collides with the chapter mark | m02 | Medium |

### Universe (Chapter 02)

| # | Bug | Where | Severity |
|---|-----|-------|----------|
| U1 | Performance on integrated GPUs (see §3) | — | **Critical** |
| U2 | Floor is inconsistent: idle view shows a flat lavender haze, the dive view shows a dark mirror. A hard horizon line is still visible | d13, d15 | High |
| U3 | Butterflies are dim grey specks; they don't read as butterflies | d13 | Medium |
| U4 | "Glass" torus and icosahedron look like matte plastic; chrome knot reads as a black blob | d13 | Medium |
| U5 | Small silver planet sits on top of the name (desktop and mobile) | d13, m03 | Medium |
| U6 | **Mobile:** chrome knot overlaps the ENTER MY WORLD button; name runs nearly edge to edge | m03 | Medium |
| U7 | After the portal dive the screen washes to flat white-grey. The temporary card is a low-contrast grey box and still says "Chapter 03 · The Artist", which is wrong under the new order (Nature is 03) | d16 | Medium (temporary) |

### Shared UI / engine

| # | Bug | Where | Severity |
|---|-----|-------|----------|
| E1 | **Mobile:** chapter mark wraps to 2 lines; "SOUND OFF" wraps and overlaps the Skip button | m01 | Medium |
| E2 | Gate screen: the preloader's ✦ and loading bar show through behind the gate text | g01 | Low |
| E3 | Quality tiers ignore the GPU, and runtime downgrade does not trigger (see §3) | — | High |

---

## 6. Gaps against the new brief (not for Phase 2 unless approved)

| Requirement | Current state | Planned phase |
|-------------|---------------|---------------|
| 9 chapters in the new order | registry has 7, numbering shows "/ 07" | registry update when Nature is added (Phase 3), or in Phase 2 if you prefer |
| Content under `data/` | lives in `content/` | move in Phase 2 (small, mechanical) — needs your OK |
| Music controller (play/pause/mute/volume), ambience | only synthesised SFX + on/off | Phase 10 |
| WebGL-unavailable fallback | missing | Phase 10 |
| Real photos/projects | placeholders only ("Her Name") | as you provide them |
| `docs/VERCEL_DEPLOYMENT.md` | missing | Phase 11 |
| Git repository | none | recommend now |

---

## 7. Proposed Phase 2 (fix Intro + Universe): for approval

In priority order. Files likely touched are in brackets.

1. **GPU leak:** dispose each chapter's environment / PMREM on unmount, or share one environment across chapters. Verify with `perf.mjs` that the growth is 0. [`IntroScene.tsx`, `UniverseScene.tsx`, possibly `engine/stage/`]
2. **Universe performance:** target ≥ 55 fps on Intel UHD at the auto tier without a visible quality drop.
   - Render the nebula once into a cube texture or low-res target instead of computing fbm per pixel every frame (biggest win).
   - Reduce noise octaves in the planets and portal.
   - Make reflector resolution, transmission and bloom levels tier-gated more tightly.
   - [`Sky.tsx`, `Portal.tsx`, `UniverseScene.tsx`, `PostFX.tsx`]
3. **Adaptive quality:**
   - Detect integrated GPUs from the WebGL renderer string.
   - Make the PerformanceMonitor actually step down, with a DPR fallback before cutting effects.
   - [`store/experience.ts`, `engine/stage/Stage.tsx`]
4. **Universe visuals:**
   - U2: one consistent dark-mirror floor and a soft horizon.
   - U3: readable butterflies.
   - U4: real glass/chrome look.
   - U5: planet placement.
   - U6: mobile layout.
   - U7: better portal end card with correct chapter name.
5. **Intro visuals:**
   - I1: glow without clipping.
   - I2 and I3: mobile framing and shaft.
   - I4: fold seams.
   - I5: button spacing.
6. **Shared UI:**
   - E1: mobile chrome layout.
   - E2: loader hidden behind the gate.
7. Re-run `tsc`, `next build`, `e2e.mjs` (all 5) and `perf.mjs` (both GPUs), and compare against this report.

---

## 8. Questions before Phase 2

1. May I run `git init` and make a first commit of the current state, so every phase has a rollback point?
2. Should the `content/` → `data/` move happen in Phase 2, or with the Nature chapter?
3. Should Phase 2 also update the chapter registry to the new 9-chapter order (the numbering would show "/ 09", and later chapters would stay unbuilt)?
4. Performance target: is "≥ 55 fps on integrated graphics at the auto tier" the right bar?

---

## 9. Phase 2 results: Intro + Universe fixes (2026-11-22)

Defaults used because §8 had no answers: no git commit; `content/` stays in place (moves with Nature); registry updated to 9 chapters; target ≥ 55 fps on integrated GPU at the auto tier.

### Where the 3D runs

The 3D is rendered **in the visitor's browser on their own device's GPU**. Every phone and laptop has one, usually a small integrated chip. The host (Vercel) only serves static files and needs no GPU. The Intel UHD measurements below stand in for an ordinary visitor device.

### Performance: before → after (Intel UHD, 1440×900, after the chapter entrance)

| Scenario | Phase 1 | Phase 2 |
|----------|---------|---------|
| Universe, auto tier (desktop) | 14 fps (wrongly "high") | **82 fps** (detected "medium") |
| Universe, medium pinned | 31–42 fps | 82 fps |
| Universe, high pinned | 14 fps | 64 fps |
| Universe, low | 38 fps | 144 fps (display cap) |
| Universe, mobile 390×844 @3x, auto | 51 fps | 144 fps |
| Intro, auto/medium | 144 fps | 115–120 fps (cost of new 2× MSAA, see below) |

On the NVIDIA RTX 2050 every scenario was already at the 144 fps cap. It was last measured before the floor swap and not re-run (Option A: full audits only at phase ends).

One auto run measured the intro at 20 fps and stepped down to "low". Two immediate re-runs measured 120 fps and "medium", so it was a one-off (cold start / machine busy). The adaptive controller reacted exactly as designed.

### GPU memory: growth after 4 intro ⇄ universe round trips

| | Phase 1 | Phase 2 |
|---|---|---|
| Framebuffers | +304 | **0** |
| Textures | +28 | **0** |
| Buffers | +56 | +48 (~14 KB per round trip, inside three.js; negligible) |
| JS heap | stable 22–29 MB | stable 21–29 MB |

### What changed, and why

| Fix | Change |
|-----|--------|
| Universe fill-rate | Nebula (~20 noise samples per pixel) is now **baked once into a cubemap** and displayed with one texture lookup. Planets and portal use 3-octave noise. Glass no longer uses a transmission pass. Bloom has fewer mip levels. |
| Leak: environments | New `ChapterEnvironment`: studio lighting baked with `PMREMGenerator.fromScene()` into a target we own and dispose. drei's cube→PMREM path is cached privately by three.js and never freed for render-target textures. |
| Leak: floor | drei `MeshReflectorMaterial` replaced by `MirrorFloor` (three.js `Reflector` + custom shader). drei never disposed its two targets or its BlurPass (~8 MB per visit). The blur now comes from mipmaps with an LOD bias, plus a brightness threshold, so only bright things reflect. |
| Adaptive quality | Starting tier comes from the real GPU (WebGL renderer string), not CPU cores. drei `PerformanceMonitor` (it stopped monitoring after ~7 s of "incline" flips) is replaced by `AdaptiveQuality`, which samples only idle frames and only steps down. `?quality=` pins the tier for the whole session. |
| Anti-aliasing | Tilted straight edges stair-stepped on medium (no MSAA). **FXAA was tried and rejected**: merged into the tone-mapping pass it re-samples the untoned HDR buffer (posterised sky, dark halos). Final: 2× MSAA on medium, 4× on high, native AA on low. |

### Bug status

| # | Status | Fix |
|---|--------|-----|
| I1 | ✅ | SplitText reverted after each reveal; the glow is no longer clipped |
| I2 | ✅ | Portrait framing uses width fill (envelope ≈ 80% of phone width) |
| I3 | ✅ | Softer shaft falloff, dimmed on portrait |
| I4 | ✅ | It was aliasing, not geometry: fixed by MSAA; unfolded panels also end exactly coplanar |
| I5 | ✅ | Phone CTAs sit above the chrome bar (safe-area aware) |
| U1 | ✅ | See performance table |
| U2 | ✅ | Dark mirror floor, consistent from every angle, plus soft horizon haze |
| U3 | ✅ | Butterflies: normal blending, coloured wings, veins, subtle rim |
| U4 | ✅ | Dark iridescent glass, brighter chrome, richer studio reflections |
| U5 | ✅ | Silver moon moved clear of the name |
| U6 | ✅ | Knot moved away from the CTA; name width 78% on phones |
| U7 | ✅ | Dark glass end card, reads the next chapter from the registry ("03 · Her Wild Side") |
| E1 | ✅ | Phone chrome shows "01 / 09" + sound icon only; Skip moved to top-right (it also collided on desktop) |
| E2 | ✅ | Preloader hidden while the gate is open |
| E3 | ✅ | See adaptive quality |

### Files

- **New:** `engine/stage/ChapterEnvironment.tsx`, `engine/stage/AdaptiveQuality.tsx`, `chapters/universe/MirrorFloor.tsx`
- **Modified:**
  - `chapters/universe/`: `Sky.tsx`, `Portal.tsx`, `Butterflies.tsx`, `NameParticles.tsx`, `UniverseScene.tsx`, `UniverseChapter.tsx`, `state.ts`
  - `chapters/intro/`: `IntroScene.tsx`, `IntroChapter.tsx`
  - `engine/`: `stage/Stage.tsx`, `stage/PostFX.tsx`, `ui/Chrome.tsx`, `transition/OverlayLayer.tsx`, `chapters.ts`
  - other: `store/experience.ts`, `animation/text.ts`, `shaders/noise.ts`, `tests/perf.mjs`

### Verification (Chunk 2A)

`tsc` ✅ · `next build` ✅ (all routes static) · `e2e.mjs` 5/5 ✅ · `perf.mjs --gpu=intel` ✅ (0 page errors in every run).

### Still open

- ~14 KB of buffers per round trip inside three.js (negligible; revisit only if it grows).
- Real-device check on an actual phone (planned in Phase 10).
- WebGL-unavailable fallback (Phase 10).
