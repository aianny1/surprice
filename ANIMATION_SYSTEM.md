# HER UNIVERSE — Animation & Design System

> Defines who animates what, the motion tokens, typography choreography, camera grammar, colour, and reduced-motion mapping.

---

## 1. Library ownership (no two libraries on one element)

| Owner | Owns | Never touches |
|-------|------|---------------|
| **GSAP** | Chapter enter/exit timelines, all transitions (T1–T6, R, C), camera rig, shader uniform tweens, scroll-driven sequences (ScrollTrigger), text reveals (SplitText), DOM↔DOM morphs (Flip) | Elements whose hover/press state Motion controls |
| **Motion** (`motion/react`) | Buttons (hover, press, magnetic), AudioDock, ChapterIndex overlay, memory modal open/close chrome, project card expand (`layoutId`), toasts | Anything inside a GSAP timeline; anything in the canvas |
| **R3F `useFrame`** | Continuous ambient motion: idle bob, butterflies, particle simulation, turntables, flame flicker | One-off choreographed moves (those are GSAP) |
| **Lenis** | Scroll position only (03, 04, 06) | Never runs during transitions (`lenis.stop()`) |
| **CSS** | Static hover colours, focus rings, `@keyframes` for tiny loops (cursor blink, REC dot) | Choreography |

**Wrapper rule:** if an element needs both a GSAP entrance and a Motion hover, the GSAP target is the *outer wrapper*, the Motion target is the *inner element*.

**Interplay of GSAP and useFrame:** GSAP never sets `mesh.position` directly on an object that `useFrame` also moves. Instead, GSAP tweens a plain *driver* object (`{ progress, intensity, offsetY }`) and `useFrame` composes ambient + driver values. This prevents fights and makes skipping trivial.

## 2. Setup conventions

- `animation/gsap.ts` registers ScrollTrigger, SplitText, Flip, CustomEase **once** on the client and defines custom eases.
- Every component animation uses `useGSAP(() => {...}, { scope })` → auto-revert on unmount.
- Timelines use **named labels** for sync points: `'in'`, `'hold'`, `'swap'`, `'reveal'`, `'out'`. The transition engine pushes the route at `'swap'`.
- Timelines are built paused, returned to the engine, and played by it (so the engine can skip, reverse or time-scale them).
- ScrollTrigger is driven by Lenis: `lenis.on('scroll', ScrollTrigger.update)` and `gsap.ticker.add(t => lenis.raf(t * 1000))`, `gsap.ticker.lagSmoothing(0)`.
- R3F and GSAP share one clock: the Canvas runs its own rAF; GSAP's ticker drives DOM. Uniform tweens are read in `useFrame`, so both stay in sync at display refresh.

## 3. Motion tokens

### Durations (seconds)
| Token | Value | Use |
|-------|-------|-----|
| `instant` | 0.12 | Press feedback |
| `quick` | 0.25 | Hovers, small UI |
| `base` | 0.6 | UI enter/exit, modal |
| `reveal` | 1.1 | Headline reveals |
| `scene` | 1.8 | Camera moves within a chapter |
| `epic` | 3.0 | Transitions, finale beats |
| `hold` | 2.0 | Text held on screen for reading |

### Eases (CustomEase names)
| Token | Curve | Feel / use |
|-------|-------|-----------|
| `cinema` | `M0,0 C0.7,0 0.2,1 1,1` (≈ expo.inOut, softer) | Camera dollies, transitions |
| `reveal` | `power4.out` | Text and mask reveals |
| `paper` | `M0,0 C0.3,0.0 0.1,1.12 1,1` (slight overshoot) | Envelope flap, letter fold, polaroid flip |
| `drift` | `sine.inOut` | Ambient floats, breathing |
| `snap` | `back.out(1.6)` | Timeline clips snapping, toggles |
| `exit` | `power3.in` | Elements leaving |
| `spring` (Motion) | `{ type: 'spring', stiffness: 260, damping: 24 }` | Buttons, cards |

### Stagger
- Characters: `0.025s` (headline), `0.015s` (long lines)
- Words: `0.06s`
- Lines: `0.12s`
- Grid items (polaroids, clips): `{ each: 0.08, from: 'center' }`

## 4. Typography system

### Families (next/font, CSS variables)
| Var | Family | Weights / styles | Role |
|-----|--------|------------------|------|
| `--font-cormorant` | Cormorant Garamond | 300, 400, 500, italic 300/400 | Intimate voice: letters, memories, emotional lines, italic emphasis |
| `--font-bodoni` | Bodoni Moda | 400, 600, 800 (optical size axis) | Editorial monuments: her name, big statements, birthday headline |
| `--font-grotesk` | Space Grotesk | 300, 500, 700 | Technical/creative: labels, film & 3D chapters, chapter marks |
| `--font-inter` | Inter | 400, 500 (tabular nums) | UI text, captions, timecodes, buttons |

### Per-chapter pairing
| Chapter | Display | Secondary | Label/UI | Character of type |
|---------|---------|-----------|----------|-------------------|
| 01 Intro | Cormorant italic 300 | Space Grotesk 300 small caps, wide tracking | Inter | Whispered, mysterious |
| 02 Universe | Bodoni Moda 400 (name, huge, high contrast) | Cormorant 300 | Space Grotesk | Celestial, regal |
| 03 Artist | Bodoni Moda 800 oversized (clamp 5–14vw) | Cormorant italic for emphasised words | Inter | Magazine cover |
| 04 Film | Space Grotesk 700 condensed tracking | Inter tabular (timecode `00:01:24:12`) | Inter | Studio, precise |
| 05 Dimension | Space Grotesk 300 ultra-wide tracking, uppercase | Inter | Inter mono-like | Technical, spatial |
| 06 Memories | Cormorant 400 | Cormorant italic (messages) | Inter 400 small | Soft, handwritten-adjacent |
| 07 Surprise | Bodoni Moda 600 | Cormorant 300/italic | Inter | Celebratory, timeless |

### Type scale (fluid, `clamp()`)
`display-xl` 14vw→ cap 220px · `display-l` 9vw · `display-m` 5.5vw · `title` 2.4rem · `body-l` 1.35rem · `body` 1.05rem · `label` 0.72rem (+0.24em tracking)

### Text animation primitives (`animation/text/`)
| Component | Technique | Default |
|-----------|-----------|---------|
| `<CharReveal>` | SplitText chars + `mask: 'chars'`, yPercent 110→0, slight rotateX | `reveal` ease, char stagger |
| `<WordStagger>` | SplitText words, opacity + y 20 + blur 8px→0 | word stagger |
| `<MaskReveal>` | SplitText lines with line masks, yPercent 100→0 | line stagger |
| `<TextMorph>` | Two modes: (a) DOM — scramble/crossfade between strings per char; (b) GL — particles sampled from text (troika text → points) assemble into glyphs (her name in Ch.02) | |
| `<ItalicEmphasis>` | Word starts roman (Bodoni), cross-fades into Cormorant italic while a hairline underline draws in; optional `font-variation` slant where supported | Used on "create", "experiences", "yours" |

All primitives: accept `trigger` (`'mount' | 'scroll' | 'manual'`), expose a timeline to parent timelines, honour reduced motion (fade only), and keep the original text in the DOM for screen readers (`aria-label` on wrapper, split spans `aria-hidden`).

## 5. Colour system

| Token | Hex | Use |
|-------|-----|-----|
| `midnight` | `#07060B` | Base background everywhere |
| `void` | `#000000` | Intro & finale darkness |
| `violet-900` | `#1A0B2E` | Universe depths, gradients |
| `violet-600` | `#5B2A9E` | Portal, accents |
| `lavender` | `#C9B6FF` | Key light, primary accent, CTAs |
| `lavender-glow` | `#E4DAFF` | Bloom, letter light |
| `blush` | `#F4B6D2` | Soft pink, memories warmth, finale confetti |
| `silver` | `#C8CCD6` | Metallic surfaces, Dimension UI |
| `silver-dim` | `#6E7280` | Secondary text |
| `cinema-white` | `#F5F1EA` | Warm "paper" white: artist page, letter, polaroids |
| `gold-warm` | `#FFC98A` | Candle flames only (rare = precious) |

Per-chapter grading (applied via postprocessing LUT-like tint + CSS vars):
- 01: black + lavender rim · 02: violet/blush nebula · 03: cinema-white on midnight (paper) · 04: neutral grey studio + accent from current clip · 05: cold silver + lavender volumetrics · 06: warm blush haze · 07: void → gold/lavender/blush.

Contrast: all body text ≥ 4.5:1 against its actual background (checked on placeholder content and again with real photos).

## 6. Camera grammar (3D chapters)

One `CameraRig` with GSAP-tweenable targets: `position`, `lookAt`, `fov`, `roll`, `shake`, plus pointer parallax layered on top in `useFrame`.

| Shot | Move | Duration / ease | Used in |
|------|------|-----------------|---------|
| Establishing | Slow crane down + dolly in | 3–4s `cinema` | 02 arrival, 05 arrival |
| Push-in | Dolly + FOV narrow 45→30 (vertigo hint) | 1.8s `cinema` | T1, T2, T3 |
| Orbit reveal | 30–60° arc around subject | 2.5s `drift` | 05 model switch, 07 cake |
| Fly-through | Spline path (CatmullRom) | 2–3s `cinema` | T4 tunnel |
| Breathing | ±0.5% position noise | continuous | all idle states |
| Pointer parallax | ±3° yaw/pitch, lerp 0.05 | continuous | 01, 02, 05, 06 |

Camera shake only on two moments (seal crack in 01, box burst in 07) and never under reduced motion.

## 7. Shader-driven animation

Uniforms tweened by GSAP via driver objects:

| Shader | Key uniforms | Chapter |
|--------|--------------|---------|
| Paper glow (letter) | `uGlow`, `uUnfold[3]` | 01 / T1 |
| Nebula + stars | `uTime`, `uWarp`, `uBurst` | 02 / T1 |
| Portal | `uSpin`, `uRadius`, `uDistort` | 02 / T2 |
| Iris / lens | `uAperture`, `uRingProgress`, `uReflection` | T3 |
| Film tunnel | `uSpeed`, `uFrameDissolve`, `uWire` | T4 |
| Particle morph (GPGPU or vertex) | `uProgress` (mesh→burst→rect), `uCurl` | T5 |
| Butterfly wing | `uFlap`, `uPhase` (instanced) | 02 |
| Flame | `uIntensity`, `uFlicker`, `uOut` | 07 |
| Film burn (Rewind R) | `uBurn` | R |

## 8. Interaction feedback

- **Magnetic CTA:** button pulls ≤ 12px toward pointer, label offsets half that (Motion spring). On press: scale 0.96, ring ripple in lavender.
- **Custom cursor** (desktop only): small lavender dot + ring; ring morphs to context label ("OPEN", "DRAG", "VIEW", "PLAY"). Hidden on touch.
- **Hover on 3D objects:** emissive lift + cursor label, via R3F pointer events.
- **Input lock:** during transitions, a transparent `InputLock` layer swallows pointer events, Lenis stops, keyboard limited to `Esc` (skip).

## 9. Reduced-motion mapping

Detected via `prefers-reduced-motion` (and user toggle). `MotionConfig reducedMotion="user"` for Motion; a `reduced` flag in the engine for GSAP.

| Full motion | Reduced |
|-------------|---------|
| Camera flights, dollies | Cut-on-black dissolve (0.6s) |
| Char/word reveals | Opacity fade (0.4s), no movement |
| Transitions T1–T6 | `reduced()` variant: crossfade through a still of the carry-over object |
| Particle bursts | 25% count, slower, no curl turbulence |
| Parallax, shake, butterflies flutter | Off / static pose |
| Scroll-scrubbed timeline (04) | Becomes stepped (snap per clip) |
| Confetti | Gentle slow fall, 20% count |

## 10. Performance rules for animation

- Animate only `transform`, `opacity`, `clip-path`, `filter: blur` (blur sparingly, never on large areas on mobile).
- `will-change` only during an active timeline; removed on complete.
- No layout-thrashing reads inside tweens; measure once (DOM→GL handoff measures before the timeline starts).
- SplitText instances reverted after reveal completes for long passages (restores plain text, fewer nodes).
- Particles: InstancedMesh or `Points` with attribute-driven motion in shaders; zero per-frame JS allocations.
