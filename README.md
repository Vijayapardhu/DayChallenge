# Can I Vibecode It? 🎰

A **one-day coding challenge roulette**. Pull the lever, let the reel decide, and walk away with a small, polished project you can actually ship in a single sitting with an AI coding assistant.

Live: **https://vijayapardhu.github.io/DayChallenge/**

---

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

- **Real roulette physics** — trapezoidal velocity profile (accelerate → cruise → decelerate), so the spin feels mechanical instead of springy. The reel always lands on the challenge it reports.
- **Tick sounds synced to rows** — Web Audio synthesis, with pitch and gain that shift as the wheel slows. Plus spin-start, slowdown, impact, victory, and click sounds.
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
| Styling    | Tailwind CSS v4 + a hand-written token layer |
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
  app/                 # layout, page, and the design system (globals.css)
  components/          # reel, lever, result card, panels, modal, particles…
  data/challenges.ts   # 111 curated one-day builds
  lib/
    roulette.ts        # spin physics + strip maths
    sound.ts           # Web Audio engine
    prompt.ts          # local AI build-prompt generator
    daily.ts           # deterministic daily pick
    store.tsx          # context + persistence
```

## License

MIT — take the ideas and ship something.
