"use client";

/**
 * Tiny Web Audio engine. Everything is synthesised — no audio files, so the
 * app ships as a single page with zero media requests.
 *
 * The AudioContext is created lazily on the first user gesture to satisfy
 * browser autoplay policies.
 */

type Osc = OscillatorType;

export interface ToneOptions {
  freq: number;
  type?: Osc;
  duration?: number;
  gain?: number;
  attack?: number;
  sweepTo?: number;
  delay?: number;
  detune?: number;
}

export interface NoiseOptions {
  duration?: number;
  gain?: number;
  filter?: number;
  q?: number;
  delay?: number;
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private comp: DynamicsCompressorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  muted = false;
  volume = 0.7;

  /** Must be called from a user gesture at least once. */
  unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") void ctx.resume();
  }

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (this.ctx) return this.ctx;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    const ctx = new Ctor();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 8;
    comp.attack.value = 0.003;
    comp.release.value = 0.18;

    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : this.volume;

    master.connect(comp);
    comp.connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    this.comp = comp;
    this.noiseBuffer = this.makeNoise(ctx);
    return ctx;
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 1.2);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  setVolume(v: number) {
    this.volume = Math.min(1, Math.max(0, v));
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        t,
        0.02,
      );
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.setVolume(this.volume);
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private tone(opts: ToneOptions) {
    const ctx = this.ensure();
    if (!ctx || !this.master || this.muted) return;
    const {
      freq,
      type = "square",
      duration = 0.12,
      gain = 0.14,
      attack = 0.004,
      sweepTo,
      delay = 0,
      detune = 0,
    } = opts;

    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.detune.value = detune;
    if (sweepTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(1, sweepTo),
        t0 + duration,
      );
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noise(opts: NoiseOptions = {}) {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noiseBuffer || this.muted) return;
    const {
      duration = 0.08,
      gain = 0.12,
      filter = 1800,
      q = 1.2,
      delay = 0,
    } = opts;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(filter, t0);
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + duration + 0.02);
  }

  /** Soft UI click. */
  click() {
    this.tone({ freq: 620, type: "square", duration: 0.05, gain: 0.07 });
    this.noise({ duration: 0.03, gain: 0.05, filter: 3200 });
  }

  /**
   * Mechanical ratchet tick.
   * @param velocity 0–1, where 1 is the fastest part of the spin. Fast ticks
   *   are higher and softer; the final, slow ticks land deeper and louder.
   */
  tick(velocity = 0.6) {
    const v = clamp01(velocity);
    const freq = 620 + v * 980;
    const gain = 0.05 + (1 - v) * 0.09;
    this.noise({ duration: 0.03, gain: gain * 0.8, filter: 2200 + v * 1400 });
    this.tone({
      freq,
      type: "square",
      duration: 0.028,
      gain,
      sweepTo: freq * 0.62,
    });
  }

  /** Heavy clunk when the reel is let go. */
  spinStart() {
    this.noise({ duration: 0.12, gain: 0.18, filter: 900, q: 0.8 });
    this.tone({
      freq: 180,
      type: "sawtooth",
      duration: 0.16,
      gain: 0.14,
      sweepTo: 90,
    });
    this.tone({
      freq: 1200,
      type: "square",
      duration: 0.5,
      gain: 0.05,
      sweepTo: 260,
      delay: 0.02,
    });
  }

  /** Descending "slowing down" whoosh. */
  slowdown() {
    this.tone({
      freq: 520,
      type: "triangle",
      duration: 0.9,
      gain: 0.06,
      sweepTo: 120,
    });
    this.noise({ duration: 0.7, gain: 0.05, filter: 700, q: 0.6 });
  }

  /** Low impact on landing. */
  impact() {
    this.tone({
      freq: 140,
      type: "sine",
      duration: 0.4,
      gain: 0.3,
      sweepTo: 46,
    });
    this.noise({ duration: 0.18, gain: 0.16, filter: 500, q: 0.7 });
    this.tone({
      freq: 300,
      type: "square",
      duration: 0.06,
      gain: 0.09,
      sweepTo: 120,
    });
  }

  /** Bright reveal arpeggio. */
  victory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => {
      this.tone({
        freq: f,
        type: "triangle",
        duration: 0.42,
        gain: 0.16,
        delay: i * 0.07,
      });
      this.tone({
        freq: f * 2,
        type: "sine",
        duration: 0.3,
        gain: 0.05,
        delay: i * 0.07,
      });
    });
    this.noise({ duration: 0.5, gain: 0.06, filter: 5200, delay: 0.28 });
  }

  /** Error / blocked action. */
  error() {
    this.tone({ freq: 220, type: "sawtooth", duration: 0.16, gain: 0.12 });
    this.tone({
      freq: 160,
      type: "sawtooth",
      duration: 0.2,
      gain: 0.12,
      delay: 0.1,
    });
  }
}

let singleton: SoundEngine | null = null;
export function getSound(): SoundEngine {
  if (!singleton) singleton = new SoundEngine();
  return singleton;
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}
