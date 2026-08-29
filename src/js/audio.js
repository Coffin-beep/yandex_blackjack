/**
 * audio.js — звук без единого ассета: короткие эффекты синтезируются WebAudio.
 * Это даёт 0 КБ загрузки и мгновенный отклик. Отключается кнопкой 🔊 (сохраняется).
 */

let ctx = null;
let enabled = true;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Базовый тон: частота, длительность, тип волны, громкость. */
function tone({ freq = 440, dur = 0.1, type = 'sine', vol = 0.2, delay = 0, slide = 0 }) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Короткий «щелчок» карты (шум). */
function noiseBurst({ dur = 0.06, vol = 0.25, delay = 0 }) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = c.createBufferSource();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 1200;
  gain.gain.value = vol;
  src.buffer = buf;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  card() {
    noiseBurst({ dur: 0.07, vol: 0.3 });
    tone({ freq: 190, dur: 0.05, type: 'triangle', vol: 0.1 });
  },
  flip() {
    noiseBurst({ dur: 0.05, vol: 0.22 });
  },
  chip() {
    tone({ freq: 2100, dur: 0.045, type: 'triangle', vol: 0.18 });
    tone({ freq: 2600, dur: 0.05, type: 'sine', vol: 0.14, delay: 0.03 });
  },
  deal() {
    tone({ freq: 520, dur: 0.09, type: 'triangle', vol: 0.18 });
    tone({ freq: 660, dur: 0.1, type: 'triangle', vol: 0.18, delay: 0.09 });
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.22, delay: i * 0.09 })
    );
  },
  blackjack() {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      tone({ freq: f, dur: 0.22, type: 'sine', vol: 0.25, delay: i * 0.08 })
    );
  },
  lose() {
    tone({ freq: 300, dur: 0.25, type: 'sawtooth', vol: 0.12, slide: -160 });
  },
  push() {
    tone({ freq: 440, dur: 0.14, type: 'sine', vol: 0.18 });
    tone({ freq: 440, dur: 0.14, type: 'sine', vol: 0.15, delay: 0.16 });
  }
};

export function setSoundEnabled(on) {
  enabled = !!on;
  if (enabled) ensureCtx();
}

export function isSoundEnabled() {
  return enabled;
}

/** Разблокировать AudioContext первым касанием (требование мобильных браузеров). */
export function unlockAudio() {
  ensureCtx();
}
