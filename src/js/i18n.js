/**
 * i18n.js — локализация и автоопределение языка (п. 2.14 Требований Яндекс Игр).
 *
 * Язык берётся из SDK: ysdk.environment.i18n.lang — язык портала, на котором
 * открыл игру пользователь. Модерация проверяет это через debug-панель,
 * переключая язык и перезапуская игру.
 *
 * Поддержанные словари: ru, en. Языки СНГ (be, kk, uz…) fallback на русский,
 * остальные — на английский. В черновике Консоли нужно заявлять только те
 * языки, что реально есть (Русский + English).
 */

const DICTS = {
  ru: {
    title: 'Блэкджек — Казино',
    aria_game: 'Блэкджек',
    balance_title: 'Ваш баланс',
    hud_title: 'BLACKJACK · выплата 3:2',
    arc: 'БЛЭКДЖЕК · ВЫПЛАТА 3 К 2',
    shoe: 'ШУЗ',
    dealer: 'ДИЛЕР',
    you: 'ВЫ',
    status_bet: 'Сделайте ставку',
    status_dealing: 'Раздача…',
    status_player: 'Ваш ход — ещё карту или хватит?',
    status_dealer: 'Дилер играет…',
    status_shuffle: '🔀 Перетасовка колоды…',
    status_dealer_bust: 'У дилера перебор!',
    bet_label: 'Ставка: {bet}',
    btn_deal: '🂡 Раздать',
    btn_clear: 'Очистить',
    btn_rebet: 'Повторить',
    btn_bonus: '🎁 Бонус +1000',
    btn_hit: 'Ещё',
    btn_stand: 'Хватит',
    btn_double: '×2 Удвоить',
    result_blackjack: 'БЛЭКДЖЕК! +{delta} 🎉',
    result_win: 'Вы выиграли +{delta}!',
    result_bust: 'Перебор! −{abs}',
    result_lose: 'Дилер выиграл −{abs}',
    result_push: 'Ничья — ставка возвращена',
    ad_text: 'Реклама…',
    close: 'Закрыть',
    rules_btn_title: 'Правила игры',
    settings_btn_title: 'Настройки звука',
    settings_title: '⚙️ Настройки',
    set_music: '🎶 Музыка',
    set_music_sub: 'Фоновая музыка стола',
    set_music_vol: 'Громкость музыки',
    set_sfx: '🔊 Звуки',
    set_sfx_sub: 'Карты, фишки, выигрыши',
    set_sfx_vol: 'Громкость звуков',
    rules_html: `
          <h2>♠ Правила Блэкджека</h2>
          <p><b>Цель:</b> набрать сумму очков ближе к <b>21</b>, чем у дилера, но не перебрать.</p>
          <h3>Стоимость карт</h3>
          <ul>
            <li>2–10 — по номиналу</li>
            <li>Валет, Дама, Король — <b>10</b></li>
            <li>Туз — <b>1 или 11</b> (как выгоднее руке)</li>
          </ul>
          <h3>Ход игры</h3>
          <ol>
            <li>Сделайте ставку фишками и нажмите «Раздать».</li>
            <li>Вам и дилеру раздают по 2 карты (одна карта дилера закрыта).</li>
            <li>Ваш ход: берите карты или останавливайтесь.</li>
            <li>Дилер вскрывает карту и добирает до 17.</li>
            <li>Подсчёт результата и выплата.</li>
          </ol>
          <h3>Действия игрока</h3>
          <ul>
            <li><b>Ещё (Hit)</b> — взять следующую карту.</li>
            <li><b>Хватит (Stand)</b> — остановиться и передать ход дилеру.</li>
            <li><b>×2 Удвоить (Double Down)</b> — удвоить ставку и получить ровно одну карту. Доступно только на первых двух картах.</li>
          </ul>
          <h3>Выплаты</h3>
          <ul class="payouts">
            <li><span>Блэкджек (21 с двух карт)</span><b>3 : 2</b></li>
            <li><span>Обычный выигрыш</span><b>1 : 1</b></li>
            <li><span>Ничья (равные счёта)</span><b>ставка возвращается</b></li>
          </ul>
          <h3>Дилер</h3>
          <p>Дилер добирает карты, пока сумма меньше 17, и останавливается на 17 (включая мягкие 17, например А+6).</p>
          <p class="hint">Перебор — проигрыш, даже если дилер тоже перебрал бы позже. Ставки — фишками 10–500, баланс сохраняется автоматически. Банкрот? Жмите «Бонус +1000».</p>
          <p class="hint">Клавиши: <kbd>H</kbd> — ещё, <kbd>S</kbd> — хватит, <kbd>D</kbd> — удвоить, <kbd>Пробел</kbd> — раздать, <kbd>R</kbd> — повторить ставку.</p>`
  },

  en: {
    title: 'Blackjack — Casino',
    aria_game: 'Blackjack',
    balance_title: 'Your balance',
    hud_title: 'BLACKJACK · PAYS 3:2',
    arc: 'BLACKJACK PAYS 3 TO 2',
    shoe: 'SHOE',
    dealer: 'DEALER',
    you: 'YOU',
    status_bet: 'Place your bet',
    status_dealing: 'Dealing…',
    status_player: 'Your move — hit or stand?',
    status_dealer: 'Dealer is playing…',
    status_shuffle: '🔀 Shuffling the deck…',
    status_dealer_bust: 'Dealer busts!',
    bet_label: 'Bet: {bet}',
    btn_deal: '🂡 DEAL',
    btn_clear: 'CLEAR',
    btn_rebet: 'REBET',
    btn_bonus: '🎁 BONUS +1000',
    btn_hit: 'HIT',
    btn_stand: 'STAND',
    btn_double: '×2 DOUBLE',
    result_blackjack: 'BLACKJACK! +{delta} 🎉',
    result_win: 'You win +{delta}!',
    result_bust: 'Bust! −{abs}',
    result_lose: 'Dealer wins −{abs}',
    result_push: 'Push — bet returned',
    ad_text: 'Advertisement…',
    close: 'Close',
    rules_btn_title: 'Game rules',
    settings_btn_title: 'Sound settings',
    settings_title: '⚙️ Settings',
    set_music: '🎶 Music',
    set_music_sub: 'Background table music',
    set_music_vol: 'Music volume',
    set_sfx: '🔊 Sounds',
    set_sfx_sub: 'Cards, chips, wins',
    set_sfx_vol: 'Sound volume',
    rules_html: `
          <h2>♠ Blackjack Rules</h2>
          <p><b>Goal:</b> get a total closer to <b>21</b> than the dealer’s without going over.</p>
          <h3>Card values</h3>
          <ul>
            <li>2–10 — face value</li>
            <li>Jack, Queen, King — <b>10</b></li>
            <li>Ace — <b>1 or 11</b> (whichever is better for the hand)</li>
          </ul>
          <h3>How a round plays</h3>
          <ol>
            <li>Place your bet with chips and press “DEAL”.</li>
            <li>You and the dealer each get two cards (one dealer card is face down).</li>
            <li>Your turn: draw cards or stop.</li>
            <li>The dealer reveals the hole card and draws up to 17.</li>
            <li>The round is settled and paid out.</li>
          </ol>
          <h3>Player actions</h3>
          <ul>
            <li><b>Hit</b> — take one more card.</li>
            <li><b>Stand</b> — stop and pass the turn to the dealer.</li>
            <li><b>×2 Double Down</b> — double your bet and receive exactly one card. Available only on your first two cards.</li>
          </ul>
          <h3>Payouts</h3>
          <ul class="payouts">
            <li><span>Blackjack (21 with two cards)</span><b>3 : 2</b></li>
            <li><span>Regular win</span><b>1 : 1</b></li>
            <li><span>Push (equal totals)</span><b>bet is returned</b></li>
          </ul>
          <h3>Dealer</h3>
          <p>The dealer draws while the total is under 17 and stands on all 17s (including soft 17, e.g. A+6).</p>
          <p class="hint">Busting loses the round immediately, even if the dealer would bust later. Bets are made with 10–500 chips; your balance is saved automatically. Out of chips? Press “BONUS +1000”.</p>
          <p class="hint">Keys: <kbd>H</kbd> — hit, <kbd>S</kbd> — stand, <kbd>D</kbd> — double, <kbd>Space</kbd> — deal, <kbd>R</kbd> — rebet.</p>`
  }
};

/** Языки без собственного словаря → показываем русский (СНГ), остальным — английский. */
const FALLBACK = {
  be: 'ru', kk: 'ru', uz: 'ru', ky: 'ru', tg: 'ru', az: 'ru', hy: 'ru', ka: 'ru', mo: 'ru'
};

let lang = 'ru';

/**
 * Инициализация языка портала из SDK (ysdk.environment.i18n.lang).
 * Вызывается один раз после initSDK(), до создания UI.
 * @returns {string} выбранный язык ('ru' | 'en')
 */
export function initLang(rawLang) {
  const primary = String(rawLang || '').split('-')[0].toLowerCase();
  lang = DICTS[primary] ? primary : FALLBACK[primary] || 'en';
  try {
    document.documentElement.lang = lang;
    document.title = DICTS[lang].title;
  } catch (_) { /* нет DOM (тесты) */ }
  return lang;
}

/** Перевод строки по ключу с подстановкой {параметров}. */
export function t(key, params) {
  const dict = DICTS[lang] || DICTS.ru;
  let str = dict[key] ?? DICTS.ru[key] ?? key;
  if (params) {
    str = str.replace(/\{(\w+)\}/g, (m, name) => (params[name] !== undefined ? params[name] : m));
  }
  return str;
}

export function getLang() {
  return lang;
}

/** Формат чисел: 1 000 (ru) / 1,000 (en). */
export function formatNumber(n) {
  return Number(n).toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US');
}
