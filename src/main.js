/**
 * main.js — точка входа: инициализация SDK → загрузка профиля → запуск UI.
 */

import { initSDK, signalReady, isMockMode, getSdkLang } from './js/sdk.js';
import { initLang } from './js/i18n.js';
import { loadProfile, getProfile } from './js/storage.js';
import { createUI } from './js/ui.js';
import { unlockAudio } from './js/audio.js';
import { startMusic } from './js/music.js';
import './styles/main.css';

async function bootstrap() {
  // 1) SDK → язык портала (п. 2.14: автоопределение через i18n.lang) → профиль
  await initSDK();
  initLang(getSdkLang() || navigator.language || 'ru');
  await loadProfile();

  // 2) Рисуем стол
  const app = document.getElementById('app');
  const loader = document.getElementById('boot-loader');
  loader?.remove();
  createUI(app);

  // 3) Сообщаем платформе о готовности (требование Яндекс Игр)
  signalReady();

  // Разблокировка звука по первому взаимодействию (политики мобильных браузеров)
  // + старт фоновой музыки, если она включена в настройках
  const unlock = () => {
    unlockAudio();
    if (getProfile().music) startMusic();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // Блокируем случайные жесты браузера в игре
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  if (isMockMode()) {
    console.info('Локальный режим: Yandex SDK недоступен, сохранения идут в localStorage.');
  }
}

bootstrap();
