# Chapter 03: Her Wild Side (`/nature`): Design Plan

> Phase 3, Chunk 3A. **Plan only, no code.** Implementation starts after approval, one chunk at a time.

---

## 1. The idea in one sentence

She steps out of the portal into a misty forest at **dawn**. Every step deeper moves the day forward: golden morning light through the trees, a bright noon glade full of flowers and butterflies, a waterfall pool in the afternoon. She ends on a mountain overlook at **sunset**. Her walk *is* the sunrise-to-sunset transition.

Heading (appears at dawn): **"SOME SOULS FEEL MORE AT HOME IN NATURE."**
Chapter mark: `03 / 09 · HER WILD SIDE`

## 2. Journey: four stops along one camera path

The camera moves along a smooth spline through the scene. She advances by **scrolling / swiping**, which scrubs along the path. The camera eases to a gentle stop at each of the 4 stops, and each stop has something to discover.

| Stop | Place | Time of day (sun) | What she sees | Interaction |
|------|-------|-------------------|---------------|-------------|
| 1 | Forest edge | Dawn (sun just above horizon, pink-gold, thick fog) | Mountains in layered mist, first light rays, heading reveal | Scroll hint: "walk in" |
| 2 | Inside the forest | Morning → noon (warm god rays through the canopy) | Tall trees, grass and ferns moving in the wind, floating pollen | **Glowing element #1**: a light-seed in a tree hollow |
| 3 | Glade + waterfall pool | Afternoon (bright, clean light) | Flowers swaying, butterflies, waterfall with mist, **reflective water** | **Glowing element #2** on a stone by the water |
| 4 | Mountain overlook | Sunset (low orange-violet sun, long shadows) | Mountain ranges, sea of clouds, last light | **Glowing element #3**, then CTA **"FOLLOW THE BUTTERFLY →"** |

Alternatives if you prefer: an **auto-walk** with a "Continue" button at each stop (simpler on phones), or a mix (auto-walk, scroll to speed up). Recommendation: scroll/swipe, with a small "Continue" button as a fallback for anyone who doesn't scroll.

## 3. Interactions (from the brief)

| Brief asks for | How it works |
|----------------|--------------|
| Leaves react subtly to the environment | One shared **wind field** (strength, direction, gust noise) drives grass, foliage and flowers in their vertex shaders. Her pointer/finger adds a soft **local gust**: grass and leaves near the cursor bend away. |
| Butterflies fly naturally | The Universe butterfly shader is reused with new flight paths (curl-noise wandering, landing pauses on flowers) and real-world wing colours (blue, orange, white); no copying of a specific species' pattern. |
| Flowers have subtle movement | Instanced flowers sway on the same wind field, each with its own phase. |
| Camera moves through the forest | Spline path + scroll scrub (§2). Subtle head-bob and pointer parallax. |
| Clicking a glowing element reveals a message | 3 glowing light-seeds. Tap → it blooms into a small burst of light and a message card slides in (Cormorant italic). If she has a nature photo for that stop, it appears in the card. **Messages come from `data/nature.ts`; nothing is invented.** |
| Sunrise-to-sunset lighting | The sun's elevation, colour, fog colour, sky and shadow length are all functions of path progress (0 = dawn, 1 = sunset). |

## 4. Making it look real, not cartoon

| Element | Technique | Source |
|---------|-----------|--------|
| Sky + sun | three.js **physical Sky shader** (Preetham model): real dawn/noon/sunset colours from sun elevation | built into three.js, free |
| Distant mountains | 3–4 layered ridge silhouettes generated from noise, with **aerial perspective** (each layer hazier and bluer) | procedural, baked once |
| Terrain | Height-field ground with moss/soil/rock blending in the shader | procedural |
| Trees | Realistic procedural trees (bark, leaf cards, branching) from **ez-tree** (MIT, free). 3–4 variants generated once, then **instanced**; far trees as cheap billboards | `@dgreenheck/ez-tree` 1.1.0, verified on npm. Bundle impact measured before adopting; fallback is our own procedural trees |
| Grass / ferns | Instanced blades with wind in the vertex shader, colour variation, backlit translucency | procedural |
| Flowers | Instanced petal cards (canvas-painted petals), several species-like colours | procedural |
| Waterfall | Flowing-foam shader on a curved sheet + mist particles + splash ring | procedural |
| Pool water | Same leak-free mirror technique as the Universe floor (`MirrorFloor`) plus ripple distortion and a shoreline fade | reuse |
| Light rays | Volumetric cone shafts (as in the intro), aligned with the sun | reuse |
| Pollen / dust | Soft drifting particles, brighter in the sun shafts | procedural |
| Fog | Exponential fog whose colour follows the time of day | built-in |
| Colour grading | Post-processing as now; per-time-of-day bloom and vignette | existing PostFX |

**Visual identity of this chapter:**
- moss green `#3f5a3a`
- deep forest `#1d2b1f`
- dawn rose `#f2b8a2`
- golden hour `#ffc98a`
- mist blue `#b9c8d6`
- lavender kept only in the sunset sky, as a thread back to Her Universe

**Type:** Cormorant Garamond for the heading and messages (soft, organic), Space Grotesk for small labels.

## 5. Transitions

### In: Universe → Nature ("Portal → Dawn")
The existing portal dive fills the screen with warm light. In the light the route swaps to `/nature`, and the light dissolves into **dawn mist**, with the sun just rising. Same engine pattern as T1. The portal dive already exists, so only the arrival is new.

### Out: Nature → Travel (from the brief)
1. A butterfly lifts off a flower and **flies toward the camera**.
2. Its wings open until they **cover the whole screen**.
3. The wing pattern **melts into a sky with clouds**.
4. The next chapter (Travel) begins from that sky.

Travel isn't built yet, so step 4 shows the same honest "next world is still being painted" card as the Universe, until Phase 4.

## 6. Performance budget (visitor's device)

Target **≥ 55 fps on integrated graphics at the auto tier**, same as Phase 2.

| Item | High | Medium (most laptops/phones) | Low |
|------|------|------------------------------|-----|
| Grass blades | 60k | 25k | 8k |
| Trees (instanced) | ~120 | ~60 | ~30 + billboards |
| Flowers | 1,500 | 700 | 250 |
| Pollen particles | 1,500 | 800 | 300 |
| Butterflies | 18 | 10 | 6 |
| Sun shadows | 2048 map | 1024 map | none (fake contact shadow) |
| Water reflection | 512 | 256 | none (static sheen) |
| Draw calls | < 100 | < 80 | < 40 |

All heavy objects are instanced; noise-heavy things (mountains, ground textures) are baked once; every GPU resource is disposed on leave (checked with `tests/perf.mjs`).

## 7. Personal content: new `data/` folder

As the brief asks, personal content moves from `content/` to `data/` (same files, same shape). New file:

```ts
// data/nature.ts
export const nature = {
  heading: 'SOME SOULS FEEL MORE AT HOME IN NATURE.',
  stops: [
    { id: 'forest', message: '…your words…', photo: null },   // photo: '/images/nature/forest.jpg'
    { id: 'water',  message: '…your words…', photo: null },
    { id: 'summit', message: '…your words…', photo: null },
  ],
  continueLabel: 'FOLLOW THE BUTTERFLY',
};
```

Until you write the 3 messages, they show gentle **placeholder** lines clearly marked as placeholders. No made-up memories.

## 8. Files (expected)

```
data/                      person.ts, messages.ts, site.ts (moved), nature.ts (new)
app/(chapters)/nature/page.tsx
chapters/nature/
  NatureChapter.tsx        DOM: heading, message cards, scroll hint, CTA, handles for the engine
  NatureScene.tsx          composes the scene, camera path, time-of-day
  state.ts                 shared uniforms (time of day, wind, progress)
  SkyAndSun.tsx            physical sky + sun + fog colour
  Mountains.tsx            layered ridges
  Terrain.tsx              ground
  Forest.tsx               ez-tree variants, instancing, billboards
  Grass.tsx, Flowers.tsx   instanced, wind-driven
  Waterfall.tsx, Pool.tsx
  LightSeeds.tsx           the 3 glowing elements
  NatureButterflies.tsx    reuse of the butterfly shader
engine/transition/transitions.ts   + "Portal → Dawn" in, + "Butterfly → Sky" out
engine/chapters.ts                 nature: built = true
```

Existing chapters, the transition engine and the canvas stay as they are; only new transitions are added.

## 9. Chunks for Phase 3

| Chunk | Scope | You'll be able to see |
|-------|-------|------------------------|
| **3B** | Move `content/` → `data/`; `/nature` route + registry; Universe portal leads to Nature with a simple fade | Clicking ENTER MY WORLD lands on a (still empty) Nature page; back, forward and direct URL work |
| **3C** | Sky + sun + time-of-day system, terrain, mountains, fog, camera path with scroll | Walk through an empty landscape from dawn to sunset |
| **3D** | Forest: trees (ez-tree, after measuring), grass, wind, pointer gust | The forest itself |
| **3E** | Waterfall, pool, flowers, butterflies, pollen, light rays | The full environment |
| **3F** | Glowing elements, message cards, heading, CTA (DOM layer) | All interactions |
| **3G** | Arrival transition "Portal → Dawn" | Universe → Nature without a cut |
| **3H** | Exit transition "Butterfly → Sky" | The butterfly transition |
| **3I** | Performance pass + tests, mobile layout | Final numbers |

## 10. Questions for you

1. **Walking:** scroll/swipe with stops (recommended), or auto-walk with a "Continue" button?
2. **Messages:** will you write the 3 nature messages (one per glowing element), or should I start with clearly-marked placeholders?
3. **Photos:** does she have nature photos you want to show inside the message cards? (Optional; the chapter works without them.)
4. **Testing per chunk:** Option A (fast: type check + build + one short test, full audit at the end of the phase) or Option B (everything every chunk)?

---

## 11. Phase 3 results (built, 2026-11-22)

**Status:** Chunks 3B–3I done. The chapter is complete apart from the real Travel chapter behind the butterfly (Phase 4).

### Changes from this plan
- **Trees are our own procedural conifers, not ez-tree.** ez-tree's bundle measured **4 MB** (20 textures embedded as base64), about 50× the chapter budget.
- **The sky is hand-graded per stop** instead of three.js's physical Sky, so its colours stay predictable under our bloom/ACES pipeline.
- **Walking defaults:** scroll/swipe with magnetic stops, plus a Continue button.

### What she can do
- Walk dawn → forest → pool → summit (scroll, swipe, keys or Continue).
- Push grass, flowers and leaves aside with her pointer or finger (verified visually).
- Open 3 light-seeds (in 3D, or with the "Open the light" button) to read the messages in `data/nature.ts`.
- Leave with **Follow the butterfly**. Until Travel exists, this shows an honest card, and "Stay for the sunset" plays the transition backwards.

### Transitions added to the engine
- **T2 Portal → Dawn** (universe → nature): the dive into the portal becomes a warm light, which becomes morning mist.
- **T3 Butterfly → Sky** (nature → travel): the butterfly flies at the lens and its wings become a cloudy sky.

### Performance (headless Chrome, 1440×900, after the camera settles at each stop)

| GPU / tier | Dawn | Forest | Pool | Summit | Draw calls |
|---|---|---|---|---|---|
| Intel UHD, auto → medium | 69 | 64 | 64 | 75 | 41–75 |
| Intel UHD, low | 144 | 144 | 144 | 142 | 23–32 |
| Intel UHD, high (pinned) | 53 | 46 | 52 | 65 | 45–79 |
| RTX 2050, auto → high | 144 | 144 | 144 | 144 | 45–79 |

**GPU memory after 3 Universe ⇄ Nature round trips:** textures 0, framebuffers 0, programs 0. Buffers grew by +18, the known ~14 KB inside three.js. JS heap stays 22–36 MB.

### Bugs found and fixed during Phase 3
- **Engine:** chapters calling `go()` from `contextSafe` recorded transition tweens in the outgoing chapter's GSAP context, so the cover vanished mid-route-change. `go()` now leaves that scope first.
- **Nature:** an adaptive quality downgrade mid-walk re-ran the chapter setup and reset the walk to dawn. Setup now runs once; only shadows follow the tier.
- **Adaptive quality** is now patient: about 4.5 s of sustained low fps, a 2 s grace after each arrival, and hidden tabs ignored.
- Smaller fixes:
  - coming-soon card hidden under overlays (now portalled to `<body>`)
  - waterfall lip line (lip stone)
  - reflection stair-steps (384 px + two samples)
  - low-tier water looking like sand
  - seed placement and hint contrast

### Still open
- **Photos:** none yet. Each card shows a photo once `photo` is set in `data/nature.ts`.
- **Real-device check:** Phase 10.
- **WebGL fallback:** Phase 10.
