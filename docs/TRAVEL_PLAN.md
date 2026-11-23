# Chapter 04: The Wanderer (`/travel`): Design Plan

> Phase 4, Chunk 4A. **Plan only, no code.** Implementation starts after approval, one chunk at a time.

---

## 1. The idea in one sentence

She arrives inside the cloudy sky that T3 left on screen. The clouds thin out and the camera rises until the whole **Earth** turns slowly below her. She spins it, picks a place, and a small plane flies her there along a glowing arc. Each place opens as a postcard. She can also save places to her **dream list**.

Heading (appears as the globe comes into view): **"THE WORLD IS TOO BEAUTIFUL TO STAY IN ONE PLACE."**
Chapter mark: `04 / 09 · THE WANDERER`

## 2. Journey: three beats

| Beat | What she sees | Interaction |
|------|---------------|-------------|
| 1. Above the clouds | T3's sky dissolves into real 3D clouds. The camera climbs through them, and the globe appears at a high orbit in daylight. | None (about 3 s, can be skipped). Heading reveal. |
| 2. The globe | A slowly rotating Earth with clouds, ocean glint and a thin atmosphere rim. Destination markers glow. Category chips sit at the bottom. | Drag/swipe to spin (with inertia), pinch/wheel to zoom a little. Tap a chip to filter. Tap a marker to fly there. |
| 3. A destination | A plane flies along the arc from her last place to the new one, and the camera follows. The globe settles and a postcard slides in. | Read the postcard, ♥ "add to dream list", "next place", "back to globe". After at least 1 place: CTA **"TAKE OFF →"** (exit, §5). |

Without a pointer (keyboard or screen reader): the markers are also listed as buttons in the DOM layer, so every place is reachable without the globe.

## 3. Interactions (from the brief)

| Brief asks for | How it works |
|----------------|--------------|
| Interactive rotating 3D globe | Idle auto-rotate. Drag uses inertia and a damped spring. Zoom is clamped (no clipping into the ground). |
| Destination markers | Instanced glowing pins with a soft pulse ring, coloured by category. They fade out on the far side of the planet (dot product with the view direction). |
| Animated flight paths | A great-circle arc lifted above the surface (`TubeGeometry` or line with a dashed shader). It "draws" itself from start to end. |
| Airplane journey | A small plane model (procedural, a few hundred triangles) follows the arc and banks into turns, with a short contrail of particles. The camera eases along behind it. |
| Clouds, mountains, oceans | Clouds: a second sphere with alpha, rotating at its own speed, casting a faint fake shadow. Mountains: a bump/normal map from the same public-domain relief data. Oceans: a specular mask gives a sun glint on water only. |
| Postcards, destination previews | A DOM postcard (portalled to `<body>`): image or illustrated placeholder, place name, country, category, a short note, a stamp. Demo cards carry a visible **DEMO** stamp. |
| Categories | 6 chips: Mountains, Beaches, Forests, Waterfalls, Adventure, Cities. Filtering dims the other markers instead of hiding them, so the globe never looks empty. |
| Dream-destinations collection | A small "dream board" drawer: a stack of saved postcards. Saved state lives in `localStorage` (per visitor, wrapped in try/catch). Places marked `dream: true` in `data/` start in the stack. |

## 4. Making it look real, not cartoon

| Element | Technique | Source |
|---------|-----------|--------|
| Earth surface | Day colour texture, about 2048×1024, WebP (≤ 400 KB). | NASA Blue Marble (public domain) |
| Land/water mask + relief | One packed texture: R = water mask, G = height. Used for ocean glint and the bump. | NASA / NOAA (public domain) |
| Clouds | Greyscale cloud texture on a slightly bigger sphere. | NASA (public domain) |
| Atmosphere | Fresnel rim shader (blue at the edge, warm toward the sunset terminator). No full-screen effects. | Own shader |
| Lighting | One directional sun, ACES via the existing PostFX, light bloom on the markers only. | Existing engine |
| Background | Reuse Universe's baked starfield cubemap, darkened. Zero extra cost. | Existing asset |
| Arrival clouds (beat 1) | 20–40 soft camera-facing sprites with depth fade, removed once the climb ends. | Own shader |

All textures are measured before they go in (lesson from ez-tree). Total new assets target **< 1.2 MB**.

## 5. Transitions

### In: Nature → Travel (T3, already exists)
T3 ends with the `sky` overlay covering the screen. Travel's `enter('light')` starts the 3D clouds behind that overlay, so when `skyOut` fades, real clouds are already in the same place. Then the climb (beat 1) plays. `enter('fade' | 'cold' | 'reduced')` skip the climb and start on the globe.

### Out: Travel → Artist (T4, new, from the brief)
1. "TAKE OFF" launches the plane on one last long arc. The camera follows close behind it.
2. The camera drops into a cloud bank, and a new **`clouds`** overlay (DOM, layered cloud images moving at different speeds) covers the screen.
3. The clouds pull into a circle and darken at the edges, so they become a **camera lens** (aperture blades close to a circle, and a lens glint passes over).
4. The Artist chapter starts from that lens. Its own "portrait becomes a lens" exit (Phase 5) closes the loop.

Artist isn't built yet, so step 4 shows the honest "still being painted" card for now.

## 6. Performance budget (visitor's device)

Target **≥ 55 fps on Intel UHD at the auto tier**.

| Item | High | Medium | Low |
|------|------|--------|-----|
| Globe sphere segments | 128 | 96 | 64 |
| Earth texture | 4096 (only if measured OK) | 2048 | 1024 |
| Clouds layer | yes + shadow | yes | yes, no shadow |
| Markers (instanced) | all | all | all |
| Contrail particles | 400 | 200 | 80 |
| Arrival cloud sprites | 40 | 28 | 16 |
| Draw calls | < 40 | < 30 | < 20 |

The globe is one of the lightest scenes in the site. The risk is texture memory and decode time, not shaders. Textures load progressively (1024 first, then the tier's size). Everything is disposed on leave.

## 7. Personal content: `data/travel.ts`

```ts
export type TravelCategory = 'mountains' | 'beaches' | 'forests' | 'waterfalls' | 'adventure' | 'cities';

export interface Destination {
  id: string;
  name: string;          // e.g. 'Demo: Alpine Lake'
  country: string;
  lat: number; lng: number;
  category: TravelCategory;
  note: string;          // the postcard text
  photo: string | null;  // '/images/travel/<id>.webp', or null → illustrated placeholder
  status: 'visited' | 'dream';
  demo: boolean;         // true → DEMO stamp on the postcard
}

export const travel = {
  title: 'THE WANDERER',
  heading: 'THE WORLD IS TOO BEAUTIFUL TO STAY IN ONE PLACE.',
  home: { lat: 0, lng: 0, label: 'Home' },   // placeholder until you give her city
  destinations: [ /* … */ ] satisfies Destination[],
  continueLabel: 'TAKE OFF',
};
```

**Demo rule:** until you send real places, there are about 8 demo destinations (at least one per category). Every demo is `status: 'dream'` and `demo: true`, so the site never claims she went somewhere. No invented trips, no fake photos.

## 8. Files (expected)

```
data/travel.ts                          new
app/(chapters)/travel/page.tsx          new
chapters/travel/
  TravelChapter.tsx    DOM: heading, chips, postcard, dream board, CTA, accessible list, engine handles
  TravelScene.tsx      composes the scene, camera rig, beats
  state.ts             shared state (selected place, filter, progress, imperative API)
  Globe.tsx            earth + clouds + atmosphere shaders
  Markers.tsx          instanced pins
  FlightPath.tsx       great-circle arc + plane + contrail
  ArrivalClouds.tsx    beat-1 cloud sprites
  geo.ts               lat/lng → vector, great-circle maths
public/textures/travel/                 earth, mask+relief, clouds (WebP)
engine/transition/transitions.ts        + T4 (travel → artist)
engine/transition/overlay.ts            + `clouds` + lens cover
engine/chapters.ts                      travel: built = true
tests/e2e.mjs                           + travel scenario
tests/perf-travel.mjs                   new (fps + leak per tier)
```

Existing chapters, the engine and the persistent canvas stay as they are.

## 9. Chunks for Phase 4

| Chunk | Scope | You'll be able to see |
|-------|-------|------------------------|
| **4B** | `data/travel.ts` with demo places, `/travel` route, registry `built: true`, empty scene, T3 lands on it | Nature → Travel works with no cut; direct URL with `?preview=1` works |
| **4C** | Globe: textures (measured), atmosphere, clouds, ocean glint, starfield, drag/zoom | A realistic rotating Earth |
| **4D** | Markers, category chips, accessible place list | Filtering and choosing places |
| **4E** | Flight arc, plane, contrail, camera follow | The airplane journey |
| **4F** | Postcard, dream board, heading, CTA (DOM, portalled) | All interactions |
| **4G** | Arrival from T3's sky (beat 1 climb through clouds) | Nature → Travel feels like one shot |
| **4H** | T4 exit: flight → clouds → lens | Travel → (Artist placeholder) |
| **4I** | Performance + leak audit, mobile layout, reduced motion, e2e | Final numbers in §10 |

## 10. Questions for you

1. **Places:** does Megha have real visited or favourite places (name + rough location + one line)? Until then, labelled demo dream destinations are used.
2. **Home city:** should the flights start from her real city, or a neutral "Home" pin?
3. **Photos:** any travel photos for postcards? (Optional; without them, postcards use an illustrated placeholder.)
4. **Testing:** Option A, same as Phase 3.
