# HER UNIVERSE — Technical Architecture

> Companion to EXPERIENCE_PLAN.md. Defines the stack, folder layout, runtime layers, the transition engine, routing behaviour, state, content config, performance and testing.

---

## 1. Stack

Exact versions are pinned at scaffold time (latest stable of each major listed here).

| Concern | Choice | Notes |
|---------|--------|-------|
| Framework | **Next.js 16 (App Router)**, React 19, TypeScript strict | Static export-friendly; every chapter is client-rendered inside a server shell. |
| Styling | **Tailwind CSS v4** (CSS-first `@theme` tokens) | Tokens in `styles/tokens.css`, consumed by Tailwind and by JS. |
| 3D | **three**, **@react-three/fiber v9**, **@react-three/drei v10** | R3F v9 is the React-19-compatible line. |
| Post-processing | **@react-three/postprocessing** | *Addition to the brief*: bloom, DOF, vignette, film grain are what make it read as "cinematic". Tier-gated. |
| Cross-route 3D | **tunnel-rat** | Pages render 3D into one persistent `<Canvas>`. |
| Timeline animation | **GSAP 3** + ScrollTrigger, SplitText, Flip, CustomEase, `@gsap/react` (`useGSAP`) | All GSAP plugins are free since 3.13. |
| UI micro-interaction | **Motion** (`motion/react`, the renamed Framer Motion) | Buttons, dock, modal, card expand. |
| Smooth scroll | **Lenis** (`lenis/react`) | Only on scroll chapters (03, 04, 06). |
| State | **zustand** | Transition state machine, settings, progress. Readable outside React (GSAP callbacks, useFrame). |
| Content validation | **zod** | Validates `content/*.ts` at build time; fails loudly on typos. |
| Audio | Web Audio via a thin `AudioManager` (no Howler needed) | Music + SFX buses, fade in/out, mute. |
| Fonts | `next/font/google`: Cormorant Garamond, Bodoni Moda, Space Grotesk, Inter | Self-hosted at build, `display: swap`, CSS variables. |
| Testing | Playwright (flow + visual smoke), Vitest (engine/state units) | |
| Asset pipeline | `@gltf-transform/cli` (meshopt/Draco + KTX2), `ffmpeg` (video), `sharp` via next/image | Scripts in `scripts/`. |
| Hosting | Vercel (recommended) | Static + image optimization; no server needed. |

## 2. Folder structure

```
e:/PU
├── app/
│   ├── layout.tsx                 # fonts, providers, persistent layers (§3)
│   ├── page.tsx                   # redirect('/intro')
│   ├── not-found.tsx              # themed 404 → back to intro
│   ├── (chapters)/
│   │   ├── intro/page.tsx         # server shell: metadata + <IntroChapter/>
│   │   ├── universe/page.tsx
│   │   ├── artist/page.tsx
│   │   ├── film/page.tsx
│   │   ├── dimension/page.tsx
│   │   ├── memories/page.tsx
│   │   └── surprise/page.tsx
│   └── globals.css
├── chapters/                      # one module per chapter (client code)
│   ├── intro/
│   │   ├── IntroChapter.tsx       # DOM layer + registers with engine
│   │   ├── IntroScene.tsx         # 3D (rendered via tunnel)
│   │   ├── Envelope.tsx           # rig: body, flap, seal, letter panels
│   │   ├── timeline.ts            # enter/idle/exit GSAP timelines
│   │   └── manifest.ts            # assets to preload
│   ├── universe/ …  artist/ …  film/ …  dimension/ …  memories/ …  surprise/ …
├── engine/
│   ├── stage/
│   │   ├── Stage.tsx              # persistent <Canvas>, tunnel Out, quality, post FX
│   │   ├── CameraRig.tsx          # single camera, GSAP-driven targets
│   │   ├── BridgeLayer.tsx        # 3D objects that survive route swaps (T1–T6)
│   │   └── tunnel.ts              # r3f tunnel instance
│   ├── transition/
│   │   ├── TransitionManager.ts   # state machine (§5)
│   │   ├── useChapterNav.ts       # go(to) API for CTAs
│   │   ├── useChapter.ts          # chapter registration + ready signal
│   │   ├── HistoryWatcher.tsx     # back/forward + direct entry detection (§6)
│   │   ├── OverlayLayer.tsx       # DOM overlays: clip-path masks, wipes, viewfinder HUD
│   │   ├── InputLock.tsx          # pointer/scroll/keyboard lock
│   │   └── transitions/
│   │       ├── t1-envelope-light.ts
│   │       ├── t2-galaxy-portal.ts
│   │       ├── t3-portrait-lens.ts
│   │       ├── t4-film-tunnel.ts
│   │       ├── t5-sculpture-particles.ts
│   │       ├── t6-photos-giftbox.ts
│   │       ├── r-rewind.ts
│   │       └── c-cold-open.ts
│   ├── handoff/
│   │   ├── domToGL.ts             # measure DOM rect → place GL plane
│   │   └── glToDOM.ts
│   ├── loading/
│   │   ├── AssetLoader.ts         # manifest-driven preload, progress
│   │   └── Preloader.tsx
│   ├── audio/AudioManager.ts, AudioDock.tsx
│   ├── quality/QualityProvider.tsx  # tier detection + PerformanceMonitor
│   └── scroll/SmoothScroll.tsx     # Lenis ↔ ScrollTrigger bridge
├── animation/
│   ├── tokens.ts                  # durations, eases (mirrors ANIMATION_SYSTEM.md)
│   ├── gsap.ts                    # plugin registration (once), CustomEase defs
│   └── text/                      # CharReveal, WordStagger, MaskReveal, TextMorph, ItalicEmphasis
├── components/ui/                 # Button (magnetic), ChapterMark, ChapterIndex, SkipButton, Modal, ProjectCard
├── shaders/                       # portal, flame, film-burn, particles, iris, butterfly wing, paper glow
├── content/                       # ALL personal content lives here (§8)
│   ├── schema.ts
│   ├── site.ts  person.ts  projects.ts  memories.ts  messages.ts  tools.ts  audio.ts
├── store/experience.ts            # zustand store (§7)
├── lib/                           # utils: clamp, lerp, device, dispose
├── public/
│   ├── images/{portrait,memories,projects,og}/
│   ├── videos/projects/
│   ├── models/
│   ├── textures/{hdri,matcaps,noise}/
│   ├── audio/{music,sfx}/
│   └── fonts/                     # only if a non-Google font is added
├── scripts/                       # optimize-models, optimize-videos, check-content
├── tests/                         # playwright + vitest
└── EXPERIENCE_PLAN.md  PAGE_ARCHITECTURE.md  ANIMATION_SYSTEM.md  ASSET_REQUIREMENTS.md
```

**Rule:** `app/` contains only routing shells and metadata. All experience logic lives in `chapters/` and `engine/` so route files stay tiny.

## 3. Runtime layers (root layout)

Everything below lives in `app/layout.tsx`, so it **persists across route changes**. Only the page content layer is swapped by Next.js.

```
z-index ▲
  60  InputLock            transparent blocker while a transition runs
  50  OverlayLayer         DOM transition art: clip-path reveal, wipes, viewfinder HUD, skip button
  40  UI chrome            ChapterMark, AudioDock (Motion)
  30  Preloader            progress for heavy chapters
  20  Page content         ← the only thing Next.js swaps (chapter DOM: type, buttons, gallery)
  10  Stage <Canvas>       persistent WebGL: tunnel.Out + BridgeLayer + CameraRig + PostFX
   0  body background      midnight
```

Why one persistent canvas:
- Creating/destroying a WebGL context per route causes a black flash, shader recompiles and, on iOS, context-loss after a few swaps.
- Bridge objects (letter light, portal, lens, film tunnel, particles, gift box) must exist **before and after** the route swap.
- Chapters that are mostly DOM (Artist) set the stage to `frameloop="demand"` and render nothing, so the GPU idles.

```tsx
// app/layout.tsx (shape, not final code)
<html className={fontVars}>
  <body>
    <Providers>               {/* Quality, Audio, Lenis-ready, MotionConfig(reducedMotion) */}
      <Stage />               {/* fixed inset-0, pointer-events per chapter */}
      <main id="chapter">{children}</main>
      <Preloader />
      <ChapterMark /> <AudioDock />
      <OverlayLayer />
      <InputLock />
      <HistoryWatcher />
    </Providers>
  </body>
</html>
```

Each chapter page renders its DOM normally and its 3D through the tunnel:

```tsx
// chapters/universe/UniverseChapter.tsx
export function UniverseChapter() {
  const { ready } = useChapter('universe', { scroll: false, stage: 'always' });
  return (
    <>
      <tunnel.In><UniverseScene onReady={ready} /></tunnel.In>
      <UniverseTypography />
      <EnterButton />
    </>
  );
}
```

3D scene components are loaded with `next/dynamic(..., { ssr: false })` so three.js never runs on the server and each chapter's 3D is its own chunk.

## 4. Chapter module contract

Every chapter exports the same shape so the engine can treat them uniformly:

```ts
interface ChapterDefinition {
  id: ChapterId;                       // 'intro' | 'universe' | ... | 'surprise'
  route: `/${string}`;
  order: number;                       // 1..7
  title: string;                       // for ChapterMark + a11y
  scroll: boolean;                     // Lenis on/off
  stage: 'always' | 'demand' | 'off';  // canvas frameloop while active
  manifest: AssetManifest;             // what to preload (models, textures, video posters, audio)
  timelines: {
    enter(ctx: TimelineCtx): gsap.core.Timeline;   // cold-open variant uses the same
    exit?(ctx: TimelineCtx): gsap.core.Timeline;   // generic exit if a transition doesn't own it
  };
  fallback: React.ComponentType;       // 2D version when WebGL unavailable
}
```

`useChapter(id)` (called by the chapter root):
1. Registers DOM/3D refs the transitions need (e.g. `portraitEl`, `portalMesh`, `focusedSculpture`, `photoRects`).
2. Exposes `ready()`: the chapter calls it when its critical assets are loaded and the first frame has rendered.
3. Sets Lenis/frameloop according to the definition.
4. On unmount: kills its `gsap.context`, ScrollTriggers, disposes imperatively created GPU resources.

## 5. Transition engine

### 5.1 State machine

```
             go(to)                       exit done                 route committed
   ┌──────┐ ───────▶ ┌──────────┐ ───────▶ ┌──────────┐ ───────▶ ┌──────────────┐
   │ idle │          │ exiting  │          │ bridging │          │ awaitingReady│
   └──────┘ ◀─────── └──────────┘          └──────────┘          └──────┬───────┘
       ▲   unlock                                                       │ ready() or timeout
       │                ┌──────────┐                                    │
       └─────────────── │ entering │ ◀──────────────────────────────────┘
                        └──────────┘
   Any state ──skip()──▶ jump all timelines to end ──▶ idle
   Any state ──error──▶  run fallback dissolve ──▶ idle   (never strand the user)
```

### 5.2 Sequence for a forward transition (example T2)

```
CTA "ENTER MY WORLD"
  └─ useChapterNav().go('artist')               // transition resolved: registry[universe→artist] = T2
      1. store.phase = 'exiting'; InputLock on; lenis.stop()
      2. AssetLoader.ensure(artist.manifest)    // usually already preloaded during chapter 02 idle
      3. T2.exit(ctx)       → camera dolly, portal spin-up            (GSAP, Stage refs)
      4. T2.bridge(ctx)     → portal fills screen; BridgeLayer owns the ring now
         └─ router.push('/artist', { scroll: false })   // swap hidden behind the ring
      5. await chapterReady('artist') || timeout(4s → Preloader shows progress + Skip)
      6. T2.enter(ctx)      → OverlayLayer clip-path circle grows in sync with ring radius
      7. BridgeLayer clears ring; store.phase = 'idle'; InputLock off; lenis.start()
```

### 5.3 Transition definition

```ts
interface TransitionDefinition {
  id: 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'R' | 'C';
  from: ChapterId | '*';
  to: ChapterId | '*';
  sfx?: SfxId[];
  exit(ctx: TransitionCtx): gsap.core.Timeline;
  bridge(ctx: TransitionCtx): gsap.core.Timeline;  // route push happens at label 'swap'
  enter(ctx: TransitionCtx): gsap.core.Timeline;
  reduced(ctx: TransitionCtx): gsap.core.Timeline; // reduced-motion variant
}

interface TransitionCtx {
  from: ChapterHandles;      // refs registered by outgoing chapter
  to: () => ChapterHandles;  // resolved after the new chapter mounts
  camera: CameraRigApi;      // moveTo, lookAt, fov, shake
  bridge: BridgeLayerApi;    // spawn/despawn persistent 3D objects
  overlay: OverlayApi;       // clipCircle, wipe, hud
  audio: AudioApi;
  quality: QualityTier;
}
```

Resolution order: exact `from→to` match → `'*'→to` → `R` (backward) → `C` (no previous chapter).

### 5.4 Guarantees

| Guarantee | How |
|-----------|-----|
| No abrupt change | Route push only happens at the `swap` label while a bridge covers the viewport. |
| No double navigation | `go()` ignored unless `phase === 'idle'`; CTAs disabled during transitions. |
| Never stuck | Ready timeout → Preloader with progress + Skip; any thrown error → 0.6s dissolve to target, then idle. |
| Skippable | `skip()` calls `progress(1)` on active timelines, forces swap if not yet done. |
| Clean memory | Each timeline created inside `gsap.context()`; reverted on idle. BridgeLayer disposes its objects on clear. |

## 6. Routing, history and direct entry

App Router has no route-change events, so the engine owns intent:

| Case | Detection | Behaviour |
|------|-----------|-----------|
| Forward via CTA | `go()` sets `pendingTransition` *before* `router.push` | Full custom transition. |
| Back / forward button | `HistoryWatcher` sees pathname change with **no** `pendingTransition` and a previous chapter | Transition **R** (rewind wipe). If the target is a later chapter (browser forward) → **R** mirrored. |
| Direct URL / refresh | First mount, no previous chapter | Transition **C** (cold open from black) after the preloader. |
| Locked chapter with `enforceOrder` | `progress.visited` lacks prior chapters | Soft gate overlay (see EXPERIENCE_PLAN §7). `?preview=1` bypasses. |
| Unknown route | `not-found.tsx` | Themed page, button back to `/intro`. |

Progress (`visited`, `wished`) persists in `localStorage` (try/catch wrapped; missing storage just means a fresh start).

`router.push(url, { scroll: false })` everywhere; scroll is reset manually after the swap while the bridge covers the screen.

## 7. Global state (`store/experience.ts`)

```ts
interface ExperienceState {
  current: ChapterId | null;
  previous: ChapterId | null;
  phase: 'idle' | 'exiting' | 'bridging' | 'awaitingReady' | 'entering';
  pendingTransition: TransitionId | null;
  visited: ChapterId[];
  settings: { sound: boolean; music: boolean; reducedMotion: boolean | 'system' };
  quality: 'low' | 'medium' | 'high';
  loading: { chapter: ChapterId | null; progress: number };
  go(to: ChapterId): void;
  skip(): void;
}
```

zustand is used because GSAP callbacks and `useFrame` loops must read/write it without React re-renders (`useExperience.getState()`).

## 8. Content configuration

All personal content lives in `content/`, validated by zod at build (`npm run check-content` also runs in `prebuild`). No component contains personal strings.

```ts
// content/person.ts
export const person = {
  name: { display: 'Her Name', short: 'Nickname' },
  birthday: '2026-12-01',
  portrait: { src: '/images/portrait/portrait.jpg', alt: '…', focal: [0.5, 0.35] },
  identity: ['3D Artist', 'Video Editor', 'Motion Designer'],
  introduction: '…written by you…',
  personality: ['…', '…'],
  socials: [{ label: 'Instagram', href: '…' }],
};

// content/projects.ts
export const filmProjects: FilmProject[] = [{
  id: 'p1', title: '…', year: 2025, role: 'Editor, Colorist',
  tools: ['davinci-resolve'], poster: '/images/projects/p1.jpg',
  video: { mp4: '/videos/projects/p1.mp4', webm: '/videos/projects/p1.webm' } | { embed: 'https://…' },
  durationSec: 42, palette: ['#…'], placeholder: false,
}];
export const modelProjects: ModelProject[] = [{
  id: 'm1', title: '…', tool: 'blender', model: '/models/her/m1.glb' | null,
  fallback: 'crystal' /* procedural sculpture when model is null */, renders: ['…'],
}];

// content/memories.ts
export const memories: Memory[] = [{
  id: 'mem1', photo: '/images/memories/01.jpg', caption: '…', date: '…', place: '…',
  message: '…', placeholder: true,
}];

// content/tools.ts — only confirmed tools render
export const tools = [
  { id: 'maya', label: 'Autodesk Maya', confirmed: false },
  { id: 'blender', label: 'Blender', confirmed: false },
  { id: 'after-effects', label: 'Adobe After Effects', confirmed: false },
  { id: 'premiere-pro', label: 'Adobe Premiere Pro', confirmed: false },
  { id: 'davinci-resolve', label: 'DaVinci Resolve', confirmed: false },
];

// content/messages.ts — letter text, all headings, birthday message, final lines
// content/audio.ts   — music track (src, title, credit), sfx on/off defaults
// content/site.ts    — titles, OG text, navigation.enforceOrder, unlock.at, memories.requiredViews
```

Placeholders: items with `placeholder: true` render a tasteful "Add your photo here" card in dev, and a build warning lists everything still missing.

## 9. Performance architecture

| Technique | Detail |
|-----------|--------|
| Code splitting | Each chapter's 3D scene is a dynamic import; shaders imported per chapter; postprocessing loaded only for tiers that use it. |
| Next-chapter preloading | When a chapter reaches `idle`, `AssetLoader` preloads the next chapter's manifest at low priority (`requestIdleCallback`) and calls `import()` on its scene chunk. Transitions almost never wait. |
| Quality tiers | Initial tier from `navigator.hardwareConcurrency`, device memory, screen size, and a 1s GPU benchmark during the intro preloader; drei `<PerformanceMonitor>` lowers tier at runtime on sustained FPS drop. Tier controls: DPR cap (2/1.5/1), particle counts, shadow maps, postprocessing passes, transmission/reflector materials, butterfly count. |
| Single renderer | One canvas, one context; shaders pre-compiled with `gl.compile(scene, camera)` during preload to avoid first-frame hitches mid-transition. |
| Frameloop control | `always` only when the chapter has animated 3D; `demand` otherwise; `never` when tab hidden. |
| Disposal | Declarative R3F objects auto-dispose on unmount. Imperative geometries, render targets, textures (particles, sampled meshes, bridges) are tracked by a `useDisposable` helper and disposed on chapter unmount. `useGLTF.clear()` for her large models when leaving `/dimension`. |
| Models | glTF binary with meshopt compression + KTX2 textures (via gltf-transform), loaded with drei `useGLTF` + `MeshoptDecoder` + KTX2Loader. |
| Video | `preload="none"`, posters as AVIF/WebP, play only when visible (IntersectionObserver), one playing video at a time, 720p H.264 + VP9/AV1 WebM. External embeds (YouTube/Vimeo) load only on click. |
| Images | `next/image` with AVIF/WebP, explicit sizes, blur placeholders; memory photos ≤ 2000px long edge. |
| Fonts | 4 families, only needed weights/styles subset (Latin), `display: swap`, preload only intro's fonts. |
| Never block navigation | A heavy scene that fails or stalls past timeout → fallback 2D variant, CTA remains reachable. |

## 10. Error handling & fallbacks

- `WebGLGate` checks support once; if absent, chapters render `fallback` components (poster video + DOM typography) and transitions run in OverlayLayer only.
- `webglcontextlost` handler: pause, show "Re-entering the universe…", attempt restore; if not restored in 3s → fallback mode.
- React error boundary per chapter: logs, shows the chapter's fallback with a "Continue" CTA to the next chapter.
- Audio failures (decode, autoplay policy) are silent — the music button just shows disabled.

## 11. Security & privacy

- No analytics or third-party trackers by default (it's a private gift).
- Personal photos are public static files once deployed — if that matters, deploy on Vercel with password protection, or use an unguessable URL. Decide before deploying.
- No microphone access unless the optional blow-out feature is enabled, and only after a clear prompt.

## 12. Testing strategy

| Layer | Tool | Coverage |
|-------|------|----------|
| Engine unit | Vitest | State machine transitions, transition resolution (`from→to`, R, C), skip, timeout, locked-chapter gate. |
| Flow | Playwright (Chromium, WebKit, mobile emulation) | Full click-through 01→07; back button from every chapter; direct URL to every chapter (cold + locked); skip in every transition; reduced-motion run; no console errors. |
| Visual smoke | Playwright screenshots at key labels | Catch blank canvas / missing text. |
| Performance | Chrome DevTools performance trace + `r3f-perf` in dev | FPS budgets per tier, GPU memory not growing after a full loop (leak check: play 01→07 three times). |
| Real devices | Mid-range Android (Chrome), iPhone (Safari), laptop (Chrome/Safari/Firefox) | Touch verbs, notch/safe-area, audio unlock, orientation. |

### Release checklist (Stage 10)
- [ ] Every transition has no visible frame of the "wrong" page.
- [ ] Back/forward/refresh/direct URL work on every route.
- [ ] Reduced motion path works end to end.
- [ ] WebGL-disabled path works end to end.
- [ ] No placeholder content left (build warning list empty).
- [ ] Link preview shows no spoiler.
- [ ] Music never starts without a click.
- [ ] Lighthouse a11y ≥ 95 on DOM chapters.
