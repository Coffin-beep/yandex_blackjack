/**
 * sdk.js — обёртка над Yandex Games SDK v2.
 *
 * Возможности:
 *  - init(): YaGames.init() + LoadingAPI.ready(); вне платформы — прозрачный мок.
 *  - showFullscreenAd(): межроликовая реклама с колбэками паузы/возобновления игры.
 *  - playerData get/set: облачные сохранения Яндекс Игр с фолбэком на localStorage.
 *
 * Важно для модерации Яндекса: реклама не чаще ~1 раза в минуту, звук на время
 * рекламы выключается, игра ставится на паузу.
 */

const LS_PREFIX = 'bj_';

let ysdk = null;
let player = null;
let isMock = false;

/** Мок для локальной разработки (SDK-скрипт не загружен / запуск вне Яндекса). */
function createMockSdk() {
  const storage = {};
  return {
    __mock: true,
    environment: { i18n: { lang: 'ru' }, payload: '' },
    features: { LoadingAPI: { ready: () => console.log('[mock] LoadingAPI.ready()') } },
    adv: {
      showFullscreenAdv: ({ callbacks = {} } = {}) => {
        console.log('[mock] showFullscreenAdv()');
        callbacks.onOpen?.();
        setTimeout(() => callbacks.onClose?.(true), 300);
      }
    },
    getPlayer: async () => ({
      getData: async (keys, useLocalStorage = true) => {
        const out = {};
        for (const k of keys) {
          const raw = useLocalStorage === false ? storage[k] : localStorage.getItem(LS_PREFIX + k);
          if (raw != null) out[k] = JSON.parse(raw);
        }
        return out;
      },
      setData: async (data, flush) => {
        Object.assign(storage, data);
        for (const [k, v] of Object.entries(data)) {
          localStorage.setItem(LS_PREFIX + k, JSON.stringify(v));
        }
        if (flush) console.log('[mock] player.setData flush');
      },
      getMode: () => 'lite'
    })
  };
}

/** Инициализация SDK. Вызывать один раз на старте приложения. */
export async function initSDK() {
  if (typeof YaGames === 'undefined') {
    isMock = true;
    ysdk = createMockSdk();
    console.warn('[sdk] YaGames не найден — работаем в мок-режиме (локальная разработка).');
    return ysdk;
  }
  try {
    // Страховка от зависшего init (медленная сеть / чужой домен): через 5с — мок.
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000));
    ysdk = await Promise.race([YaGames.init(), timeout]);
    console.info('[sdk] Yandex Games SDK инициализирован.');
  } catch (e) {
    isMock = true;
    ysdk = createMockSdk();
    console.warn('[sdk] Ошибка YaGames.init(), мок-режим:', e);
  }
  return ysdk;
}

/** Сигнал платформе, что игра загрузилась (обязательное требование Яндекс Игр). */
export function signalReady() {
  try {
    ysdk?.features?.LoadingAPI?.ready?.();
  } catch (e) {
    /* noop */
  }
}

export function isMockMode() {
  return isMock;
}

/**
 * Показать полноэкранную рекламу.
 * @param {{onOpen?:Function, onClose?:Function}} hooks — пауза/возобновление игры и звука.
 */
export function showFullscreenAd(hooks = {}) {
  if (!ysdk?.adv?.showFullscreenAdv) {
    hooks.onClose?.(false);
    return;
  }
  try {
    ysdk.adv.showFullscreenAdv({
      callbacks: {
        onOpen: () => hooks.onOpen?.(),
        onClose: (wasShown) => hooks.onClose?.(wasShown),
        onError: (error) => {
          console.warn('[sdk] adv error:', error);
          hooks.onClose?.(false);
        }
      }
    });
  } catch (e) {
    console.warn('[sdk] showFullscreenAdv exception:', e);
    hooks.onClose?.(false);
  }
}

/**
 * Загрузить облачные данные игрока (с фолбэком на localStorage).
 * @param {string[]} keys
 */
export async function loadPlayerData(keys) {
  // 1) Всегда читаем localStorage — мгновенный старт.
  const local = {};
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + k);
      if (raw != null) local[k] = JSON.parse(raw);
    } catch (_) { /* ignore */ }
  }

  // 2) Пробуем облачные данные поверх локальных (они приоритетнее).
  try {
    if (!player && ysdk?.getPlayer) {
      player = await ysdk.getPlayer({ scopes: false });
    }
    if (player?.getData) {
      const cloud = await player.getData(keys, false);
      return { ...local, ...Object.fromEntries(Object.entries(cloud).filter(([, v]) => v != null)) };
    }
  } catch (e) {
    console.warn('[sdk] player.getData недоступен, используем localStorage:', e);
  }
  return local;
}

/**
 * Сохранить данные игрока (облако + localStorage).
 */
export async function savePlayerData(data) {
  for (const [k, v] of Object.entries(data)) {
    try {
      localStorage.setItem(LS_PREFIX + k, JSON.stringify(v));
    } catch (_) { /* ignore */ }
  }
  try {
    if (!player && ysdk?.getPlayer) {
      player = await ysdk.getPlayer({ scopes: false });
    }
    await player?.setData?.(data, false);
  } catch (e) {
    console.warn('[sdk] player.setData недоступен:', e);
  }
}
