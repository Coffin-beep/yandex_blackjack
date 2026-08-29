/**
 * Тесты «чистой» игровой логики: deck.js (без DOM).
 * Запуск: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, shuffle, handValue, formatHandValue, Shoe, cardValue } from '../src/js/deck.js';

test('колода содержит 52 уникальные карты', () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  const ids = new Set(deck.map((c) => c.id));
  assert.equal(ids.size, 52);
});

test('перемешивание сохраняет состав колоды', () => {
  const deck = createDeck();
  const shuffled = shuffle(deck);
  assert.equal(shuffled.length, 52);
  const a = new Set(shuffled.map((c) => c.id));
  const b = new Set(deck.map((c) => c.id));
  assert.deepEqual([...a].sort(), [...b].sort());
});

test('стоимость карт', () => {
  assert.equal(cardValue('A'), 11);
  assert.equal(cardValue('K'), 10);
  assert.equal(cardValue('Q'), 10);
  assert.equal(cardValue('J'), 10);
  assert.equal(cardValue('10'), 10);
  assert.equal(cardValue('7'), 7);
});

test('подсчёт очков: мягкий и жёсткий туз', () => {
  const c = (r) => ({ rank: r, suit: '♠' });
  assert.equal(handValue([c('A'), c('K')]).total, 21);
  assert.ok(handValue([c('A'), c('K')]).isBlackjack);
  assert.ok(handValue([c('A'), c('K')]).soft);

  // A + 6 = мягкие 17
  const soft17 = handValue([c('A'), c('6')]);
  assert.equal(soft17.total, 17);
  assert.ok(soft17.soft);

  // A + 6 + 10 = жёсткие 17 (туз стал единицей)
  const hard17 = handValue([c('A'), c('6'), c('10')]);
  assert.equal(hard17.total, 17);
  assert.ok(!hard17.soft);

  // A + A = 12 (один туз как 11, второй как 1)
  assert.equal(handValue([c('A'), c('A')]).total, 12);
});

test('перебор определяется корректно', () => {
  const c = (r) => ({ rank: r, suit: '♥' });
  const bust = handValue([c('K'), c('Q'), c('5')]);
  assert.equal(bust.total, 25);
  assert.ok(bust.bust);
  assert.ok(!handValue([c('K'), c('Q'), c('A')]).bust); // 21, туз = 1
});

test('блэкджек — только 2 карты на 21', () => {
  const c = (r) => ({ rank: r, suit: '♦' });
  assert.ok(!handValue([c('7'), c('7'), c('7')]).isBlackjack);
  assert.ok(handValue([c('A'), c('10')]).isBlackjack);
});

test('формат мягкой руки: «7/17»', () => {
  const c = (r) => ({ rank: r, suit: '♣' });
  assert.equal(formatHandValue([c('A'), c('6')]), '7/17');
  assert.equal(formatHandValue([c('K'), c('7')]), '17');
});

test('шуз из 6 колод раздаёт валидные карты и перетасовывается', () => {
  const shoe = new Shoe(6, 0.25);
  assert.equal(shoe.remaining, 312);
  const card = shoe.dealOne();
  assert.ok(card && card.rank && card.suit);
  assert.equal(shoe.remaining, 311);

  // флаг перетасовки срабатывает при 25% проникновении
  shoe.cards = shoe.cards.slice(0, 77); // < 78 карт
  assert.ok(shoe.needsShuffle);
});
