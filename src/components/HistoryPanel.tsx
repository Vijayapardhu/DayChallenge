"use client";

import { Clock, History, RotateCw, Trash2 } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useApp } from "@/lib/store";
import { CATEGORY_MAP, DIFFICULTY_ACCENT } from "@/lib/types";
import type { Challenge, SpinMode } from "@/lib/types";
import { formatHours, formatRelativeTime } from "@/lib/utils";

const MODE_LABEL: Record<SpinMode, string> = {
  random: "random",
  unique: "unique",
  daily: "daily",
};

interface HistoryPanelProps {
  onRespin: (challenge: Challenge) => void;
}

export function HistoryPanel({ onRespin }: HistoryPanelProps) {
  const { history, allChallenges, clearHistory } = useApp();
  const byId = new Map(allChallenges.map((c) => [c.id, c]));

  return (
    <div className="panel">
      <div className="panel-head">
        <h3 className="panel-subtitle">
          <History className="size-4" /> Spin history
        </h3>
        {history.length > 0 ? (
          <button type="button" className="btn btn-sm btn-ghost" onClick={clearHistory}>
            <Trash2 className="size-4" />
            Clear
          </button>
        ) : null}
      </div>

      {history.length === 0 ? (
        <p className="empty-state">
          No spins yet. Pull the lever and your streak of ideas starts here.
        </p>
      ) : (
        <ol className="history-list">
          {history.map((record) => {
            const cat = CATEGORY_MAP[record.category];
            const challenge = byId.get(record.challengeId);
            return (
              <li key={record.id} className="history-item">
                <span className="history-dot" style={{ background: cat.accent }} aria-hidden />
                <div className="history-main">
                  <div className="history-top">
                    <span className="history-name">{record.name}</span>
                    <span className="mini-tag mini-tag-quiet">
                      <Clock className="size-3" />
                      {formatHours(record.hours)}
                    </span>
                    <span
                      className="mini-tag"
                      style={
                        { "--chip": DIFFICULTY_ACCENT[record.difficulty] } as React.CSSProperties
                      }
                    >
                      {record.difficulty}
                    </span>
                    <span className="mini-tag mini-tag-quiet">
                      {MODE_LABEL[record.mode]}
                    </span>
                  </div>
                  <div className="history-sub">
                    <CategoryIcon name={record.category} className="size-3" />
                    <span>{cat.label}</span>
                    <span className="dot-sep" aria-hidden>
                      ·
                    </span>
                    <span>{formatRelativeTime(record.at)}</span>
                  </div>
                </div>
                {challenge ? (
                  <button
                    type="button"
                    className="icon-button"
                    title={`Spin ${challenge.name} again`}
                    aria-label={`Spin ${challenge.name} again`}
                    onClick={() => onRespin(challenge)}
                  >
                    <RotateCw className="size-4" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
