import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createBottomNavScrollState,
  getBottomNavMaxOffset,
  updateBottomNavScroll,
} from './bottom-nav-scroll.js';

test('includes the safe-area gap when calculating the hidden distance', () => {
  assert.equal(getBottomNavMaxOffset(96, 34), 131);
});

test('keeps the first scroll sample stationary', () => {
  const next = updateBottomNavScroll(
    createBottomNavScrollState(),
    120,
    96,
  );

  assert.deepEqual(next, {
    lastScrollTop: 120,
    offset: 0,
    direction: null,
    directionTravel: 0,
    engaged: false,
  });
});

test('waits for the small scroll threshold before moving the nav', () => {
  const next = updateBottomNavScroll(
    {
      lastScrollTop: 120,
      offset: 0,
      direction: null,
      directionTravel: 0,
      engaged: false,
    },
    124,
    96,
  );

  assert.equal(next.offset, 0);
  assert.equal(next.directionTravel, 4);
  assert.equal(next.engaged, false);
});

test('moves only the excess distance after the threshold is crossed', () => {
  const next = updateBottomNavScroll(
    {
      lastScrollTop: 124,
      offset: 0,
      direction: 1,
      directionTravel: 4,
      engaged: false,
    },
    132,
    96,
  );

  assert.equal(next.offset, 6);
  assert.equal(next.engaged, true);
});

test('requires hysteresis before reversing direction', () => {
  const next = updateBottomNavScroll(
    {
      lastScrollTop: 156,
      offset: 36,
      direction: 1,
      directionTravel: 0,
      engaged: true,
    },
    152,
    96,
  );

  assert.equal(next.offset, 36);
  assert.equal(next.direction, -1);
  assert.equal(next.directionTravel, 4);
  assert.equal(next.engaged, false);
});

test('reveals only the excess distance after reversing direction', () => {
  const next = updateBottomNavScroll(
    {
      lastScrollTop: 152,
      offset: 36,
      direction: -1,
      directionTravel: 4,
      engaged: false,
    },
    146,
    96,
  );

  assert.equal(next.offset, 32);
  assert.equal(next.engaged, true);
});

test('clamps the nav at its hidden distance', () => {
  const next = updateBottomNavScroll(
    {
      lastScrollTop: 100,
      offset: 80,
      direction: 1,
      directionTravel: 0,
      engaged: true,
    },
    240,
    96,
  );

  assert.equal(next.offset, 96);
});

test('reveals the nav when a scroll source reaches the top', () => {
  const next = updateBottomNavScroll(
    {
      lastScrollTop: 42,
      offset: 30,
      direction: 1,
      directionTravel: 0,
      engaged: true,
    },
    0,
    96,
  );

  assert.equal(next.lastScrollTop, 0);
  assert.equal(next.offset, 0);
  assert.equal(next.direction, null);
  assert.equal(next.engaged, false);
});