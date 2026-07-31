import assert from 'node:assert/strict';
import test from 'node:test';
import { updateOverlaySources } from './overlay-state.js';

test('keeps another overlay active when one source closes', () => {
  let sources = updateOverlaySources([], 'bottom-sheet-nav', true);
  sources = updateOverlaySources(sources, 'settings-sheet', true);
  sources = updateOverlaySources(sources, 'bottom-sheet-nav', false);

  assert.deepEqual(sources, ['settings-sheet']);
});

test('does not duplicate an overlay source', () => {
  let sources = updateOverlaySources([], 'settings-sheet', true);
  sources = updateOverlaySources(sources, 'settings-sheet', true);

  assert.deepEqual(sources, ['settings-sheet']);
});

test('closing an unknown source leaves active overlays unchanged', () => {
  const sources = updateOverlaySources(['settings-sheet'], 'bottom-sheet-nav', false);

  assert.deepEqual(sources, ['settings-sheet']);
});