# HER UNIVERSE — Experience Plan

> Status: **Phase 1 draft, awaiting approval.** No code written yet.
> Repository state at inspection (2026-11-22): `e:\PU` is empty — greenfield build. Node 22.18 / npm 11.6 available.

---

## 1. Concept in one sentence

A seven-chapter interactive short film where she *is* the protagonist: she opens a secret letter, falls into a universe built for her, sees herself described as an artist, walks through her own editing studio and 3D workshop, revisits shared memories, and only at the very end learns it was all a birthday gift.

## 2. Guiding rules

1. **Every chapter is a new world.** New environment, new typeface pairing, new lighting, new interaction verb.
2. **No cut is ever hard.** Every chapter-to-chapter move is a choreographed transition with an object that *carries over* (letter light → galaxy, portal → page, portrait → lens → monitor, timeline → film tunnel, sculpture → particles → photos, photos → gift box).
3. **The birthday is a secret until Chapter 7.** No "birthday" word, cake, balloon, or date anywhere before `/surprise` — including the browser tab title and link-preview metadata.
4. **Nothing personal is invented.** Every memory, project, photo, and message comes from `content/` config. Missing items show a clearly marked placeholder, never fake content.
5. **The experience must never trap her.** Heavy 3D can degrade, transitions can be skipped, and every chapter works on a phone.

## 3. Emotional arc

```
intensity
  ▲                                                            ★ 07 finale
  │                                     ● 05 dimension        ╱
  │                       ● 04 film    ╱  ╲                  ╱
  │          ● 02 universe ╲          ╱    ╲   ● 06 memories╱
  │         ╱  ╲            ╲ ● 03   ╱      ╲ ╱  (quiet,   ╱
  │ ● 01   ╱    ╲            ╲artist╱        ╲   tender)  ╱
  │ intro ╱      ╲            (calm, editorial)          ╱
  └──────────────────────────────────────────────────────────▶ time
   curiosity  wonder    recognition  delight   awe   nostalgia  joy → tears
```

The rhythm alternates **spectacle → intimacy → spectacle → intimacy** so the big 3D moments never fatigue, and the quietest chapter (Memories) sits right before the climax so the finale lands harder.

## 4. Chapter map

| # | Route | World | Emotion | Interaction verb | Display type | Primary tech | Exit transition |
|---|-------|-------|---------|------------------|--------------|--------------|-----------------|
| 01 | `/intro` | Pitch-black void, single lavender key light, 3D envelope | Curiosity | **Open** | Cormorant Garamond italic + Space Grotesk labels | R3F (envelope rig), GSAP | T1 Envelope → Light |
| 02 | `/universe` | Violet nebula, planets, reflective floor, butterflies | Wonder | **Enter** | Bodoni Moda (name), Cormorant | R3F + shaders + postprocessing | T2 Galaxy Portal |
| 03 | `/artist` | Editorial split-screen, paper-white on midnight | Recognition | **Scroll / Discover** | Bodoni Moda oversized + Cormorant italic emphasis | DOM + GSAP ScrollTrigger + Lenis; GL plane for portrait | T3 Portrait → Lens |
| 04 | `/film` | Dark editing suite: monitors, timeline, film strips, scopes | Delight | **Scrub / Play** | Space Grotesk + Inter (tabular timecode) | DOM + GSAP + HTML5 video; light R3F for floating strips | T4 Timeline → Film Tunnel |
| 05 | `/dimension` | 3D workshop: metallic sculptures, wireframes, volumetric light | Awe | **Rotate / Toggle** | Space Grotesk wide, Inter UI | R3F heavy (gallery, materials, particles) | T5 Sculpture → Particles → Photos |
| 06 | `/memories` | Floating polaroids, warm soft light, shallow depth of field | Nostalgia | **Touch / Read** | Cormorant Garamond (letters), Inter captions | DOM gallery + R3F frames, Motion for modal | T6 Photos → Gift Box |
| 07 | `/surprise` | Darkness → gift → cake → candles → confetti | Joy | **Wish** | Bodoni Moda headline, Cormorant message | R3F (box, cake, candles, particles), GSAP master timeline, audio | — (ending) |

`/` redirects to `/intro`.

## 5. Chapter beat sheets

Timings are targets for the *default* (full-motion, desktop) path; reduced-motion variants are in §8.

### 01 — The Secret Invitation `/intro`
| t | Beat |
|---|------|
| 0.0s | Preloader: thin lavender line fills (real asset progress). Small toggle: "Sound ✕ / ♪". Hint: "best with headphones". |
| — | Black. A single lavender rim light fades up, revealing the envelope edge first, then the whole envelope floating with a slow breathing bob. |
| +1.2s | "HEY, YOU!" — character reveal, Cormorant italic, huge, slight letter-spacing collapse. |
| +2.0s | "Someone has created a little universe just for you." — word stagger, Space Grotesk small caps. |
| idle | Envelope tilts toward cursor (spring, max ±12°). A specular highlight tracks the pointer across the paper and wax seal. On touch: device-tilt (if permitted) or drag. |
| +3.0s | **OPEN** button fades in beneath (magnetic hover). |
| click | Wax seal cracks (two halves), flap rotates open on its hinge (0.9s, ease `paper`), letter slides up out of the pocket glowing from behind, letter unfolds in three panels (tri-fold, sequential hinges). |
| → | Camera dollies in until the glowing letter fills the frame → **T1**. |

Letter text (configurable, no birthday reveal): *"Close your eyes for a second. Okay, open them. Come with me."*

### 02 — Enter Her Universe `/universe`
| Beat |
|------|
| Arrives from T1 inside pure light; light breaks into thousands of stars that drift into a violet nebula. |
| Slow camera crane down to a mirror-black reflective floor. Two or three glowing planets, rings, floating abstract shapes (glass torus, chrome spheres), instanced butterflies with shader-flapped wings. |
| Her name assembles in Bodoni Moda from scattered glowing particles → solid type (text morph). |
| "WELCOME TO YOUR UNIVERSE." — mask reveal line by line. |
| Portal at the horizon: swirling shader ring, faint glimpse of warm paper-white inside. Butterflies orbit it. |
| **ENTER MY WORLD** → **T2**. |

Parallax: pointer shifts the camera rig a few degrees; scroll is disabled on this chapter (fixed viewport).

### 03 — The Artist `/artist`
| Beat |
|------|
| Arrives through the portal: the page is revealed via a circular clip-path whose radius tracks the portal edge. |
| Split screen. Left: portrait inside a tall arch mask, revealed with a vertical wipe + scale-down from 1.2. Right: "SOME PEOPLE SEE THE WORLD." / "SOME PEOPLE *create* THEIR OWN." — Bodoni oversized, "create" in animated Cormorant italic. |
| Scroll (Lenis) drives 3–4 editorial sections: name, creative identity (role tags: 3D Artist · Editor · Motion Designer — from config), personality notes, a short personal introduction written by you. Portrait mask morphs shape per section (arch → circle → tall rectangle). |
| Final section: **DISCOVER HER CREATIVE WORLD** → **T3**. |

Mobile: split stacks vertically, portrait pinned at top 45vh while text scrolls beneath.

### 04 — The Video Editor `/film`
| Beat |
|------|
| Arrives from T3 *through a camera viewfinder*: REC dot, timecode, frame guides — the viewfinder becomes the central **Program Monitor**. |
| Headline on the monitor: "SHE DOESN'T JUST EDIT VIDEOS. / SHE CREATES EXPERIENCES." typed in like a title card, with a playhead sweeping across. |
| Scroll-driven timeline (bottom third): tracks V1–V3 / A1–A2 build in, clips snap onto tracks, waveforms draw, playhead scrubs with scroll. Each clip = a project from config. |
| As the playhead crosses a clip, its preview opens in the Program Monitor (muted, inline video or poster). Side panels animate: a color-wheel/scopes visualization reacting to the clip's dominant colors, a "bin" of thumbnails. |
| Film strips drift across the background in parallax (R3F or CSS 3D). |
| Click a project card → cinematic preview: card expands to full-screen letterboxed player (Motion `layoutId`), title, role, tools, link. |
| End of timeline: **NEXT SCENE →** → **T4**. |

Visual language is *inspired by* NLE software (tracks, playhead, scopes) with original styling — no copied UI from Premiere / Resolve / Final Cut.

### 05 — The 3D Dimension `/dimension`
| Beat |
|------|
| Arrives from T4 inside a tunnel of film frames that dissolves into wireframe grid → studio space. |
| Infinite dark studio cyclorama, volumetric light shafts, a grid floor that fades into fog. |
| "IMAGINATION HAS NO DIMENSIONS." — each word appears on a different depth plane, then aligns as the camera settles (the type itself is 3D-staged). |
| Turntable gallery: 4–6 pedestals. Each holds a model (her real GLBs if supplied; otherwise procedural sculptures: displaced icosphere, chrome torus-knot, metaball blob, faceted crystal, low-poly bust placeholder). |
| Controls (bottom dock, modelling-app inspired): ◀ ▶ switch model (camera flies), **Shaded / Wireframe / Matcap / X-ray** toggle, **Turntable** on/off, environment preset switch (Studio / Sunset / Neon). Drag to orbit; on touch, one-finger orbit. |
| Creative toolkit strip: only tools set `confirmed: true` in config (Maya, Blender, etc.), with original monochrome glyphs, not trademark logos unless you provide them. |
| **KEEP GOING** → **T5**. |

### 06 — The Memory Gallery `/memories`
| Beat |
|------|
| Arrives from T5: particles have settled into photo-shaped rectangles; real images fade in; GL photos hand off to DOM polaroids. |
| "EVERY BEAUTIFUL STORY DESERVES TO BE REMEMBERED." — Cormorant, word stagger, soft. |
| Polaroids float at different depths with subtle rotation and depth-of-field blur on far ones; pointer parallax; drag/scroll to drift through. |
| Tap a photo → it flies to center and scales up (Flip), background dims & blurs, photo flips over to reveal your handwritten-style message on the back, date/place caption. Close (✕, Esc, swipe down, tap outside) returns it to its exact slot. |
| After viewing ≥ N memories (config, default: all or 3) the CTA appears: **ONE MORE THING →** → **T6**. |

### 07 — The Final Birthday Surprise `/surprise`
| t | Beat |
|---|------|
| 0 | Arrives from T6: the gift box has absorbed all light → total darkness. |
| +1.0s | "ONE LAST THING..." (Cormorant italic, slow fade, held 2s, fade). |
| +4.5s | "THIS MOMENT IS ALL YOURS." (held 2s). |
| +8.0s | Pause in silence/darkness (1.2s). Glowing gift box re-emerges from the dark, slowly rotating. |
| +10s | Ribbon unties, lid lifts and drifts away, light and particles stream up. |
| +12s | 3D cake rises out of the box on a column of particles. |
| +14s | Candles light one by one (point lights + flame shader, each with a soft *tick* SFX if sound on). |
| +16s | "HAPPY BIRTHDAY, {NAME}!" — Bodoni Moda, char reveal with glow, confetti burst (instanced). |
| +18s | Personal message reveals paragraph by paragraph (Cormorant), scrollable panel on mobile. |
| +20s | **MAKE A WISH** button. Music control visible (never autoplays). |
| click | Short beat → candles blow out one by one (flame shrinks, smoke wisps), lights dim, then the space fills with drifting golden-lavender particles. |
| end | "THE WORLD IS YOUR CANVAS. / KEEP CREATING MAGIC." — final held frame. Small "Replay from the beginning" link. |

Optional (config flag, default off): blow into the microphone to extinguish candles — requires permission, button remains the primary path.

## 6. Transition storyboards

All six are custom. Each has **exit → bridge → route swap (hidden) → enter**. Durations are full-motion targets.

| ID | From → To | Carry-over object | Storyboard | Duration |
|----|-----------|-------------------|------------|----------|
| **T1** | intro → universe | The letter's light | Letter unfolds → its back-glow intensifies (bloom ramps) → camera pushes into the paper until the frame is pure lavender-white → route swaps under the light → white "shatters" into star points → stars drift into the nebula. | ~3.0s |
| **T2** | universe → artist | The portal | Camera dollies toward portal (FOV narrows) → portal ring spins up, expands past screen edges → swirl distortion → route swaps while the ring covers the screen → artist page revealed through a circular clip-path whose radius matches the ring's last screen-space size → ring fades. | ~2.6s |
| **T3** | artist → film | Portrait → camera lens | DOM portrait swapped for an identical WebGL plane (DOM→GL handoff) → portrait shrinks into a circle, concentric lens rings and aperture blades (iris) build around it, glass reflections sweep → aperture opens → camera zooms through the glass → viewfinder HUD (REC, timecode) → route swaps → viewfinder becomes /film's Program Monitor. | ~3.0s |
| **T4** | film → dimension | The timeline | Timeline tracks stretch to full width, clips compress into frames → becomes a single film strip → strip curls around the camera into a cylinder → camera flies down the film tunnel (frames streaming by) → route swaps mid-flight → frames dissolve into wireframe edges → wireframe becomes /dimension's grid floor. | ~3.2s |
| **T5** | dimension → memories | Sculpture particles | Focused sculpture's surface sampled into ~20k points → mesh hidden, particles burst outward with curl noise → particles regroup into N rectangles at the gallery's photo positions → photo textures fade in → route swaps → GL photos hand off to DOM polaroids at identical positions. | ~3.5s |
| **T6** | memories → surprise | Photos → gift box | All polaroids lift and spiral toward center → stack and fold into the six faces of a cube → ribbon draws on (SVG/shader stroke) → box glows → glow collapses into a single point → black. Route swaps in darkness. The *same* box re-emerges later in the surprise sequence. | ~3.0s |

**Back / forward / direct entry** use two generic transitions (see PAGE_ARCHITECTURE §6):
- **R — "Rewind"** (backward history navigation): film-burn / VHS-rewind wipe, 0.9s.
- **C — "Cold open"** (direct URL / refresh): chapter's own intro plays from black, 1.2s.

## 7. Navigation model

- No navbar. Forward movement happens only through each chapter's story CTA.
- **Chapter mark** bottom-left: `03 / 07 — THE ARTIST` (tiny, Space Grotesk). Clicking opens a minimal chapter index overlay (only chapters already visited are enabled, so the finale can't be spoiled by accident). Config `navigation.enforceOrder` (default `true`).
- **Skip transition** — appears after 1.5s of any transition, also `Esc`. Required for accessibility and impatient re-visits.
- Browser back/forward works and plays transition R.
- Direct URL to a locked chapter (e.g. `/surprise` before visiting earlier ones) with `enforceOrder: true` → soft gate: "This part of the story isn't ready yet — start from the beginning?" with a "show me anyway" escape. Your own previewing can bypass via `?preview=1`.

## 8. Reduced motion, mobile and accessibility

| Concern | Strategy |
|---------|----------|
| `prefers-reduced-motion` | Camera flights → crossfades; particles counts ÷4 and slower; no parallax; transitions become 0.6s dissolves preserving the carry-over idea as a still image; text reveals become opacity fades. User-toggleable in the chapter index too. |
| Mobile (likely her primary device!) | Portrait-first layouts per chapter, DPR capped at 1.5, quality tier `low/medium`, no MeshTransmission/reflector on low, touch verbs (drag-orbit, tap, swipe-to-close). All CTAs ≥ 48px. Test on a real mid-range Android + iPhone. |
| Weak GPU / WebGL failure | Auto-downgrade via FPS monitor; if WebGL unavailable or context is lost, each chapter has a **2D fallback** (pre-rendered poster/loop video + DOM typography) so the story still flows. |
| Screen readers / keyboard | Every chapter has a visually hidden text narrative; all interactions keyboard-reachable; focus trapped in memory modal; `aria-live` for chapter changes. |
| Sound | Off by default. Toggle on intro and persistent dock. Music never autoplays; SFX play only if sound enabled. |

## 9. Secrecy & sharing details

- Tab title on chapters 1–6: "Someone made something for you". Chapter 7: "Happy Birthday, {name} ✦".
- Open Graph image/description are neutral (envelope on black) so the WhatsApp/iMessage link preview doesn't spoil it.
- Optional `unlock.at` date in config: before that date, `/intro` shows a countdown instead (default off).

## 10. Build stages (from the brief, refined)

| Stage | Deliverable | Exit criteria |
|-------|-------------|---------------|
| 0 | These four docs | **Your approval** |
| 1 | Scaffold, design system (tokens, fonts, type primitives), content config, Stage/Transition engine skeleton with a placeholder transition | Navigation between 7 stub routes via engine; back/forward/direct URL correct; no WebGL context recreated between routes |
| 2 | Chapter 01 Intro (envelope rig, letter unfold) | 60fps desktop, ≥45fps mid mobile |
| 3 | T1 + Chapter 02 Universe | T1 seamless, no flash on route swap |
| 4 | T2 + Chapter 03 Artist | Clip-path aligned to portal within 2px |
| 5 | T3 + Chapter 04 Film | Videos lazy, no jank on scrub |
| 6 | T4 + Chapter 05 Dimension | Model switch, wireframe toggle, disposal verified |
| 7 | T5 + Chapter 06 Memories | GL→DOM handoff without visible jump |
| 8 | T6 + Chapter 07 Surprise + audio | Full sequence, wish, ending |
| 9 | Performance pass, fallbacks, reduced motion | Budgets in ASSET_REQUIREMENTS met |
| 10 | Device QA + bug fixing | Checklist in PAGE_ARCHITECTURE §12 passes |

## 11. Open questions for you

1. **Her name** (and how it should appear — full name, nickname, or both?).
2. **Which tools does she actually use?** (Maya, Blender, After Effects, Premiere Pro, DaVinci Resolve — confirm each.)
3. **What content do you have now?** Portrait photo, memory photos (how many?), her video projects (files or YouTube/Vimeo/Instagram links?), her 3D work (renders, turntable videos, or actual .blend/.fbx/.glb files?).
4. **Birthday date** — and do you want the date-lock countdown?
5. **Music** — do you have a track you have the right to use, or should I plan for a royalty-free placeholder?
6. **Where will she most likely open it?** Phone or laptop? (Changes which device I tune first.)
7. **Hosting** — Vercel (recommended, free tier is fine) or somewhere else?
