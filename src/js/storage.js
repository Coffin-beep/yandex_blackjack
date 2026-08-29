/**
 * storage.js — профиль игрока: баланс, статистика, настройки звука.
 * Сохраняется между сессиями через Yandex Player Data (облако) + localStorage.
 */

import { loadPlayerData, savePlayerData } from './sdk.js';

const KEYS = ['profile'];
const DEFAULTS = {
  balance: 1000,
  lastBet: 0,
  sound: true,
  stats: { hands: 0, wins: 0, losses: 0, pushes: 0, blackjacks: 0, bestBalance: 1000 }
};

let profile = deepClone(DEFAULTS);
let saveTimer = null;

/** Глубокое клонирование простых данных (совместимо со старыми WebView без structuredClone). */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function getProfile() {
  return profile;
}

export async function loadProfile() {
  const data = await loadPlayerData(KEYS);
  const saved = data?.profile;
  if (saved && typeof saved === 'object') {
    profile = {
      ...deepClone(DEFAULTS),
      ...saved,
      stats: { ...DEFAULTS.stats, ...(saved.stats || {}) }
    };
  }
  // Санитарные проверки
  if (!Number.isFinite(profile.balance) || profile.balance < 0) profile.balance = DEFAULTS.balance;
  if (typeof profile.sound !== 'boolean') profile.sound = true;
  return profile;
}

/** Дебаунс-сохранение — не спамим облако на каждом изменении баланса. */
export function persistProfile(immediate = false) {
  clearTimeout(saveTimer);
  const doSave = () => {
    if (profile.balance > profile.stats.bestBalance) {
      profile.stats.bestBalance = profile.balance;
    }
    savePlayerData({ profile });
  };
  if (immediate) doSave();
  else saveTimer = setTimeout(doSave, 800);
}

export function setBalance(value) {
  profile.balance = Math.max(0, Math.round(value));
  persistProfile();
}

export function addBalance(delta) {
  setBalance(profile.balance + delta);
}

export function updateStats(type) {
  profile.stats.hands++;
  if (type === 'win' || type === 'blackjack') profile.stats.wins++;
  else if (type === 'lose') profile.stats.losses++;
  else if (type === 'push') profile.stats.pushes++;
  if (type === 'blackjack') profile.stats.blackjacks++;
  persistProfile();
}
