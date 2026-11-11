export type CategoryId =
  | "mini-games"
  | "app-clones"
  | "systems"
  | "cool-features"
  | "experiments";

export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Category {
  id: CategoryId;
  label: string;
  short: string;
  /** Tailwind-ready accent colour (hex) used for glows + chips. */
  accent: string;
  blurb: string;
}

export interface Challenge {
  id: string;
  name: string;
  category: CategoryId;
  difficulty: Difficulty;
  /** Estimated build time in hours (1–8). */
  hours: number;
  /** One-line pitch shown on the reel and cards. */
  tagline: string;
  description: string;
  /** 3–6 things that must work for the MVP to count as "done". */
  mvpFeatures: string[];
  techStack: string[];
  /** Optional. Not required to finish the challenge. */
  stretchGoal?: string;
  /** True for user-authored entries kept in localStorage. */
  custom?: boolean;
}

export interface SpinRecord {
  id: string;
  challengeId: string;
  name: string;
  category: CategoryId;
  difficulty: Difficulty;
  hours: number;
  mode: SpinMode;
  at: number;
}

export type SpinMode = "random" | "daily" | "unique";

export interface CompletedRecord {
  challengeId: string;
  name: string;
  category: CategoryId;
  at: number;
  note?: string;
}

export const CATEGORIES: Category[] = [
  {
    id: "mini-games",
    label: "Mini Games",
    short: "Games",
    accent: "#ff8a3d",
    blurb: "Playable in a browser tab, fun in 90 seconds.",
  },
  {
    id: "app-clones",
    label: "App Clones",
    short: "Clones",
    accent: "#ff5f6d",
    blurb: "The recognisable interface, built small.",
  },
  {
    id: "systems",
    label: "Systems",
    short: "Systems",
    accent: "#ffb545",
    blurb: "Tools, editors and little machines.",
  },
  {
    id: "cool-features",
    label: "Cool Features",
    short: "Features",
    accent: "#63d9c2",
    blurb: "One delightful interaction, done beautifully.",
  },
  {
    id: "experiments",
    label: "Experiments",
    short: "Labs",
    accent: "#c08bff",
    blurb: "Visual toys, simulations and generative play.",
  },
];

export const CATEGORY_MAP: Record<CategoryId, Category> = CATEGORIES.reduce(
  (acc, c) => {
    acc[c.id] = c;
    return acc;
  },
  {} as Record<CategoryId, Category>,
);

export const DIFFICULTY_ACCENT: Record<Difficulty, string> = {
  Easy: "#63d9c2",
  Medium: "#ffb545",
  Hard: "#ff5f6d",
};

export type CategoryFilter = CategoryId | "all";
