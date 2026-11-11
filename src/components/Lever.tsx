"use client";

import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

const MAX_PULL = 78;

interface LeverProps {
  onPull: () => void;
  disabled?: boolean;
  reducedMotion?: boolean;
}

export function Lever({ onPull, disabled = false, reducedMotion = false }: LeverProps) {
  const y = useMotionValue(0);
  const knobScale = useTransform(y, [0, MAX_PULL], [1, 1.06]);
  const [engaged, setEngaged] = useState(false);
  const armedRef = useRef(false);
  const firedRef = useRef(false);

  const pull = () => {
    if (disabled) return;
    animate(y, reducedMotion ? MAX_PULL * 0.7 : MAX_PULL, {
      duration: 0.16,
      ease: "easeOut",
    });
  };

  const release = () => {
    // A lever that is armed always fires — even on a very quick tap where the
    // knob animation has not travelled far yet.
    if (armedRef.current && !firedRef.current) {
      firedRef.current = true;
      onPull();
    }
    animate(y, 0, {
      type: "spring",
      stiffness: 420,
      damping: 24,
      restDelta: 0.5,
    });
    window.setTimeout(() => {
      firedRef.current = false;
      armedRef.current = false;
      setEngaged(false);
    }, 260);
  };

  return (
    <div className="lever" style={{ opacity: disabled ? 0.45 : 1 }}>
      <div className="lever-plate" aria-hidden>
        <span className="lever-slot" />
        <span className="lever-bolt lever-bolt-tl" />
        <span className="lever-bolt lever-bolt-tr" />
        <span className="lever-bolt lever-bolt-bl" />
        <span className="lever-bolt lever-bolt-br" />
      </div>

      <button
        type="button"
        className="lever-handle"
        aria-label="Pull the lever to spin"
        disabled={disabled}
        onPointerDown={(e) => {
          if (disabled) return;
          armedRef.current = true;
          setEngaged(true);
          e.currentTarget.setPointerCapture(e.pointerId);
          pull();
        }}
        onPointerUp={(e) => {
          if (!armedRef.current) return;
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* pointer already released */
          }
          release();
        }}
        onPointerCancel={() => {
          armedRef.current = false;
          animate(y, 0, { type: "spring", stiffness: 420, damping: 24 });
          setEngaged(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            if (disabled) return;
            firedRef.current = false;
            armedRef.current = true;
            setEngaged(true);
            pull();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            if (armedRef.current) release();
          }
        }}
      >
        <motion.span
          className={`lever-knob${engaged ? " is-engaged" : ""}`}
          style={{ y, scale: knobScale }}
        >
          <span className="lever-knob-shine" aria-hidden />
        </motion.span>
        <motion.span className="lever-stem" style={{ y }} aria-hidden />
      </button>

      <span className="lever-hint" aria-hidden>
        PULL
      </span>
    </div>
  );
}
