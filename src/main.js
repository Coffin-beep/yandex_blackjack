/**
 * main.js — точка входа: инициализация SDK → загрузка профиля → запуск UI.
 */

import { initSDK, signalReady, isMockMode } from './js/sdk.js';
import { loadProfile } from './js/storage.js';
import { createUI } from './js/ui.js';
import { unlockAudio } from './js/audio.js';
import './styles/main.css';

async function bootstrap() {
  // 1) Параллельно: SDK + профиль (профиль ждёт SDK из-за облачных данных — сначала SDK)
  await initSDK();
  await loadProfile();

  // 2) Рисуем стол
  const app = document.getElementById('app');
  const loader = document.getElementById('boot-loader');
  loader?.remove();
  createUI(app);

  // 3) Сообщаем платформе о готовности (требование Яндекс Игр)
  signalReady();

  // Разблокировка звука по первому взаимодействию (политики мобильных браузеров)
  const unlock = () => {
    unlockAudio();
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
