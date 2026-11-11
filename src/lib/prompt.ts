import { CATEGORY_MAP } from "@/lib/types";
import type { Challenge } from "@/lib/types";
import { formatHours } from "@/lib/utils";

/**
 * Turns a stored challenge into a detailed, copy-pasteable implementation
 * brief for an AI coding assistant. Everything comes from the challenge data —
 * no API call, fully offline.
 */
export function buildAIPrompt(challenge: Challenge): string {
  const category = CATEGORY_MAP[challenge.category];
  const features = challenge.mvpFeatures
    .map((f, i) => `  ${i + 1}. ${f}`)
    .join("\n");
  const stack = challenge.techStack.map((t) => `  - ${t}`).join("\n");
  const checks = challenge.mvpFeatures
    .map((f, i) => `  - [ ] ${i + 1}. ${stripLead(f)} works end-to-end on first load.`)
    .join("\n");

  return `# Build task: ${challenge.name}

You are a senior front-end engineer. Build a small, polished, fully working web app.
This is a ONE-DAY project: the MVP must run locally within ${formatHours(
    challenge.hours,
  )} of focused work.

## Scope
- **Project:** ${challenge.name}
- **Category:** ${category.label} — ${category.blurb}
- **Difficulty:** ${challenge.difficulty}
- **Time budget:** ${formatHours(challenge.hours)} (do not gold-plate; ship the MVP)
- **One-line pitch:** ${challenge.tagline}

## What it is
${challenge.description}

## MVP features (all required)
${features}

## Suggested stack
${stack}
Use this stack unless there is a strong reason not to; if you swap a tool,
say so in one line and explain the trade-off.

## Screen & UI
- Single responsive page, mobile-first, works down to 360px and up to a desktop.
- Clear visual hierarchy: one obvious primary action, secondary controls grouped.
- Keyboard accessible: visible focus rings, sensible tab order, Escape closes overlays.
- Respect \`prefers-reduced-motion\`.
- Dark, modern look; keep it clean and consistent rather than decorative.

## Interactions & behaviour
- Every control on screen must do something real — no placeholder buttons.
- Persist any user data to localStorage (or IndexedDB for large/binary data).
- Handle empty, loading and error states explicitly.
- Guard against rapid repeated input (debounce, disable in-flight actions).

## Acceptance criteria
${checks}
  - [ ] No console errors or React warnings during a full happy-path run.
  - [ ] State survives a page reload where the data is meant to persist.
  - [ ] \`npm run build\` completes with no type errors.
  - [ ] Layout does not break at 360px width.

## Deliverables
1. Full source for every file you add or change, complete (no "// rest of code").
2. A short README section: how to run it, and the one hardest part you solved.
3. A brief note on what you deliberately left out of the MVP.

## Out of scope (do NOT build)
- Authentication, accounts or a real backend service.
- Payments, analytics, or third-party integrations that need secrets.
- Anything that needs a database server, queue or container deployment.

Start by listing the files you will create, then implement them in order.`;
}

/** "Add a thing" → "add a thing" for use inside a checklist sentence. */
function stripLead(feature: string): string {
  const cleaned = feature.replace(/\s+/g, " ").trim();
  return cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
}

/** Compact single-line summary used for sharing / clipboard fallback. */
export function buildChallengeSummary(challenge: Challenge): string {
  const category = CATEGORY_MAP[challenge.category];
  return [
    `${challenge.name} — ${challenge.tagline}`,
    `Category: ${category.label} · Difficulty: ${challenge.difficulty} · ~${formatHours(
      challenge.hours,
    )}`,
    "",
    "MVP:",
    ...challenge.mvpFeatures.map((f) => `• ${f}`),
    "",
    `Stack: ${challenge.techStack.join(", ")}`,
    challenge.stretchGoal ? `\nStretch goal: ${challenge.stretchGoal}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
