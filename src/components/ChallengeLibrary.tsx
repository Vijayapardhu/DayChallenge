"use client";

import { useMemo, useState } from "react";
import { Clock, Package, Play, Plus, Search, Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CustomChallengeForm } from "@/components/CustomChallengeForm";
import { useApp } from "@/lib/store";
import { CATEGORY_MAP, DIFFICULTY_ACCENT } from "@/lib/types";
import type { Challenge } from "@/lib/types";
import { cn, formatHours, matchesQuery } from "@/lib/utils";

const PAGE_SIZE = 15;

interface ChallengeLibraryProps {
  onSpinChallenge: (challenge: Challenge) => void;
}

export function ChallengeLibrary({ onSpinChallenge }: ChallengeLibraryProps) {
  const { allChallenges, custom, addCustom, removeCustom, isCompleted } = useApp();
  const [query, setQuery] = useState("");
  const [onlyCustom, setOnlyCustom] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);

  const results = useMemo(() => {
    const list = onlyCustom
      ? allChallenges.filter((c) => c.custom)
      : allChallenges;
    return list.filter((c) => matchesQuery(c, query));
  }, [allChallenges, onlyCustom, query]);

  const shown = results.slice(0, visible);

  return (
    <div className="panel">
      <div className="library-bar">
        <label className="search-field">
          <Search className="size-4" aria-hidden />
          <input
            className="search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Search 100+ one-day builds…"
            aria-label="Search challenges"
          />
          {query ? (
            <button
              type="button"
              className="search-clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </label>

        <div className="library-bar-actions">
          <button
            type="button"
            className={cn("btn btn-sm", onlyCustom && "is-active")}
            aria-pressed={onlyCustom}
            onClick={() => {
              setOnlyCustom((v) => !v);
              setVisible(PAGE_SIZE);
            }}
          >
            <Package className="size-4" />
            Mine ({custom.length})
          </button>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setFormOpen((v) => !v)}
            aria-expanded={formOpen}
          >
            <Plus className="size-4" />
            Add project
          </button>
        </div>
      </div>

      <CustomChallengeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onAdd={addCustom}
      />

      <p className="library-count">
        {results.length} {results.length === 1 ? "project" : "projects"}
        {query ? ` matching “${query}”` : ""}
      </p>

      <ul className="library-list">
        {shown.map((challenge) => {
          const cat = CATEGORY_MAP[challenge.category];
          const done = isCompleted(challenge.id);
          return (
            <li
              key={challenge.id}
              className={cn("library-item", done && "is-done")}
            >
              <span
                className="library-item-icon"
                style={{ color: cat.accent }}
                aria-hidden
              >
                <CategoryIcon name={challenge.category} className="size-4" />
              </span>

              <div className="library-item-main">
                <div className="library-item-top">
                  <h4 className="library-item-name">{challenge.name}</h4>
                  <span
                    className="mini-tag"
                    style={
                      { "--chip": DIFFICULTY_ACCENT[challenge.difficulty] } as React.CSSProperties
                    }
                  >
                    {challenge.difficulty}
                  </span>
                  <span className="mini-tag mini-tag-quiet">
                    <Clock className="size-3" />
                    {formatHours(challenge.hours)}
                  </span>
                  {challenge.custom ? (
                    <span className="mini-tag mini-tag-custom">custom</span>
                  ) : null}
                </div>
                <p className="library-item-tagline">{challenge.tagline}</p>
                <p className="library-item-stack">{challenge.techStack.join(" · ")}</p>
              </div>

              <div className="library-item-actions">
                <button
                  type="button"
                  className="icon-button"
                  title={`Spin ${challenge.name}`}
                  aria-label={`Spin ${challenge.name}`}
                  onClick={() => onSpinChallenge(challenge)}
                >
                  <Play className="size-4" />
                </button>
                {challenge.custom ? (
                  <button
                    type="button"
                    className="icon-button icon-button-danger"
                    title="Delete custom project"
                    aria-label={`Delete ${challenge.name}`}
                    onClick={() => removeCustom(challenge.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {results.length === 0 ? (
        <p className="empty-state">
          Nothing matches that search. Try a different word, or add your own
          project.
        </p>
      ) : null}

      {visible < results.length ? (
        <div className="panel-more">
          <button
            type="button"
            className="btn"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
          >
            Show {Math.min(PAGE_SIZE, results.length - visible)} more
          </button>
        </div>
      ) : null}
    </div>
  );
}
