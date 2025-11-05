//sond helper functions
//createOscillator() → makes a tone generator (a sound wave).
//createGain() → makes a volume controller.
//Oscillator → Gain → Speaker in order
//440Hz is standard musical A note
const AC =
  typeof window !== "undefined" &&
  ((window as any).AudioContext || (window as any).webkitAudioContext);

let sharedAudioCtx: AudioContext | null = null;

function ensureAudioContext(): AudioContext | null {
  if (!AC) return null;
  if (!sharedAudioCtx) sharedAudioCtx = new AC();
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx?.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

function beepSound(enabled: boolean, freq = 440, dur = 0.08, vol = 0.25) {
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
  g.gain.exponentialRampToValueAtTime(0.01, t + dur); //smoothly fade it down to almost zero
  o.start(t);
  o.stop(t + dur);
}
