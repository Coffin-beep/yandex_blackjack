/**
 * deck.js — «чистая» логика колоды и подсчёта очков (без DOM).
 * Используется и в браузере, и в node-тестах.
 */

export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

/** Стоимость карты (туз считается и как 11, и как 1 — см. handValue). */
export function cardValue(rank) {
  if (rank === 'A') return 11;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

/** Собрать одну 52-карточную колоду. */
export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit, id: `${rank}${suit}` });
    }
  }
  return deck;
}

/** Перемешивание Фишера–Йетса (crypto-энтропия, если доступна). */
export function shuffle(cards) {
  const arr = cards.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    // crypto.getRandomValues даёт честную случайность; Math.random — фолбэк для node/старых окружений
    let j;
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    } else {
      j = Math.floor(Math.random() * (i + 1));
    }
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Шуз из нескольких колод (как в казино — 6 колод).
 * Reshuffle происходит, когда осталось меньше `penetration` карт.
 */
export class Shoe {
  constructor(numDecks = 6, penetration = 0.25) {
    this.numDecks = numDecks;
    this.penetration = penetration;
    this.cards = [];
    this.reshuffle();
  }

  reshuffle() {
    this.cards = [];
    for (let i = 0; i < this.numDecks; i++) {
      this.cards.push(...shuffle(createDeck()));
    }
  }

  get remaining() {
    return this.cards.length;
  }

  /** Нужно ли тасовать после конца раздачи. */
  get needsShuffle() {
    return this.remaining < this.numDecks * 52 * this.penetration;
  }

  dealOne() {
    if (this.cards.length === 0) this.reshuffle();
    return this.cards.pop();
  }
}

/**
 * Подсчёт очков руки: тузы 11 или 1 (самый выгодный для игрока вариант ≤ 21).
 * @returns {{total:number, soft:boolean, bust:boolean, isBlackjack:boolean}}
 */
export function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    const v = cardValue(c.rank);
    total += v;
    if (v === 11) aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return {
    total,
    soft: aces > 0,
    bust: total > 21,
    isBlackjack: cards.length === 2 && total === 21
  };
}

/** Человекочитаемая сумма: «7/17» для мягкой руки, иначе «17». */
export function formatHandValue(cards, hideSecond = false) {
  const visible = hideSecond ? cards.slice(0, 1) : cards;
  const { total, soft } = handValue(visible);
  if (soft && total !== 21) return `${total - 10}/${total}`;
  return `${total}`;
}
