"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, Trash2, Trophy } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useApp } from "@/lib/store";
import { CATEGORIES, CATEGORY_MAP } from "@/lib/types";
import { formatDateTime, formatHours } from "@/lib/utils";

export function CompletedPanel() {
  const { completed, allChallenges, unmarkCompleted, clearCompleted, resetAll } =
    useApp();
  const [confirmReset, setConfirmReset] = useState(false);
  const byId = new Map(allChallenges.map((c) => [c.id, c]));

  const totalHours = completed.reduce((sum, record) => {
    const c = byId.get(record.challengeId);
    return sum + (c?.hours ?? 0);
  }, 0);

  const perCategory = CATEGORIES.map((cat) => ({
    cat,
    count: completed.filter((c) => c.category === cat.id).length,
  })).filter((row) => row.count > 0);

  return (
    <div className="panel">
      <div className="panel-head">
        <h3 className="panel-subtitle">
          <Trophy className="size-4" /> Completed challenges
        </h3>
        {completed.length > 0 ? (
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={clearCompleted}
          >
            <Trash2 className="size-4" />
            Clear
          </button>
        ) : null}
      </div>

      {completed.length === 0 ? (
        <p className="empty-state">
          Nothing marked done yet. Finish a build, hit “Mark as Completed”, and it
          lands here.
        </p>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat-card">
              <span className="stat-value">{completed.length}</span>
              <span className="stat-label">projects shipped</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{formatHours(totalHours)}</span>
              <span className="stat-label">total build time</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">
                {new Set(completed.map((c) => c.category)).size}
              </span>
              <span className="stat-label">categories touched</span>
            </div>
          </div>

          {perCategory.length > 0 ? (
            <ul className="category-tally">
              {perCategory.map(({ cat, count }) => (
                <li key={cat.id} className="category-tally-item">
                  <CategoryIcon name={cat.id} className="size-3.5" />
                  <span style={{ color: cat.accent }}>{cat.label}</span>
                  <span className="category-tally-count">{count}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <ol className="completed-list">
            {completed.map((record) => {
              const challenge = byId.get(record.challengeId);
              return (
                <li key={record.challengeId} className="completed-item">
                  <CheckCircle2 className="size-5 completed-check" aria-hidden />
                  <div className="completed-main">
                    <span className="completed-name">{record.name}</span>
                    <span className="completed-sub">
                      {CATEGORY_MAP[record.category].label}
                      {challenge ? ` · ${formatHours(challenge.hours)}` : ""} ·{" "}
                      {formatDateTime(record.at)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    title="Move back to uncompleted"
                    aria-label={`Unmark ${record.name}`}
                    onClick={() => unmarkCompleted(record.challengeId)}
                  >
                    <RotateCcw className="size-4" />
                  </button>
                </li>
              );
            })}
          </ol>
        </>
      )}

      <div className="panel-reset">
        <button
          type="button"
          className={
            confirmReset ? "btn btn-sm btn-destructive" : "btn btn-sm btn-ghost"
          }
          onClick={() => {
            if (confirmReset) {
              resetAll();
              clearCompleted();
              setConfirmReset(false);
            } else {
              setConfirmReset(true);
              window.setTimeout(() => setConfirmReset(false), 4000);
            }
          }}
        >
          <Trash2 className="size-4" />
          {confirmReset ? "Tap again to wipe all data" : "Reset all local data"}
        </button>
      </div>
    </div>
  );
}
