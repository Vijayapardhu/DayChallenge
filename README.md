# Can I Vibecode It?

A **one-day coding challenge roulette**. Spin the wheel, let the cards decide, and walk away with a small, polished project you can actually ship in a single sitting with an AI coding assistant.

Live: **https://vijayaapardhu.dev/DayChallenge/**

---

## Design

A **dark, minimal stage**. The screen is the roulette: a fan of cards curving away from the one in focus, a pointer above it, and a single **SPIN** button. When the reel stops, the winning project **pops up over a blurred background**.

Everything else — modes, category filters, the full library, history and the completed list — lives behind one discreet icon in the corner, so the default view stays calm.

Strictly monochrome: black, white and a few greys, hairline borders, no colour accents and no glows. Type does the work — one neutral sans for the interface, one mono for labels and numbers.

## What it is

Every idea in the wheel is scoped to **1–8 hours** of focused work with an AI assistant — no clones of Instagram/Amazon/Netflix, no queues, clusters, or auth backends. Just the kind of thing you can build, run locally, and feel good about by dinner.

Each challenge ships with:

- a category, a difficulty, and an honest time estimate
- a one-line pitch plus a short description
- a **3–6 item MVP checklist** you can tick off as you build
- a suggested tech stack
- an optional stretch goal

…and the app can turn any of them into a **detailed, copy-pasteable AI build prompt** — generated entirely locally, with no external API calls.

## Features

- **A fisheye card reel** — the card on the axis is the only one in focus; the rest shrink, dip and turn away until they fade into the background. Each project carries its **own symbol**, so the cards read as specific builds rather than categories.
- **Real roulette physics** — trapezoidal velocity profile (accelerate → cruise → decelerate), so the spin feels mechanical instead of springy. The reel always lands on the challenge it reports.
- **The result pops** over a blurred stage when the reel stops, with the full challenge one click away.
- **Tick sounds synced to the cards** — Web Audio synthesis, with pitch and gain that shift as the wheel slows. Plus spin-start, slowdown, impact, victory, and click sounds.
- **Three spin modes** — Random, Unique (skips anything you've already seen), and Daily (a deterministic pick that's the same for everyone, all day).
- **Six category filters** — All, Mini Games, App Clones, Systems, Cool Features, Experiments.
- **Spin history + completed list** — with streak stats and hours shipped.
- **Bring your own projects** — add custom challenges and they join the wheel.
- **Search** across the whole library.
- **Keyboard control** — `Space` spin · `1`–`5` filter · `0` all · `R` random · `U` unique · `D` daily · `M` mute.
- **Everything persists** in `localStorage`.
- **Accessible** — full keyboard support, visible focus rings, `aria-live` results, and a `prefers-reduced-motion` path that skips the reel animation.

## Tech stack

| Layer      | Choice                                  |
| ---------- | --------------------------------------- |
| Framework  | Next.js 16 (App Router) + React 19      |
| Language   | TypeScript                              |
| Styling    | Tailwind CSS v4 + a hand-written monochrome token layer |
| Motion     | Framer Motion                           |
| Icons      | lucide-react                            |
| Audio      | Web Audio API (no audio files)          |
| State      | React context + `localStorage`          |

The whole app is **client-side** and statically exportable — no server, no database, no secrets.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build   # production build
npm start       # serve the production build
npm run icons   # regenerate favicon.ico + apple-icon.png from src/app/icon.svg
```

## Deploying to GitHub Pages

The app exports to static HTML when `GITHUB_PAGES=true` is set, baking in the `/DayChallenge` base path so it works as a project page.

```bash
GITHUB_PAGES=true npm run build   # emits ./out
```

Pushing to `main` triggers [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds the export and publishes it with GitHub Actions Pages. The workflow needs **Settings → Pages → Source = GitHub Actions**.

## Project layout

```
src/
  app/                 # layout, page, icons, and the design system (globals.css)
  components/          # card reel, result card, panels, modal…
  data/challenges.ts   # 111 curated one-day builds
  lib/
    roulette.ts        # spin physics
    sound.ts           # Web Audio engine
    prompt.ts          # local AI build-prompt generator
    daily.ts           # deterministic daily pick
    overlays.ts        # overlay stack, so Escape closes the top layer only
    store.tsx          # context + persistence
scripts/
  generate-icons.cjs   # builds favicon.ico + apple-icon.png from icon.svg
```

## License

MIT — take the ideas and ship something.
