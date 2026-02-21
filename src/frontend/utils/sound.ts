/* eslint-disable @typescript-eslint/no-explicit-any */
const AC =
  typeof window !== "undefined" &&
  ((window as any).AudioContext || (window as any).webkitAudioContext);

let sharedAudioCtx: AudioContext | null = null;

export function ensureAudioContext(): AudioContext | null {
  if (!AC) return null;

  const ctx = sharedAudioCtx ?? (sharedAudioCtx = new AC());

  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {});
  }

  return ctx;
}

export function beepSound(
  enabled: boolean,
  freq = 440,
  dur = 0.08,
  vol = 0.25, 
): void {
  if (!enabled) return;
  const ctx = ensureAudioContext();
  if (!ctx) return;

  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.connect(g);
  g.connect(ctx.destination);

  o.frequency.value = freq;

  const t = ctx.currentTime;
  g.gain.setValueAtTime(vol, t);
  // smooth fade
  g.gain.exponentialRampToValueAtTime(0.01, t + dur);

  o.start(t);
  o.stop(t + dur);
}
