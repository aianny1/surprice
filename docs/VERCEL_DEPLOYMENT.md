# Deploying to Vercel (Hobby, free)

The site is fully static: every route is prerendered. It has no API routes, no database, no server functions and no secrets (no `.env` files). All 3D runs on the visitor's own GPU.

## Before you deploy: personal content

| File | What to fill in |
|------|-----------------|
| `data/person.ts` | `birthday`: her real date |
| `data/memories.ts` | Real photos (put them in `public/images/memories/`) and a few lines for each. **The placeholders are visible on the live site until you replace them.** |
| `data/film.ts` | Her real projects (title, role, year, optional thumbnail) |
| `data/artist.ts` | `portrait`: optional photo path |
| `data/nature.ts` | `photo` on each stop (optional) |
| `data/travel.ts` | Set `visited: true` for places she has really been to |
| `data/surprise.ts` | The final message, written in your own words |

Keep images at about 1600 px or smaller, in WebP or JPG.

## Deploy (about 5 minutes)

1. Create a free account at vercel.com and install the CLI: `npm i -g vercel`.
2. In `e:\PU`, run `vercel`. Answer the prompts: framework Next.js, default build settings.
3. Then run `vercel --prod`.
4. **Privacy:** free Vercel has no password protection. Pick an unguessable project name, for example `her-universe-7k3q9`, so the URL can't be guessed. Share the link only with her.

You can also deploy without the CLI: push the folder to a private GitHub repo, then use "Import Project" on vercel.com.

## Checks already run (2026-11-22)

- `npx tsc --noEmit`: passes. `npx next build`: passes, 9 chapter routes plus `/`, all static.
- e2e (`tests/e2e.mjs`): desktop, direct-url-gate, skip, mobile and reduced-motion all pass.
- Chapters 04–09 smoke test (`tests/chapters.mjs`): no console errors. T4 Travel → Artist works, and the tab title says Happy Birthday only on `/surprise`.
- New assets: Earth textures, about 350 KB in total.
- Mobile layout (390×844) checked with screenshots. The finale cake moves back on portrait screens.
- No-WebGL fallback (`tests/nogl.mjs`; add `?nogl=1` to any URL to force it): all 9 chapters still show their content on a 2D gradient with no errors.

## Not done yet (skipped for the deadline)

- Background music. Only the synthesised SFX exist, and they are off by default.
- Full fps/leak audit of chapters 04–09, and a check on a real phone
- Bespoke exit transitions after Artist. Those chapters use the engine's standard fade.
