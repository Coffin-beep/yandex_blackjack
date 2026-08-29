/**
 * music.js — простая фоновая музыка казино, синтезируемая WebAudio в реальном
 * времени (никаких mp3-ассетов → 0 КБ к скачиванию).
 *
 * Что играет: спокойный лаунж-луп ~92 BPM —
 *   - «ходячий» контрабас (синус, корень/квинта/подход),
 *   - мягкие аккордовые «набросы» на 2 и 4 доли,
 *   - разреженная мелодия по пентатонике ля-минор.
 *
 * Прогрессия (8 тактов): Am7 · Dm7 · G7 · Cmaj7 · Fmaj7 · Bm7b5 · E7 · Am7.
 * Управление: setMusicEnabled(bool) / setMusicVolume(0..1) из меню настроек.
 */

import { getCtx } from './audio.js';

const BPM = 92;
const BEAT = 60 / BPM;      // длительность доли
const HALF = BEAT / 2;      // полудоля — шаг планировщика
const STEPS_PER_BAR = 8;    // 8 полудолей в такте 4/4
const BARS = 8;             // длина прогрессии в тактах

// MIDI: A2=45. Аккорды в удобной середине регистра.
const PROG = [
  { root: 45, chord: [57, 60, 64, 67] }, // Am7
  { root: 38, chord: [50, 53, 57, 60] }, // Dm7
  { root: 43, chord: [55, 59, 62, 65] }, // G7
  { root: 48, chord: [48, 52, 55, 59] }, // Cmaj7
  { root: 41, chord: [53, 57, 60, 64] }, // Fmaj7
  { root: 47, chord: [59, 62, 65, 69] }, // Bm7b5
  { root: 40, chord: [52, 56, 59, 62] }, // E7
  { root: 45, chord: [57, 60, 64, 67] }  // Am7 (разрешение)
];

// Пентатоника ля-минор на два регистра — мелодия по ней звучит ладово над всей прогрессией
const MELODY_SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79];

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

let timer = null;        // setInterval планировщика
let master = null;       // общий гейн музыки
let volume = 0.55;       // 0..1 из настроек
let step = 0;            // текущий шаг (полудоля) внутри 8-тактового лупа
let nextTime = 0;        // audio-время следующего шага
let melodyIdx = 4;       // позиция в гамме — «случайное блуждание» мелодии

/** Одна нота с мягкой атакой/затуханием в музыкальную шину. */
function note({ midi, at, dur, type = 'sine', peak = 0.2 }) {
  const ctx = getCtx();
  if (!ctx || !master) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = mtof(midi);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.linearRampToValueAtTime(peak, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(master);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

/** Запланировать один шаг (полудолю) лупа. */
function scheduleStep(s, t) {
  const bar = Math.floor(s / STEPS_PER_BAR) % BARS;
  const sub = s % STEPS_PER_BAR; // 0..7, чётные = доли
  const ch = PROG[bar];
  const nextRoot = PROG[(bar + 1) % BARS].root;

  // Бас на каждой доле: корень → квинта → октава → подходящий тон к следующему аккорду
  if (sub % 2 === 0) {
    const beat = sub / 2;
    const bassLine = [
      ch.root,
      ch.root + 7,
      ch.root + 12,
      nextRoot + (Math.random() < 0.5 ? -1 : 1)
    ];
    note({ midi: bassLine[beat], at: t, dur: BEAT * 0.95, type: 'sine', peak: 0.5 });
  }

  // Аккордовые «наброски» на 2 и 4 долях (лёгкий «штрих», как щётки)
  if (sub === 2 || sub === 6) {
    ch.chord.forEach((m, i) =>
      note({ midi: m, at: t + i * 0.02, dur: 0.38, type: 'triangle', peak: 0.11 })
    );
  }

  // Разреженная мелодия на слабых полудолях
  if (sub % 2 === 1 && Math.random() < 0.45) {
    const jump = (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.3 ? 2 : 1);
    melodyIdx = Math.max(0, Math.min(MELODY_SCALE.length - 1, melodyIdx + jump));
    note({ midi: MELODY_SCALE[melodyIdx], at: t, dur: HALF * 1.9, type: 'sine', peak: 0.15 });
  }
}

/** Планировщик сlookahead: каждые 200мс планируем ноты на 800мс вперёд. */
function tick() {
  const ctx = getCtx();
  if (!ctx || !master) return;
  while (nextTime < ctx.currentTime + 0.8) {
    scheduleStep(step, Math.max(nextTime, ctx.currentTime + 0.05));
    step = (step + 1) % (BARS * STEPS_PER_BAR);
    nextTime += HALF;
  }
}

/** Запустить музыку (только после жеста пользователя — политика автоплея). */
export function startMusic() {
  const ctx = getCtx();
  if (!ctx || timer) return;
  master = ctx.createGain();
  master.gain.value = volume * 0.5; // музыка заметно тише эффектов
  master.connect(ctx.destination);
  step = 0;
  nextTime = ctx.currentTime + 0.15;
  timer = setInterval(tick, 200);
  tick();
}

/** Остановить музыку с мягким затуханием. */
export function stopMusic() {
  const ctx = getCtx();
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (master && ctx) {
    const m = master;
    m.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
    setTimeout(() => m.disconnect(), 600);
    master = null;
  }
}

export function isMusicPlaying() {
  return !!timer;
}

/** Вкл/выкл из меню настроек. */
export function setMusicEnabled(on) {
  if (on) startMusic();
  else stopMusic();
}

/** Громкость музыки 0..1 из меню настроек. */
export function setMusicVolume(v) {
  volume = Math.min(1, Math.max(0, +v || 0));
  const ctx = getCtx();
  if (master && ctx) {
    master.gain.setTargetAtTime(volume * 0.5, ctx.currentTime, 0.05);
  }
}

// Пауза музыки, когда вкладка скрыта (браузер и так глушит, но так чище)
let wasPlayingBeforeHidden = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (timer) {
      stopMusic();
      wasPlayingBeforeHidden = true;
    }
  } else if (wasPlayingBeforeHidden) {
    startMusic();
    wasPlayingBeforeHidden = false;
  }
});
