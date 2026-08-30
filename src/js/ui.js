/**
 * ui.js — весь DOM, анимации и обработчики.
 * Подписывается на события BlackjackGame и рисует стол казино.
 * Все тексты берутся из i18n.js (язык определён до создания UI).
 */

import { BlackjackGame, PHASE } from './game.js';
import { getProfile, setBalance, persistProfile } from './storage.js';
import { formatHandValue } from './deck.js';
import { sfx, setSoundEnabled, setSfxVolume } from './audio.js';
import { setMusicEnabled, setMusicVolume } from './music.js';
import { showFullscreenAd } from './sdk.js';
import { t, formatNumber } from './i18n.js';

const CHIPS = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 500, label: '500' }
];

const RESULT_TEXT = {
  blackjack: (r) => t('result_blackjack', { delta: r.delta }),
  win: (r) => t('result_win', { delta: r.delta }),
  lose: (r) => (r.playerTotal > 21 ? t('result_bust', { abs: r.delta }) : t('result_lose', { abs: Math.abs(r.delta) })),
  push: () => t('result_push')
};

let uid = 0;

export function createUI(root) {
  /* ─────────── Разметка ─────────── */

  root.innerHTML = `
    <div id="game" class="table">
      <header class="hud">
        <div class="hud-left">
          <div class="balance-box" title="${t('balance_title')}">
            <span class="chip-icon"></span>
            <span id="balance">0</span>
          </div>
        </div>
        <div class="hud-center" id="table-name">${t('hud_title')}</div>
        <div class="hud-right">
          <button id="btn-rules" class="icon-btn" title="${t('rules_btn_title')}">❓</button>
          <button id="btn-settings" class="icon-btn" title="${t('settings_btn_title')}">⚙️</button>
        </div>
      </header>

      <div class="shoe" id="shoe" aria-hidden="true">
        <div class="shoe-stack"></div>
        <div class="shoe-label">${t('shoe')}</div>
      </div>

      <main class="table-felt">
        <section class="hand-area dealer">
          <div class="area-label">
            ${t('dealer')} <span class="score-badge" id="dealer-score">—</span>
          </div>
          <div class="hand" id="dealer-hand"></div>
        </section>

        <div class="center-zone">
          <div class="arc-text">${t('arc')}</div>
          <div class="pot" id="pot"></div>
          <div class="pot-label" id="pot-label"></div>
          <div class="status" id="status">${t('status_bet')}</div>
        </div>

        <section class="hand-area player">
          <div class="hand" id="player-hand"></div>
          <div class="area-label">
            ${t('you')} <span class="score-badge" id="player-score">—</span>
          </div>
        </section>

        <div class="banner" id="banner"></div>
      </main>

      <footer class="controls">
        <div class="chip-rack" id="chip-rack"></div>
        <div class="btn-row" id="btn-row"></div>
      </footer>

      <div class="ad-overlay" id="ad-overlay">
        <div class="ad-box"><div class="spinner"></div>${t('ad_text')}</div>
      </div>

      <!-- ───────── Модальное окно: правила ───────── -->
      <div class="modal-backdrop" id="rules-modal">
        <div class="modal">
          <button class="modal-close" data-close title="${t('close')}">✕</button>
          ${t('rules_html')}
        </div>
      </div>

      <!-- ───────── Модальное окно: настройки ───────── -->
      <div class="modal-backdrop" id="settings-modal">
        <div class="modal">
          <button class="modal-close" data-close title="${t('close')}">✕</button>
          <h2>${t('settings_title')}</h2>

          <div class="setting-row">
            <div class="setting-info"><b>${t('set_music')}</b><span>${t('set_music_sub')}</span></div>
            <label class="switch"><input type="checkbox" id="opt-music"><span class="track"></span></label>
          </div>
          <div class="setting-row">
            <div class="setting-info"><b>${t('set_music_vol')}</b></div>
            <input type="range" id="opt-music-vol" min="0" max="1" step="0.05" />
          </div>

          <div class="setting-row">
            <div class="setting-info"><b>${t('set_sfx')}</b><span>${t('set_sfx_sub')}</span></div>
            <label class="switch"><input type="checkbox" id="opt-sfx"><span class="track"></span></label>
          </div>
          <div class="setting-row">
            <div class="setting-info"><b>${t('set_sfx_vol')}</b></div>
            <input type="range" id="opt-sfx-vol" min="0" max="1" step="0.05" />
          </div>
        </div>
      </div>
    </div>
  `;

  root.setAttribute('aria-label', t('aria_game'));

  const $ = (sel) => root.querySelector(sel);
  const els = {
    balance: $('#balance'),
    rulesBtn: $('#btn-rules'),
    settingsBtn: $('#btn-settings'),
    modals: [...root.querySelectorAll('.modal-backdrop')],
    optMusic: $('#opt-music'),
    optMusicVol: $('#opt-music-vol'),
    optSfx: $('#opt-sfx'),
    optSfxVol: $('#opt-sfx-vol'),
    shoe: $('#shoe'),
    dealerHand: $('#dealer-hand'),
    playerHand: $('#player-hand'),
    dealerScore: $('#dealer-score'),
    playerScore: $('#player-score'),
    status: $('#status'),
    pot: $('#pot'),
    potLabel: $('#pot-label'),
    banner: $('#banner'),
    chipRack: $('#chip-rack'),
    btnRow: $('#btn-row'),
    adOverlay: $('#ad-overlay')
  };

  let cardEls = new Map(); // uid -> element
  let lastAdTime = Date.now();
  let bannerTimer = null; // автоскрытие баннера результата
  let game;

  /* ─────────── Кнопки ─────────── */

  const BUTTONS = {
    deal: { label: t('btn_deal'), cls: 'primary', fn: () => { hideBanner(); maybeAdThen(() => game.deal()); } },
    clear: { label: t('btn_clear'), fn: () => { game.clearBet(); hideBanner(); sfx.chip(); } },
    rebet: { label: t('btn_rebet'), fn: () => { game.rebet(); hideBanner(); sfx.chip(); } },
    bonus: { label: t('btn_bonus'), cls: 'bonus', fn: () => { setBalance(getProfile().balance + 1000); sfx.win(); renderBalance(); renderControls(); } },
    hit: { label: t('btn_hit'), cls: 'primary', fn: () => game.hit() },
    stand: { label: t('btn_stand'), cls: 'danger', fn: () => game.stand() },
    double: { label: t('btn_double'), cls: 'accent', fn: () => game.double() }
  };

  /* ─────────── Игра и события ─────────── */

  game = new BlackjackGame({ onEvent: handleEvent });

  function handleEvent(type, payload) {
    switch (type) {
      case 'bet': renderPot(); renderBalance(); renderControls(); break;
      case 'bet-doubled': renderPot(); renderBalance(); break;
      case 'round-start': clearTable(); hideBanner(); renderControls(); break;
      case 'card': addCard(payload); break;
      case 'reveal': revealCard(payload.card); break;
      case 'phase': onPhase(payload.phase); break;
      case 'result': showResult(payload); break;
      case 'shuffle': setStatus(t('status_shuffle')); sfx.flip(); break;
      case 'player-bust': break;
      case 'dealer-bust': setStatus(t('status_dealer_bust')); break;
      case 'round-end': renderControls(); break;
    }
  }

  function onPhase(p) {
    switch (p) {
      case PHASE.BETTING: setStatus(t('status_bet')); renderControls(); break;
      case PHASE.DEALING: setStatus(t('status_dealing')); renderControls(); break;
      case PHASE.PLAYER: setStatus(t('status_player')); renderControls(); break;
      case PHASE.DEALER: setStatus(t('status_dealer')); renderControls(); break;
      case PHASE.SETTLE: renderControls(); break;
    }
    renderScores();
  }

  /* ─────────── Рендер: карта ─────────── */

  function renderCardEl(card) {
    const el = document.createElement('div');
    el.className = 'card face-down' + (isRed(card) ? ' red' : '');
    el.innerHTML = `
      <div class="card-inner">
        <div class="card-face front">
          <div class="corner top"><b>${card.rank}</b><i>${card.suit}</i></div>
          <div class="pip">${card.suit}</div>
          <div class="corner bottom"><b>${card.rank}</b><i>${card.suit}</i></div>
        </div>
        <div class="card-face back"></div>
      </div>`;
    return el;
  }

  function isRed(card) {
    return card.suit === '♥' || card.suit === '♦';
  }

  function addCard({ who, faceDown }) {
    const hand = who === 'player' ? els.playerHand : els.dealerHand;
    const cards = who === 'player' ? game.playerCards : game.dealerCards;
    const card = cards[cards.length - 1];
    card.uid = ++uid;

    const el = renderCardEl(card);
    cardEls.set(card.uid, el);
    hand.appendChild(el);

    // Подлёт карты от шуза к руке
    const from = els.shoe.getBoundingClientRect();
    const to = el.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    el.style.transform = `translate(${dx}px, ${dy}px) rotate(-10deg) scale(.8)`;
    el.style.opacity = '0';

    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = 'transform .38s cubic-bezier(.2,.75,.25,1), opacity .3s ease';
      el.style.transform = '';
      el.style.opacity = '1';
    }));

    sfx.card();
    setTimeout(() => {
      // Прилетела лицом вниз — открываем, если карта не закрытая
      if (!faceDown) {
        el.classList.remove('face-down');
        sfx.flip();
      }
      renderScores();
    }, 400);
    renderScores();
  }

  function revealCard(card) {
    const el = cardEls.get(card.uid);
    if (el) {
      el.classList.remove('face-down');
      sfx.flip();
    }
    renderScores();
  }

  function clearTable() {
    els.playerHand.innerHTML = '';
    els.dealerHand.innerHTML = '';
    cardEls.clear();
    renderScores();
  }

  /* ─────────── Рендер: очки ─────────── */

  function renderScores() {
    const pv = game.playerValue();
    const pText = game.playerCards.length ? formatHandValue(game.playerCards) : '—';
    els.playerScore.textContent = pText;
    els.playerScore.classList.toggle('bust', pv?.bust);
    els.playerScore.classList.toggle('bj', pv?.isBlackjack);
    pop(els.playerScore);

    const hidden = game.holeDown && game.phase !== PHASE.BETTING;
    const dCards = hidden ? game.dealerCards.filter((c) => !c.faceDown) : game.dealerCards;
    const dText = dCards.length ? formatHandValue(dCards) + (hidden && game.dealerCards.length > 1 ? '+?' : '') : '—';
    els.dealerScore.textContent = dText;
    const dv = game.dealerValue();
    els.dealerScore.classList.toggle('bust', !hidden && dv.bust);
    els.dealerScore.classList.toggle('bj', !hidden && dv.isBlackjack);
    pop(els.dealerScore);
  }

  function pop(el) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  /* ─────────── Рендер: банк, ставка ─────────── */

  function renderBalance() {
    els.balance.textContent = formatNumber(getProfile().balance);
    pop(els.balance.parentElement);
  }

  function renderPot() {
    const bet = game.bet;
    els.pot.innerHTML = '';
    if (bet > 0) {
      chipBreakdown(bet).forEach((v, i) => {
        const c = document.createElement('div');
        c.className = `chip chip-${v} in-pot`;
        c.style.setProperty('--i', i);
        c.style.left = `${(i % 5) * -4}px`;
        c.style.top = `${-Math.min(i, 7) * 4}px`; // стопка не растёт бесконечно вверх
        c.innerHTML = `<span>${v}</span>`;
        els.pot.appendChild(c);
      });
      els.potLabel.textContent = t('bet_label', { bet: formatNumber(bet) });
    } else {
      els.potLabel.textContent = '';
    }
  }

  function chipBreakdown(amount) {
    const out = [];
    let rest = amount;
    for (let i = CHIPS.length - 1; i >= 0; i--) {
      while (rest >= CHIPS[i].value && out.length < 12) {
        out.push(CHIPS[i].value);
        rest -= CHIPS[i].value;
      }
    }
    return out;
  }

  /* ─────────── Рендер: контролы ─────────── */

  function renderControls() {
    const p = game.phase;
    let ids = [];

    if (p === PHASE.BETTING) {
      const broke = getProfile().balance < game.minBet;
      ids = broke ? ['bonus'] : ['deal', 'clear', 'rebet'];
    } else if (p === PHASE.PLAYER) {
      ids = ['hit', 'double', 'stand'];
    }
    // В фазах DEALING / DEALER / SETTLE кнопки скрыты — идёт анимация

    els.btnRow.innerHTML = '';
    for (const id of ids) {
      const b = BUTTONS[id];
      const btn = document.createElement('button');
      btn.className = 'btn' + (b.cls ? ` ${b.cls}` : '');
      btn.textContent = b.label;
      btn.disabled =
        (id === 'deal' && game.bet < game.minBet) ||
        (id === 'clear' && game.bet === 0) ||
        (id === 'rebet' && (getProfile().lastBet < game.minBet || getProfile().lastBet > getProfile().balance)) ||
        (id === 'double' && !game.canDouble);
      btn.addEventListener('click', b.fn);
      els.btnRow.appendChild(btn);
    }

    // Чип-рейк доступен только в фазе ставок
    els.chipRack.classList.toggle('disabled', p !== PHASE.BETTING);
    renderChipsAvailability();
    fitLayout(); // высота панели кнопок меняется — проверяем, что всё влезает
  }

  function buildChipRack() {
    for (const c of CHIPS) {
      const el = document.createElement('button');
      el.className = `chip chip-${c.value} rack-chip`;
      el.dataset.value = c.value;
      el.innerHTML = `<span>${c.label}</span>`;
      el.addEventListener('click', () => {
        if (game.placeChip(c.value)) {
          hideBanner(); // баннер прошлого раунда не должен перекрывать ставки
          sfx.chip();
        }
      });
      els.chipRack.appendChild(el);
    }
  }

  function renderChipsAvailability() {
    const profile = getProfile();
    for (const el of els.chipRack.children) {
      const v = +el.dataset.value;
      el.classList.toggle('unavailable', game.phase !== PHASE.BETTING || v > profile.balance - game.bet);
    }
  }

  /* ─────────── Результаты ─────────── */

  function showResult(r) {
    const text = RESULT_TEXT[r.type]?.(r) ?? '';
    els.banner.textContent = text;
    els.banner.className = `banner show ${r.type}`;
    if (r.type === 'blackjack') sfx.blackjack();
    else if (r.type === 'win') sfx.win();
    else if (r.type === 'lose') sfx.lose();
    else sfx.push();
    renderBalance();

    // Баннер не должен висеть вечно: автоскрытие, а при любой новой ставке — мгновенно
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(hideBanner, 2600);
  }

  function hideBanner() {
    clearTimeout(bannerTimer);
    els.banner.className = 'banner';
  }

  function setStatus(text) {
    els.status.textContent = text;
  }

  /* ─────────── Реклама между раундами ─────────── */

  const AD_EVERY_N_ROUNDS = 3;
  const AD_COOLDOWN_MS = 65_000;

  function maybeAdThen(action) {
    const since = Date.now() - lastAdTime;
    if (game.roundsSinceAd >= AD_EVERY_N_ROUNDS && since > AD_COOLDOWN_MS) {
      lastAdTime = Date.now();
      game.roundsSinceAd = 0;
      els.adOverlay.classList.add('show');
      const wasSound = getProfile().sound;
      setSoundEnabled(false);
      showFullscreenAd({
        onOpen: () => {},
        onClose: () => {
          els.adOverlay.classList.remove('show');
          setSoundEnabled(wasSound);
          action();
        }
      });
    } else {
      action();
    }
  }

  /* ─────────── Модальные окна ─────────── */

  function openModal(m) {
    m.classList.add('open');
  }

  function closeModal(m) {
    m.classList.remove('open');
  }

  els.rulesBtn.addEventListener('click', () => openModal(els.modals[0]));

  els.settingsBtn.addEventListener('click', () => {
    syncSettingsUI();
    openModal(els.modals[1]);
  });

  for (const m of els.modals) {
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m); // клик по затемнению
    });
    m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeModal(m)));
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') els.modals.forEach(closeModal);
  });

  /* ─────────── Настройки звука ─────────── */

  function syncSettingsUI() {
    const p = getProfile();
    els.optMusic.checked = p.music;
    els.optMusicVol.value = p.musicVolume;
    els.optSfx.checked = p.sound;
    els.optSfxVol.value = p.sfxVolume;
  }

  els.optMusic.addEventListener('change', () => {
    const p = getProfile();
    p.music = els.optMusic.checked;
    persistProfile(true);
    setMusicEnabled(p.music); // включение стартует музыку сразу (жест уже был)
  });

  els.optMusicVol.addEventListener('input', () => {
    const p = getProfile();
    p.musicVolume = +els.optMusicVol.value;
    setMusicVolume(p.musicVolume);
    persistProfile();
  });

  els.optSfx.addEventListener('change', () => {
    const p = getProfile();
    p.sound = els.optSfx.checked;
    persistProfile(true);
    setSoundEnabled(p.sound);
    if (p.sound) sfx.chip();
  });

  els.optSfxVol.addEventListener('input', () => {
    const p = getProfile();
    p.sfxVolume = +els.optSfxVol.value;
    setSfxVolume(p.sfxVolume);
    persistProfile();
  });

  /* ─────────── Горячие клавиши (desktop) ─────────── */

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (game.phase === PHASE.PLAYER) {
      if (k === 'h' || k === 'е' || k === 'arrowup') game.hit();
      if (k === 's' || k === 'ы' || k === 'arrowdown') game.stand();
      if (k === 'd' || k === 'в') game.double();
    } else if (game.phase === PHASE.BETTING) {
      if (k === ' ' || k === 'enter') { e.preventDefault(); maybeAdThen(() => game.deal()); }
      if (k === 'r' || k === 'к') game.rebet();
    }
  });

  /* ─────────── Автоподбор размеров под экран ───────────
     На низких экранах центральная зона (ставка/статус/дуга) сжимается и её
     надписи уезжают под карты. Меряем «нехватку» места и пропорционально
     уменьшаем карты, при необходимости включая компактный режим. */
  const tableEl = root.querySelector('.table');
  const centerEl = root.querySelector('.center-zone');
  let fitRaf = null;

  function fitLayout() {
    cancelAnimationFrame(fitRaf);
    fitRaf = requestAnimationFrame(() => {
      // нет раскладки (jsdom/тесты) — выходим, CSS z-index всё равно страхует
      if (!centerEl || !isFinite(centerEl.clientHeight) || centerEl.clientHeight === 0) return;

      tableEl.classList.remove('compact');
      tableEl.style.removeProperty('--card-w');
      tableEl.style.removeProperty('--card-h');

      const squeeze = () => centerEl.scrollHeight - centerEl.clientHeight;
      if (squeeze() <= 1) return; // всё помещается — штатные размеры

      const applyW = (px) => {
        // важно переопределить ОБЕ переменные: --card-h вычисляется на :root
        tableEl.style.setProperty('--card-w', `${px}px`);
        tableEl.style.setProperty('--card-h', `${Math.round(px * 1.45)}px`);
      };

      // замер базовой ширины карты (зонд вне потока)
      const probe = document.createElement('div');
      probe.className = 'card';
      probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
      tableEl.appendChild(probe);
      let w = probe.offsetWidth || 70;
      probe.remove();

      // 1) шаг за шагом уменьшаем карты, пока центр не перестанет сжиматься
      for (let i = 0; i < 8 && w > 44; i++) {
        if (squeeze() <= 1) break;
        const dH = squeeze() / 2 + 10; // освобождаем обе руки (дилер + игрок)
        w = Math.max(44, Math.round((w * 1.45 - dH) / 1.45));
        applyW(w);
      }
      // 2) всё ещё тесно — компактный режим (прячем дугу, уплотняем центр)
      if (squeeze() > 1) tableEl.classList.add('compact');
      // 3) финальный проход уменьшения уже в компактном режиме
      for (let i = 0; i < 6 && w > 44; i++) {
        if (squeeze() <= 1) break;
        const dH = squeeze() / 2 + 10;
        w = Math.max(44, Math.round((w * 1.45 - dH) / 1.45));
        applyW(w);
      }
    });
  }

  window.addEventListener('resize', fitLayout);
  window.addEventListener('orientationchange', fitLayout);

  /* ─────────── Старт ─────────── */

  buildChipRack();
  renderBalance();
  renderPot();
  renderControls();
  setSoundEnabled(getProfile().sound);
  setSfxVolume(getProfile().sfxVolume);
  setMusicVolume(getProfile().musicVolume);
  // музыка стартует после первого жеста пользователя (см. main.js)
  fitLayout();
  if (document.fonts?.ready) document.fonts.ready.then(fitLayout);

  return { game };
}
