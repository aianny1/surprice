# HER UNIVERSE: continue the project (handoff prompt)

You are continuing an existing, working project. **Do not restart it, rebuild it, or replace working parts.**
First read the repository and these docs: `docs/PHASE1_AUDIT.md`, `docs/NATURE_PLAN.md`, `PAGE_ARCHITECTURE.md`, `ANIMATION_SYSTEM.md`, `EXPERIENCE_PLAN.md`, `ASSET_REQUIREMENTS.md`.

## The project

A cinematic, interactive 3D birthday website for **Megha**, the user's best friend. The friendship is strictly platonic: no romantic tone anywhere.

- She is a creative artist (Blender, Autodesk Maya, Premiere Pro, After Effects, DaVinci Resolve, Photoshop) who loves nature and travel.
- Every page is a chapter with its own world, connected by choreographed transitions (no hard cuts, no navbar).
- The birthday is a **secret until the last chapter**: no "birthday" word, cake or date before `/surprise`. The tab title stays neutral.
- **Never invent real memories, places she has visited, or photos.** Use clearly labelled demo or placeholder content until the user provides real content.
- Personal text is written as a friend: warm, a little funny, and specific to her craft. For prose, use the `/humanizer` skill if it is available.

The user writes in Hinglish (Hindi + English). Reply in Hinglish, simple and clear.

## Stack (installed, pinned)

- Next.js 16.4.6 (App Router), React 19.3, **TypeScript 5.9.3** (do not upgrade to TS 7: Next's type-check needs the JS API), Tailwind v4.
- three 0.187, @react-three/fiber 9, @react-three/drei 10, @react-three/postprocessing 3, GSAP 3.15 (+ @gsap/react), motion 14, zustand 5.
- playwright-core (tests drive the installed Chrome).
- The project lives at `e:\PU` on Windows. npm on this network is very slow (single installs can take minutes).

## Architecture (what exists)

- **`engine/stage/Stage.tsx`:** one persistent WebGL `<Canvas>` in the root layout. Chapters render 3D through `SceneIn`/`SceneOut` (`engine/stage/tunnel.tsx`).
- **`engine/stage/`:**
  - `CameraRig`: GSAP tweens `rig.position` / `rig.target` / `rig.fov`.
  - `PostFX`: bloom, chromatic aberration, grain, vignette, ACES tone mapping; MSAA 4× high, 2× medium.
  - `AdaptiveQuality`: steps the tier down only, after about 4.5 s of sustained low fps.
  - `ChapterEnvironment`: leak-free studio reflections via `PMREMGenerator.fromScene`.
  - `useSceneReady`: tells the engine a chapter has compiled and rendered.
- **`engine/transition/`:**
  - `manager.ts`: `go(to)`, ready signalling, skip, history (rewind), cold open, direct-URL gate with `?preview=1` bypass.
  - `transitions.ts`: T1 envelope→light (intro→universe), T2 portal→dawn (universe→nature), T3 butterfly→sky (nature→travel), plus generic fade, cold, rewind and reduced.
  - `overlay.ts` / `OverlayLayer.tsx`: DOM covers (`light`, `dawn`, `sky`, `dark`, loader), skip button, input lock, gate.
- **`engine/chapters.ts`:** registry of 9 chapters in order: intro, universe, nature, travel, artist, film, dimension, memories, surprise (titled "One Last Thing", so nothing spoils it). A chapter with `built: false` shows an honest "still being painted" card when reached.
- **Chapter module pattern** (see `chapters/nature/`):
  - `XChapter.tsx` is the DOM layer. It calls `registerHandles(id, { enter(mode), exits: {...} })`.
  - `XScene.tsx` is the 3D layer, loaded lazily. It exposes an imperative API via `state.ts`.
- **`store/experience.ts`:** zustand store (phase, quality, visited, sound). The quality tier comes from the real GPU (WebGL renderer string). `?quality=low|medium|high` pins it for the session.
- **`data/`:** all personal content: `person.ts` (name Megha, seal initial "M", birthday placeholder), `messages.ts`, `site.ts`, `nature.ts`.
- **`engine/audio/AudioManager.ts`:** synthesised SFX only, off by default. There is no music yet.

## Done

- **Phase 1:** audit.
- **Phase 2:** fixed Intro and Universe.
  - Universe went from 14 to about 80 fps on Intel: the nebula is baked into a cubemap.
  - GPU leaks fixed: drei Environment replaced by `ChapterEnvironment`; drei MeshReflectorMaterial replaced by `MirrorFloor` (three's `Reflector`).
- **Phase 3:** Chapter 03 `/nature` "Her Wild Side" is complete.
  - Walk dawn→sunset over 4 stops, with procedural conifers, wind-driven grass that bends at the pointer, flowers, butterflies, pollen, light shafts, waterfall and a reflective pool.
  - 3 light-seeds open message cards.
  - "Follow the butterfly" plays T3 into a sky.
  - Results are in `docs/NATURE_PLAN.md` §11.

## Remaining work, in this order

Work in **small chunks**. Each phase starts with an "A" chunk that is a plan document only.

1. **Phase 4, `/travel` "The Wanderer".** Heading: "THE WORLD IS TOO BEAUTIFUL TO STAY IN ONE PLACE."
   - Starts from T3's sky. The `sky` overlay and `T3` already exist; Travel's `enter('light')` must fade out of that sky.
   - Interactive rotating 3D globe, destination markers, animated flight paths and an airplane journey.
   - Clouds, mountains, oceans, postcards, destination previews.
   - Categories: mountains, beaches, forests, waterfalls, adventure, cities.
   - A dream-destinations collection.
   - Content in `data/travel.ts`; demo destinations clearly labelled until the user provides real ones.
   - Exit transition: flight path → camera follows → clouds cover the screen → clouds become a camera lens (T4).
2. **Phase 5, `/artist`:** editorial split screen, portrait (placeholder until a photo is provided), "SOME PEOPLE SEE THE WORLD. SOME PEOPLE CREATE THEIR OWN." Exit: portrait becomes a lens and the camera zooms in.
3. **Phase 6, `/film`:** video-editor world (timeline, monitors, film strips, project cards in `data/`), "SHE DOESN'T JUST EDIT VIDEOS. SHE CREATES EXPERIENCES." Exit: timeline becomes a film strip that wraps into 3D.
4. **Phase 7, `/dimension`:** 3D gallery (rotate, wireframe/rendered toggle, environments), toolkit from `data/` (confirmed tools only), "IMAGINATION HAS NO DIMENSIONS." Exit: sculpture → particles → photographs.
5. **Phase 8, `/memories`:** floating polaroids from `data/` (no invented memories), click to zoom and read the message, "EVERY BEAUTIFUL STORY DESERVES TO BE REMEMBERED." Exit: photos fly together into a gift box.
6. **Phase 9, `/surprise`:** dark screen, "ONE LAST THING..." → "THIS MOMENT IS ALL YOURS." → gift box opens, cake rises, candles light one by one, confetti, "HAPPY BIRTHDAY, MEGHA!" and the personal message (editable in `data/`). Then MAKE A WISH: candles go out, particles, "THE WORLD IS YOUR CANVAS. KEEP CREATING MAGIC." The tab title may say Happy Birthday only on this page. This is the emotional climax.
7. **Phase 10, polish:**
   - Global music controller (play/pause/mute/volume), ambient forest and ocean sounds. Never autoplay. Only licensed or original audio, no streaming.
   - Mobile optimisation, accessibility, reduced motion.
   - **WebGL-unavailable 2D fallback** for every chapter.
   - Real-phone check.
8. **Phase 11, Vercel Hobby (free) deployment.**
   - The site must stay static: no paid APIs, no database, no server functions, no localhost dependency.
   - Run the audit: tsc, build, asset sizes, routes, direct URLs, refresh, audio, mobile, reduced motion, WebGL failure, no secrets.
   - Write `docs/VERCEL_DEPLOYMENT.md`.
   - Privacy note: free Vercel has no password protection, so recommend an unguessable project URL.

**Other open items:**
- The user will send 1–2 photos for the Nature cards (`data/nature.ts` → `photo`).
- **No git repo yet.** Offer `git init` plus a first commit, and commit only if the user agrees.
- About 14 KB of buffers leak per round trip inside three.js. This is known and negligible.

## Working rules (the user insists on these)

1. Work in **one small chunk at a time**. Before each chunk, say what you'll do, which files are affected, and the expected result.
2. After each chunk:
   - Report what was done, files changed, test results, and remaining issues.
   - Suggest the next chunk.
   - **STOP and wait** for "start …" / "continue".
3. **Testing "Option A":** per chunk run `npx tsc --noEmit`, `npx next build`, and the e2e suite (or just the affected scenario). Run the full performance and leak audit only at the **end of each phase**.
4. Do not change unrelated code. Do not leave broken features. Keep the transition engine and the persistent canvas.
5. **Quality bar:** cinematic, realistic (not cartoon), smooth on integrated GPUs. **Target ≥ 55 fps on Intel UHD at the auto tier.** The 3D renders on the visitor's own device GPU; the host needs no GPU.

## Commands

```bash
npx tsc --noEmit
npx next build
npx next start -p 3100            # run in background; stop it before rebuilding (port 3100)
BASE_URL=http://localhost:3100 node tests/e2e.mjs [--only=desktop,mobile,skip,direct-url-gate,reduced-motion]
BASE_URL=http://localhost:3100 node tests/perf.mjs --gpu=intel|nvidia            # intro/universe fps + leak (~6 min per GPU)
BASE_URL=http://localhost:3100 node tests/perf-nature.mjs --gpu=intel --tiers=auto,medium,low,high
```

- Screenshots go to `tests/screens/`. **Always look at them**: most bugs were visual.
- Headless Chrome uses the Intel GPU by default. Add `--force_high_performance_gpu` for the RTX 2050.
- The machine is sometimes busy, which causes one-off slow runs. Re-measure before concluding anything.
- To stop the server on Windows (PowerShell): `Get-NetTCPConnection -LocalPort 3100 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`.

## Hard-won lessons (avoid repeating these bugs)

- **Never call `go()` synchronously from a GSAP `contextSafe` scope without the engine's microtask hop.** `manager.go()` already does `await Promise.resolve()` first. Don't remove it: otherwise transition tweens are recorded in the outgoing chapter's context and reverted on unmount, and the cover vanishes mid-transition.
- **Don't wrap engine timelines in a new `gsap.context` created inside another context.** It produced cyclic contexts and a "Maximum call stack" crash.
- **Overlays and modals that must sit above transition covers must be portalled to `<body>`.** `main#chapter` (z-20) is its own stacking context, so z-index inside it can never beat the z-50 overlays.
- **Chapter setup effects must not depend on `quality`.** An adaptive downgrade re-runs them and resets chapter state. Split quality-dependent bits (shadows, counts) into their own effects.
- **GPU leaks:**
  - drei `<Environment>`: use `ChapterEnvironment`.
  - drei `MeshReflectorMaterial` / BlurPass: use three's `Reflector` and call `dispose()`.
  - Always dispose imperative geometries, materials, textures and render targets on unmount.
  - three's `Reflector` **clones** the shader uniforms, so re-link shared uniforms after constructing it.
- **FXAA is rejected:** merged into the tone-mapping pass it samples untoned HDR. Use MSAA.
- **Performance:**
  - Full-screen noise shaders kill integrated GPUs. Bake expensive things once (cubemap, PMREM).
  - Instance vegetation.
  - Put heavy things the reflection doesn't need on layer 1 (`REFLECTION_EXCLUDED`).
- **Third-party 3D libraries:** measure their bundle size first. ez-tree was 4 MB of base64 textures and was rejected.
- **`ShaderMaterial`s** used for the sky, water and particles add fog via `THREE.UniformsLib.fog` plus the fog chunks.
- **`three` 0.187:** `PCFSoftShadowMap` was removed (use `PCFShadowMap`); `THREE.Clock` deprecation warnings come from R3F.
- **Editing files:** shell heredocs with JSX or quotes broke repeatedly. Write edit scripts to a file (or use the Edit tool) instead.
- **Playwright** `visible()` checks opacity, not stacking. A passing check can still be hidden under an overlay, so verify with screenshots.
- `?preview=1` bypasses the direct-URL gate for testing.

## First task in the new chat

Read the repo and docs, confirm the build and tests pass, then propose **Chunk 4A: the Travel chapter design plan** (`docs/TRAVEL_PLAN.md`, plan only, no code). Ask the user:
- Does Megha have real favourite or visited places, or should we use labelled demo destinations?
- Testing Option A (already agreed, but confirm)?

Then stop and wait for approval.
