"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { CATEGORIES } from "@/lib/types";
import type { CategoryId, Challenge, Difficulty } from "@/lib/types";
import { cn, uid } from "@/lib/utils";

const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard"];

interface CustomChallengeFormProps {
  open: boolean;
  onClose: () => void;
  onAdd: (challenge: Challenge) => void;
}

interface Draft {
  name: string;
  category: CategoryId;
  difficulty: Difficulty;
  hours: string;
  tagline: string;
  description: string;
  features: string;
  tech: string;
  stretch: string;
}

const EMPTY: Draft = {
  name: "",
  category: "mini-games",
  difficulty: "Easy",
  hours: "2",
  tagline: "",
  description: "",
  features: "",
  tech: "",
  stretch: "",
};

export function CustomChallengeForm({
  open,
  onClose,
  onAdd,
}: CustomChallengeFormProps) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    const tagline = draft.tagline.trim();
    if (name.length < 2) {
      setError("Give the project a name.");
      return;
    }
    if (tagline.length < 4) {
      setError("Add a one-line pitch.");
      return;
    }
    const features = draft.features
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean)
      .slice(0, 6);
    if (features.length === 0) {
      setError("List at least one MVP feature (one per line).");
      return;
    }
    const hours = Math.min(8, Math.max(0.5, Number(draft.hours) || 2));
    const tech = draft.tech
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);

    onAdd({
      id: uid("custom"),
      name,
      category: draft.category,
      difficulty: draft.difficulty,
      hours,
      tagline,
      description: draft.description.trim() || tagline,
      mvpFeatures: features,
      techStack: tech.length > 0 ? tech : ["Your choice"],
      stretchGoal: draft.stretch.trim() || undefined,
      custom: true,
    });

    setDraft(EMPTY);
    setError(null);
    onClose();
  };

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.form
          className="custom-form"
          onSubmit={submit}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="custom-form-inner">
            <div className="custom-form-head">
              <h3 className="panel-subtitle">
                <Plus className="size-4" /> Add your own project
              </h3>
              <button
                type="button"
                className="icon-button"
                onClick={onClose}
                aria-label="Close custom project form"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="field-grid">
              <label className="field">
                <span className="field-label">Project name</span>
                <input
                  className="field-input"
                  value={draft.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Pomodoro Garden"
                  maxLength={60}
                />
              </label>

              <label className="field">
                <span className="field-label">One-line pitch</span>
                <input
                  className="field-input"
                  value={draft.tagline}
                  onChange={(e) => set("tagline", e.target.value)}
                  placeholder="Grow a plant while you focus"
                  maxLength={90}
                />
              </label>

              <label className="field">
                <span className="field-label">Category</span>
                <select
                  className="field-input"
                  value={draft.category}
                  onChange={(e) => set("category", e.target.value as CategoryId)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Difficulty</span>
                <select
                  className="field-input"
                  value={draft.difficulty}
                  onChange={(e) =>
                    set("difficulty", e.target.value as Difficulty)
                  }
                >
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="field-label">Hours (1–8)</span>
                <input
                  className="field-input"
                  type="number"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={draft.hours}
                  onChange={(e) => set("hours", e.target.value)}
                />
              </label>

              <label className="field">
                <span className="field-label">Tech (comma separated)</span>
                <input
                  className="field-input"
                  value={draft.tech}
                  onChange={(e) => set("tech", e.target.value)}
                  placeholder="React, Canvas, localStorage"
                />
              </label>
            </div>

            <label className="field">
              <span className="field-label">Description</span>
              <textarea
                className="field-input field-textarea"
                rows={2}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="What the user actually does with it…"
                maxLength={280}
              />
            </label>

            <label className="field">
              <span className="field-label">MVP features (one per line, max 6)</span>
              <textarea
                className="field-input field-textarea"
                rows={4}
                value={draft.features}
                onChange={(e) => set("features", e.target.value)}
                placeholder={"Start/pause a 25 minute timer\nA plant that grows per session\nStats for today"}
              />
            </label>

            <label className="field">
              <span className="field-label">Stretch goal (optional)</span>
              <input
                className="field-input"
                value={draft.stretch}
                onChange={(e) => set("stretch", e.target.value)}
                placeholder="Share your garden as an image"
                maxLength={140}
              />
            </label>

            <div className="custom-form-foot">
              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : (
                <p className="field-hint">
                  Custom projects are stored locally and join the wheel.
                </p>
              )}
              <div className="row-gap">
                <button type="button" className="btn btn-ghost" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className={cn("btn", "btn-primary")}>
                  <Plus className="size-4" />
                  Add to wheel
                </button>
              </div>
            </div>
          </div>
        </motion.form>
      ) : null}
    </AnimatePresence>
  );
}
