"use client";

import { useEffect, useRef } from "react";

interface Ember {
  x: number;
  y: number;
  r: number;
  vy: number;
  sway: number;
  swaySpeed: number;
  phase: number;
  hue: number;
  alpha: number;
}

const PALETTE = [28, 20, 38, 12, 44];

export function Particles({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let embers: Ember[] = [];
    let raf = 0;
    let running = true;

    const seed = (count: number) => {
      embers = Array.from({ length: count }, () => spawn(true));
    };

    const spawn = (anywhere = false): Ember => {
      const r = 0.7 + Math.random() * 2.4;
      return {
        x: Math.random() * width,
        y: anywhere ? Math.random() * height : height + 12,
        r,
        vy: 0.18 + Math.random() * 0.55,
        sway: 6 + Math.random() * 26,
        swaySpeed: 0.0004 + Math.random() * 0.0011,
        phase: Math.random() * Math.PI * 2,
        hue: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        alpha: 0.16 + Math.random() * 0.5,
      };
    };

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const density = reducedMotion ? 12 : Math.round((width * height) / 26000);
      seed(Math.max(10, Math.min(reducedMotion ? 14 : 90, density)));
      if (reducedMotion) draw(performance.now(), true);
    };

    const draw = (now: number, still = false) => {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "lighter";
      for (const e of embers) {
        const dx = Math.sin(now * e.swaySpeed + e.phase) * e.sway;
        const x = e.x + dx;
        const y = e.y;

        if (!still) {
          e.y -= e.vy;
          if (e.y < -20) {
            const fresh = spawn();
            Object.assign(e, fresh);
            continue;
          }
        }

        const r = Math.max(0.002, e.r);
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
        grad.addColorStop(0, `hsla(${e.hue}, 100%, 68%, ${e.alpha})`);
        grad.addColorStop(0.4, `hsla(${e.hue}, 100%, 55%, ${e.alpha * 0.35})`);
        grad.addColorStop(1, `hsla(${e.hue}, 100%, 50%, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, r * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `hsla(${e.hue}, 100%, 82%, ${Math.min(0.9, e.alpha + 0.25)})`;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      void running;
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    if (!reducedMotion) raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden
    />
  );
}
