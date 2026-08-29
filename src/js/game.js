/**
 * game.js — ядро правил Блэкджека (без DOM, полностью тестируемое).
 *
 * Правила:
 *  - 6-колодный шуз, перетасовка при проникновении < 25%.
 *  - Дилер добирает до 17 (включая мягкие 17 — стоит на всех 17).
 *  - Блэкджек платит 3:2, обычный выигрыш 1:1, ничья — возврат ставки.
 *  - Действия игрока: Hit (Ещё), Stand (Хватит), Double Down (Удвоить).
 *
 * Архитектура: конечный автомат + события. UI подписывается на события
 * и проигрывает анимации; ядро ждёт ровно столько, сколько длится анимация.
 */

import { Shoe, handValue } from './deck.js';
import { getProfile, setBalance, updateStats, persistProfile } from './storage.js';

export const PHASE = {
  BETTING: 'betting',   // игрок набирает ставку фишками
  DEALING: 'dealing',   // анимация начальной раздачи
  PLAYER: 'player',     // ход игрока (hit / stand / double)
  DEALER: 'dealer',     // вскрытие и добор дилера
  SETTLE: 'settle'      // показ результата
};

const DEAL_ANIM_MS = 420;   // время подлёта одной карты
const FLIP_ANIM_MS = 450;   // время переворота рубашки
const DEALER_STEP_MS = 620; // пауза между картами дилера

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export class BlackjackGame {
  constructor({ onEvent = () => {} } = {}) {
    this.shoe = new Shoe(6, 0.25);
    this.onEvent = onEvent;

    this.phase = PHASE.BETTING;
    this.bet = 0;
    this.playerCards = [];
    this.dealerCards = [];
    this.holeDown = true;
    this.roundActive = false;
    this.roundsSinceAd = 0;
    this.lastResult = null;
    this._lock = false; // защита от двойных нажатий
  }

  emit(type, payload) {
    this.onEvent(type, payload, this);
  }

  /* ─────────── Ставки ─────────── */

  get minBet() { return 10; }

  placeChip(amount) {
    if (this.phase !== PHASE.BETTING) return false;
    const balance = getProfile().balance;
    if (amount > balance - this.bet) return false; // нельзя поставить больше баланса
    this.bet += amount;
    this.emit('bet', { bet: this.bet });
    return true;
  }

  clearBet() {
    if (this.phase !== PHASE.BETTING) return;
    this.bet = 0;
    this.emit('bet', { bet: 0 });
  }

  /** Повторить прошлую ставку (если хватает денег). */
  rebet() {
    if (this.phase !== PHASE.BETTING) return false;
    const last = getProfile().lastBet;
    if (last > 0 && last <= getProfile().balance) {
      this.bet = last;
      this.emit('bet', { bet: this.bet });
      return true;
    }
    return false;
  }

  get canDouble() {
    return (
      this.phase === PHASE.PLAYER &&
      this.playerCards.length === 2 &&
      getProfile().balance >= this.bet // ставка уже списана, нужно ещё столько же
    );
  }

  /* ─────────── Раздача ─────────── */

  async deal() {
    if (this.phase !== PHASE.BETTING || this.bet < this.minBet || this._lock) return;
    this._lock = true;

    // новая раздача из чистого состояния
    this.playerCards = [];
    this.dealerCards = [];
    this.holeDown = true;
    this.lastResult = null;

    if (this.shoe.needsShuffle) {
      this.shoe.reshuffle();
      this.emit('shuffle');
      await delay(600);
    }

    setBalance(getProfile().balance - this.bet); // ставка списывается сразу
    getProfile().lastBet = this.bet;
    persistProfile();

    this._setPhase(PHASE.DEALING);
    this.emit('round-start');

    // П, Д, П, Д(рубашкой вниз)
    const order = [
      ['player', false],
      ['dealer', false],
      ['player', false],
      ['dealer', true]
    ];
    for (const [who, faceDown] of order) {
      this._giveCard(who, faceDown);
      this.emit('card', { who, faceDown });
      await delay(DEAL_ANIM_MS);
    }

    const pv = handValue(this.playerCards);
    const dv = handValue(this.dealerCards);

    // У игрока натуральный блэкджек — сразу к вскрытию
    if (pv.isBlackjack || dv.isBlackjack) {
      this._setPhase(PHASE.DEALER);
      await this._revealHole();
      await this._settle();
      this._lock = false;
      return;
    }

    this._setPhase(PHASE.PLAYER);
    this._lock = false;
  }

  _giveCard(who, faceDown = false) {
    const card = this.shoe.dealOne();
    card.faceDown = faceDown;
    (who === 'player' ? this.playerCards : this.dealerCards).push(card);
    return card;
  }

  /* ─────────── Ход игрока ─────────── */

  async hit() {
    if (this.phase !== PHASE.PLAYER || this._lock) return;
    this._lock = true;

    this._giveCard('player');
    this.emit('card', { who: 'player' });
    await delay(DEAL_ANIM_MS);

    const pv = handValue(this.playerCards);
    if (pv.bust) {
      this.emit('player-bust');
      this._setPhase(PHASE.DEALER);
      await this._revealHole();
      await this._settle();
    }
    this._lock = false;
  }

  async stand() {
    if (this.phase !== PHASE.PLAYER || this._lock) return;
    this._lock = true;
    this._setPhase(PHASE.DEALER);
    await this._dealerPlay();
    await this._settle();
    this._lock = false;
  }

  /** Удвоение: +ставка, ровно одна карта, затем ход дилера. */
  async double() {
    if (!this.canDouble || this._lock) return;
    this._lock = true;

    setBalance(getProfile().balance - this.bet); // вторая ставка
    this.bet *= 2;
    this.emit('bet-doubled', { bet: this.bet });

    this._giveCard('player');
    this.emit('card', { who: 'player' });
    await delay(DEAL_ANIM_MS);

    this._setPhase(PHASE.DEALER);
    await this._revealHole();

    const pv = handValue(this.playerCards);
    if (!pv.bust) await this._dealerPlay();
    else this.emit('player-bust');
    await this._settle();
    this._lock = false;
  }

  /* ─────────── Дилер ─────────── */

  async _revealHole() {
    const hole = this.dealerCards.find((c) => c.faceDown);
    if (hole) {
      hole.faceDown = false;
      this.holeDown = false;
      this.emit('reveal', { card: hole });
      await delay(FLIP_ANIM_MS + 150);
    }
  }

  async _dealerPlay() {
    await this._revealHole();
    // Дилер добирает до 17 (стоит на всех 17, включая мягкие).
    while (handValue(this.dealerCards).total < 17) {
      await delay(DEALER_STEP_MS);
      this._giveCard('dealer');
      this.emit('card', { who: 'dealer' });
      await delay(DEAL_ANIM_MS);
    }
    if (handValue(this.dealerCards).bust) this.emit('dealer-bust');
  }

  /* ─────────── Расчёт ─────────── */

  async _settle() {
    this._setPhase(PHASE.SETTLE);
    const pv = handValue(this.playerCards);
    const dv = handValue(this.dealerCards);
    const bet = this.bet;

    let type; // win | lose | push | blackjack
    let payout = 0; // сколько вернётся игроку (без учёта уже списанной ставки)

    if (pv.bust) {
      type = 'lose';
    } else if (pv.isBlackjack && !dv.isBlackjack) {
      type = 'blackjack';
      payout = bet + Math.floor(bet * 1.5); // возврат ставки + выплата 3:2
    } else if (dv.bust || pv.total > dv.total) {
      type = 'win';
      payout = bet * 2;
    } else if (pv.total === dv.total) {
      if (pv.isBlackjack && dv.isBlackjack) { type = 'push'; payout = bet; }
      else { type = 'push'; payout = bet; }
    } else {
      type = 'lose';
    }

    if (payout > 0) setBalance(getProfile().balance + payout);
    updateStats(type);
    persistProfile(true);

    this.lastResult = { type, payout, delta: payout - bet, playerTotal: pv.total, dealerTotal: dv.total };
    this.roundsSinceAd++;
    this.emit('result', this.lastResult);

    await delay(1500); // даём игроку рассмотреть результат
    this._setPhase(PHASE.BETTING);
    this.bet = 0;
    this.emit('bet', { bet: 0 });
    this.emit('round-end');
  }

  _setPhase(p) {
    this.phase = p;
    this.emit('phase', { phase: p });
  }

  /* ─────────── Хелперы для UI ─────────── */

  playerValue() {
    return handValue(this.playerCards);
  }

  dealerValue(hidden = true) {
    if (hidden && this.holeDown) {
      return handValue(this.dealerCards.filter((c) => !c.faceDown));
    }
    return handValue(this.dealerCards);
  }
}
