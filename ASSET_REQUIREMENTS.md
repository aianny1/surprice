# HER UNIVERSE — Asset Requirements

> What every chapter needs, where it comes from, format and budget. **Status legend:** 🟢 procedural in code (no file needed) · 🟡 needs to be modelled / sourced · 🔵 **you provide** (personal) · ⚪ placeholder until provided

---

## 1. Sourcing strategy, stated honestly

- **3D objects are procedural-first.** Envelope, letter, portal, planets, butterflies, film strips, lens, sculptures, gift box, cake and candles are built in code (geometry + custom shaders + PBR materials). That keeps downloads tiny and makes every object animatable part by part, which the transitions need anyway.
- **Blender/GLB slots exist where they add real value:** (a) *her own* 3D works in the Dimension gallery, by far the most meaningful content for that chapter, and (b) an optional hero cake / envelope upgrade if you or she want to model one. I can't run Blender from here. I'll write exact modelling specs if you want a custom GLB, and the code works with or without it.
- **Lighting:** drei `<Environment>` with hand-placed `<Lightformer>`s (a procedural studio, 0 KB download) for most chapters; one or two small CC0 HDRIs from Poly Haven (1k, ≈1–2 MB → compressed) for reflections in Dimension.
- **No unrelated stock photos.** Every image is hers / yours or a neutral placeholder card.

## 2. Directory layout

```
public/
├── images/
│   ├── portrait/        portrait.jpg (+ optional portrait-alt.jpg)
│   ├── memories/        01.jpg … NN.jpg
│   ├── projects/        film-*.jpg posters, model-*.jpg renders
│   └── og/              og-neutral.jpg (spoiler-free link preview), og-surprise.jpg
├── videos/
│   ├── projects/        film-*.mp4 / film-*.webm (short preview loops)
│   └── fallback/        ch02-loop.mp4, ch05-loop.mp4 … (2D fallback for no-WebGL)
├── models/
│   ├── her/             her own works, optimized .glb
│   └── scene/           optional custom envelope.glb / cake.glb
├── textures/
│   ├── hdri/            studio_1k.hdr (or .ktx2/.exr)
│   ├── matcaps/         3–4 matcaps (Dimension shading toggle)
│   ├── paper/           paper-fiber.ktx2 (letter/envelope/polaroid grain)
│   └── noise/           blue-noise.png, perlin.png
├── audio/
│   ├── music/           theme.mp3 (+ .ogg)
│   └── sfx/             seal-crack, paper-unfold, whoosh, portal, shutter, film-reel, shimmer, candle-light, blow-out, chime
└── fonts/               (empty unless a non-Google font is added)
```

## 3. Personal content checklist (from you)

| # | Item | Used in | Format / spec | Status |
|---|------|---------|---------------|--------|
| P1 | Her name (display + short) | 02, 03, 07, tab title | text | ⚪ |
| P2 | Birthday date | 07, optional date-lock | ISO date | ⚪ |
| P3 | Portrait photo | 03 (and T3 lens) | JPG, ≥ 1600px tall, portrait 4:5 or 3:4, good light, plain-ish background | 🔵 |
| P4 | Creative identity tags + 3–5 personality notes | 03 | text | 🔵 |
| P5 | Personal introduction (your words) | 03 | 60–120 words | 🔵 |
| P6 | Confirmed tool list | 05 | which of Maya / Blender / AE / Premiere / Resolve | 🔵 |
| P7 | Video projects (3–6) | 04 | title, year, role, tools, + one of: MP4 file, or YouTube/Vimeo/Instagram link; poster frame | 🔵 |
| P8 | 3D works (3–6) | 05 | best: .glb/.fbx/.obj/.blend exports; acceptable: renders (PNG) or turntable videos | 🔵 |
| P9 | Memory photos (6–12 recommended) | 06, T5, T6 | JPG/HEIC from phone is fine — I'll convert | 🔵 |
| P10 | Message for each memory | 06 | 1–4 sentences each, date + place optional | 🔵 |
| P11 | Envelope letter text | 01 | short, no birthday spoiler | default provided, editable |
| P12 | Birthday message | 07 | default from brief, editable | default provided |
| P13 | Final wish message | 07 | 1–3 lines | default provided |
| P14 | Music track | 07 (+ optional ambient) | MP3, a track you have the right to use; otherwise CC0/royalty-free placeholder | 🔵 / 🟡 |
| P15 | Social links | 03 / 07 end | URLs | 🔵 optional |

## 4. Per-chapter asset inventory

### 01 Intro
| Asset | Source | Spec | Status |
|-------|--------|------|--------|
| Envelope (body, flap, pocket, wax seal halves) | Procedural (planes + extruded seal, hinge pivots) | < 5k tris, paper normal from noise | 🟢 |
| Letter (3 hinged panels) | Procedural | per-panel pivot, text via troika/drei `<Text>` | 🟢 |
| Paper fiber texture | Generated in code or CC0 | 512² KTX2 | 🟢/🟡 |
| SFX: seal crack, paper unfold, soft whoosh | CC0 (freesound/pixabay, checked license) | OGG+MP3, < 40 KB each | 🟡 |

### 02 Universe
| Asset | Source | Spec | Status |
|-------|--------|------|--------|
| Nebula / starfield | Shader (fbm noise) + Points | 20k stars high / 6k low | 🟢 |
| Planets (3) with atmospheres, ring | Procedural spheres + fresnel/noise shaders | — | 🟢 |
| Reflective floor | drei `MeshReflectorMaterial` (high/med), fake gradient (low) | — | 🟢 |
| Butterflies | Instanced quads, wing shape via alpha SDF, flap in vertex shader | 40 high / 12 low | 🟢 |
| Abstract floaters (glass torus, chrome spheres) | Procedural, `MeshTransmissionMaterial` on high only | — | 🟢 |
| Portal | Shader ring + distortion | — | 🟢 |
| Name particles | Sampled from text geometry | 6k points | 🟢 |

### 03 Artist
| Asset | Source | Spec | Status |
|-------|--------|------|--------|
| Portrait | You (P3) | AVIF/WebP via next/image, 1200/1800/2400w | 🔵 |
| Mask shapes (arch, circle, rect) | SVG / clip-path | — | 🟢 |
| Lens rig for T3 (rings, iris blades, glass) | Procedural | 7–9 blades | 🟢 |

### 04 Film
| Asset | Source | Spec | Status |
|-------|--------|------|--------|
| Project preview clips | You (P7) | 10–20s loops, 1280×720 (or 720×1280 for vertical), H.264 MP4 CRF 26 + VP9 WebM, no audio track, ≤ 3 MB each | 🔵 |
| Project posters | First frame or chosen frame | 1280w AVIF/WebP | 🔵 |
| Timeline / tracks / scopes / colour wheels | DOM + SVG + canvas2D | original design | 🟢 |
| Film strips | CSS 3D or R3F planes with poster textures | — | 🟢 |
| SFX: shutter, film reel tick | CC0 | < 40 KB | 🟡 |

### 05 Dimension
| Asset | Source | Spec | Status |
|-------|--------|------|--------|
| Her models | You (P8) → optimized | ≤ 150k tris each after decimation, ≤ 4 MB per GLB, 1k–2k KTX2 textures | 🔵 |
| Procedural sculptures (fallback + extras) | Code: displaced icosphere, torus knot, metaballs (drei MarchingCubes), faceted crystal, abstract bust-ish form | — | 🟢 |
| HDRI studio | Poly Haven CC0, 1k | ≤ 1.5 MB | 🟡 |
| Matcaps (clay, chrome, pearl, lavender) | CC0 matcap set or generated | 256² each | 🟡 |
| Tool glyphs | Original monochrome glyphs; official logos only if you supply them and are fine with trademark use | SVG | 🟢 |
| Volumetric light shafts | Cone meshes with additive fresnel/noise shader | — | 🟢 |

### 06 Memories
| Asset | Source | Spec | Status |
|-------|--------|------|--------|
| Memory photos | You (P9) | Longest edge 2000px, AVIF/WebP + JPG fallback; 512px KTX2/WebP texture versions for GL particle/photo planes | 🔵 |
| Polaroid frame | CSS (DOM) + procedural plane (GL) | paper texture shared with 01 | 🟢 |

### 07 Surprise
| Asset | Source | Spec | Status |
|-------|--------|------|--------|
| Gift box + lid + ribbon | Procedural (rounded boxes, ribbon as tube along curve) | < 8k tris | 🟢 |
| Birthday cake | Procedural layered cylinders with drip shader + frosting displacement; **optional Blender GLB upgrade** | < 30k tris | 🟢 (🟡 optional) |
| Candles + flames | Procedural cylinders + flame billboard shader + point lights (lights capped at 3 real, rest emissive fake) | count = config | 🟢 |
| Confetti | InstancedMesh, physics-lite in shader | 1500 high / 400 low | 🟢 |
| Smoke wisps (blow-out) | Billboard shader | — | 🟢 |
| Music | You (P14) or royalty-free | 128–160 kbps MP3 + OGG, ≤ 5 MB, loop-friendly or full song | 🔵/🟡 |
| SFX: shimmer, candle light, blow-out, chime | CC0 | < 60 KB each | 🟡 |

### Transitions
| Asset | Source | Status |
|-------|--------|--------|
| T1–T6, R, C visuals | Shaders + reused chapter assets | 🟢 |
| Whoosh / portal hum / reel spin SFX | CC0 | 🟡 |

### 2D fallbacks (no WebGL)
| Asset | Source | Status |
|-------|--------|--------|
| 4–6 s seamless loops of chapters 01, 02, 05, 07 | Recorded from the finished WebGL build (screen capture → ffmpeg) | produced in Stage 9 |

## 5. Budgets

| Chapter | JS (gz, chapter chunk) | Assets on enter | Notes |
|---------|------------------------|-----------------|-------|
| Shared (framework + three + R3F + GSAP + Motion) | ≈ 350–420 KB | fonts ≈ 120 KB | three.js is ≈ 150 KB gz on its own |
| 01 Intro | ≤ 60 KB | ≤ 0.5 MB | must be interactive < 3s on 4G |
| 02 Universe | ≤ 80 KB | ≤ 1 MB | preloaded during 01 |
| 03 Artist | ≤ 40 KB | portrait ≤ 400 KB | |
| 04 Film | ≤ 60 KB | posters ≤ 1.5 MB; videos lazy | |
| 05 Dimension | ≤ 90 KB | ≤ 8 MB with her models (lazy per model) | first model only on enter |
| 06 Memories | ≤ 50 KB | photos ≤ 3 MB (progressive) | |
| 07 Surprise | ≤ 70 KB | ≤ 1 MB + music on demand | music loads only after play pressed |

Runtime targets: 60 fps desktop (high), ≥ 45 fps mid-range phone (medium/low), GPU memory flat after three full loops.

## 6. Optimization pipeline (scripts/)

```bash
# Models: meshopt + KTX2 textures + quantization
npx @gltf-transform/cli optimize in.glb out.glb --compress meshopt --texture-compress ktx2 --texture-size 2048
# Simplify heavy sculpts first if needed
npx @gltf-transform/cli simplify in.glb out.glb --ratio 0.5 --error 0.001

# Video preview loops (requires ffmpeg)
ffmpeg -i src.mov -t 15 -vf "scale=1280:-2,fps=30" -an -c:v libx264 -crf 26 -preset slow -movflags +faststart out.mp4
ffmpeg -i src.mov -t 15 -vf "scale=1280:-2,fps=30" -an -c:v libvpx-vp9 -crf 34 -b:v 0 out.webm
ffmpeg -i out.mp4 -vframes 1 -q:v 3 poster.jpg

# Photos: handled by next/image at runtime; GL textures pre-generated with sharp (scripts/make-textures.ts)
```

Model export guidance for her files (if you can ask without spoiling the surprise, or pick from what she has already shared): Blender → File › Export › glTF 2.0 (.glb), apply modifiers, +Y up, include materials; Maya → FBX, which I convert via Blender or `fbx2gltf`.

## 7. Licensing log

Every third-party asset (HDRI, matcap, SFX, music) gets a row in `public/CREDITS.md` with source URL and license (CC0 preferred). No unlicensed music, no trademark logos without your OK.
