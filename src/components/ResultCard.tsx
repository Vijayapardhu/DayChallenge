"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Gauge,
  RotateCw,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { useCopy } from "@/hooks/useCopy";
import { buildChallengeSummary } from "@/lib/prompt";
import { useApp, type SpinResult } from "@/lib/store";
import { CATEGORY_MAP, DIFFICULTY_ACCENT } from "@/lib/types";
import type { Challenge, SpinMode } from "@/lib/types";
import { cn, formatDateTime, formatHours } from "@/lib/utils";

const MODE_LABEL: Record<SpinMode, string> = {
  random: "Random spin",
  unique: "Unique pick",
  daily: "Challenge of the day",
};

interface ResultCardProps {
  result: SpinResult;
  confettiToken: number;
  reducedMotion: boolean;
  onSpinAgain: () => void;
  onGeneratePrompt: (challenge: Challenge) => void;
}

export function ResultCard({
  result,
  confettiToken,
  reducedMotion,
  onSpinAgain,
  onGeneratePrompt,
}: ResultCardProps) {
  const { isCompleted, markCompleted, unmarkCompleted, isChecked, toggleCheck } =
    useApp();
  const { copiedKey, copy } = useCopy();

  const challenge = result.challenge;
  const cat = CATEGORY_MAP[challenge.category];
  const completed = isCompleted(challenge.id);
  const checkedCount = challenge.mvpFeatures.filter((_, i) =>
    isChecked(challenge.id, i),
  ).length;
  const progress = Math.round(
    (checkedCount / Math.max(1, challenge.mvpFeatures.length)) * 100,
  );

  return (
    <motion.section
      className="result-card"
      aria-label="Selected challenge"
      initial={
        reducedMotion
          ? { opacity: 0 }
          : { opacity: 0, y: 46, scale: 0.94, rotateX: -8 }
      }
      animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      exit={{ opacity: 0, y: -24, scale: 0.97 }}
      transition={
        reducedMotion
          ? { duration: 0.2 }
          : { type: "spring", stiffness: 210, damping: 24, mass: 0.9 }
      }
      style={{ transformPerspective: 1200 }}
    >
      <ConfettiBurst fire={confettiToken} reducedMotion={reducedMotion} />

      <div className="result-rail" style={{ background: cat.accent }} aria-hidden />

      <header className="result-head">
        <div className="result-chips">
          <span className="chip chip-category" style={{ "--chip": cat.accent } as React.CSSProperties}>
            <CategoryIcon name={challenge.category} className="size-3.5" />
            {cat.label}
          </span>
          <span
            className="chip"
            style={{ "--chip": DIFFICULTY_ACCENT[challenge.difficulty] } as React.CSSProperties}
          >
            <Gauge className="size-3.5" />
            {challenge.difficulty}
          </span>
          <span className="chip chip-quiet">
            <Clock className="size-3.5" />
            {formatHours(challenge.hours)}
          </span>
          <span className="chip chip-quiet">
            <Target className="size-3.5" />
            {MODE_LABEL[result.mode]}
          </span>
          {completed ? (
            <span className="chip chip-done">
              <CheckCircle2 className="size-3.5" />
              Completed
            </span>
          ) : null}
        </div>

        <h2 className="result-title">{challenge.name}</h2>
        <p className="result-tagline">{challenge.tagline}</p>
      </header>

      <p className="result-desc">{challenge.description}</p>

      <div className="result-grid">
        <div className="result-block">
          <div className="result-block-head">
            <h3 className="result-block-title">MVP checklist</h3>
            <span className="result-progress-text">
              {checkedCount}/{challenge.mvpFeatures.length}
            </span>
          </div>
          <div className="result-progress" aria-hidden>
            <motion.span
              className="result-progress-fill"
              style={{ background: cat.accent }}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 220, damping: 26 }}
            />
          </div>
          <ul className="check-list">
            {challenge.mvpFeatures.map((feature, i) => {
              const on = isChecked(challenge.id, i);
              return (
                <li key={feature}>
                  <button
                    type="button"
                    className={cn("check-item", on && "is-on")}
                    aria-pressed={on}
                    onClick={() => toggleCheck(challenge.id, i)}
                  >
                    <span className="check-box" aria-hidden>
                      <Check className="size-3" />
                    </span>
                    <span className="check-text">{feature}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="result-side">
          <div className="result-block">
            <h3 className="result-block-title">Suggested stack</h3>
            <ul className="stack-list">
              {challenge.techStack.map((tech) => (
                <li key={tech} className="stack-pill">
                  {tech}
                </li>
              ))}
            </ul>
          </div>

          {challenge.stretchGoal ? (
            <div className="result-block result-stretch">
              <h3 className="result-block-title">
                <Sparkles className="size-4" /> Stretch goal
              </h3>
              <p className="result-stretch-text">{challenge.stretchGoal}</p>
            </div>
          ) : null}

          <p className="result-meta">
            Selected {formatDateTime(result.at)}
          </p>
        </div>
      </div>

      <footer className="result-actions">
        <button type="button" className="btn btn-primary" onClick={onSpinAgain}>
          <RotateCw className="size-4" />
          Spin Again
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => copy(buildChallengeSummary(challenge), "summary")}
        >
          {copiedKey === "summary" ? (
            <Check className="size-4" />
          ) : (
            <Copy className="size-4" />
          )}
          {copiedKey === "summary" ? "Copied" : "Copy Challenge"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => onGeneratePrompt(challenge)}
        >
          <Wand2 className="size-4" />
          Generate AI Build Prompt
        </button>
        <button
          type="button"
          className={cn("btn", completed ? "btn-done" : "btn-ghost")}
          aria-pressed={completed}
          onClick={() =>
            completed ? unmarkCompleted(challenge.id) : markCompleted(challenge)
          }
        >
          <CheckCircle2 className="size-4" />
          {completed ? "Completed" : "Mark as Completed"}
        </button>
      </footer>

      <AnimatePresence>
        {copiedKey === "summary" ? (
          <motion.span
            className="copy-toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            Challenge copied to clipboard
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}
