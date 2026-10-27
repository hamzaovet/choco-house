/**
 * Web Audio API Sound Synthesizer for Choco House Desserts ERP
 * No external sound files needed — pure synthesis.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem("choco_sounds_enabled");
  return val === null || val === "1";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("choco_sounds_enabled", enabled ? "1" : "0");
}

export function playSound(
  type: "click" | "order" | "chat" | "alert" | "success" | "kitchen" | "alarm"
): void {
  if (!isSoundEnabled()) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;

  const patterns: Record<string, { tones: [number, number, number][]; wave: OscillatorType }> = {
    click: { tones: [[620, 0, 0.045]], wave: "sine" },
    order: {
      tones: [
        [880, 0, 0.12],
        [1046, 0.14, 0.12],
        [1318, 0.28, 0.18],
      ],
      wave: "sine",
    },
    alarm: {
      tones: [
        [784, 0, 0.14],
        [1046, 0.15, 0.16],
        [784, 0.36, 0.14],
        [1046, 0.52, 0.22],
      ],
      wave: "triangle",
    },
    chat: {
      tones: [
        [520, 0, 0.09],
        [650, 0.11, 0.09],
      ],
      wave: "sine",
    },
    alert: {
      tones: [
        [440, 0, 0.2],
        [440, 0.25, 0.2],
        [330, 0.5, 0.25],
      ],
      wave: "square",
    },
    success: {
      tones: [
        [587.33, 0, 0.1],
        [739.99, 0.12, 0.1],
        [880.0, 0.24, 0.22],
      ],
      wave: "sine",
    },
    kitchen: {
      tones: [
        [1046, 0, 0.1],
        [880, 0.12, 0.1],
        [1046, 0.24, 0.15],
      ],
      wave: "sine",
    },
  };

  const config = patterns[type] || patterns.click;
  config.tones.forEach(([freq, startTime, duration]) => {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = config.wave;
      osc.frequency.value = freq;
      const now = ctx.currentTime + startTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch (e) {
      console.error("Sound error:", e);
    }
  });
}
