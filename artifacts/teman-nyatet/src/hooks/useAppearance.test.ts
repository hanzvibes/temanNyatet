import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import {
  DEFAULT_PREFS,
  RADIUS_VALUES,
  applyAppearanceToDom,
  hexToHue,
  readStoredPrefs,
} from './useAppearance.js';

/* ─── Storage / DOM stubs ──────────────────────────────────────────────────
   The helpers guard on `typeof window === 'undefined'`, so a minimal stub is
   enough to exercise the real logic under node. */

function stubStorage(store: Record<string, string>) {
  (globalThis as Record<string, unknown>).window = {
    localStorage: {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    },
  };
}

function stubDom() {
  const style = new Map<string, string>();
  const root = {
    style: {
      setProperty: (key: string, value: string) => {
        style.set(key, value);
      },
    },
    dataset: {} as Record<string, string>,
  };
  (globalThis as Record<string, unknown>).document = { documentElement: root };
  return { root, style };
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).document;
});

/* ─── hexToHue ───────────────────────────────────────────────────────────── */

test('hexToHue maps primary colors to their hue', () => {
  assert.equal(hexToHue('#ff0000'), 0); // red
  assert.equal(hexToHue('#00ff00'), 120); // green
  assert.equal(hexToHue('#0000ff'), 240); // blue
  assert.equal(hexToHue('#ff8800'), 32); // orange (between red 0° and yellow 60°)
  assert.equal(hexToHue('#ffffff'), 0); // achromatic → 0
  assert.equal(hexToHue('#18a07a'), 163); // default sage accent
});

/* ─── readStoredPrefs ────────────────────────────────────────────────────── */

test('readStoredPrefs returns defaults when nothing is stored', () => {
  stubStorage({});
  assert.deepEqual(readStoredPrefs(), DEFAULT_PREFS);
});

test('readStoredPrefs keeps fully valid stored preferences', () => {
  stubStorage({
    'teman-nyatet:appearance': JSON.stringify({
      font: 'nunito',
      radius: 'pill',
      palette: 'custom',
      customAccent: '#ff00aa',
      textScale: 'xl',
      density: 'compact',
      motion: 'off',
      glass: 'heavy',
    }),
  });
  assert.deepEqual(readStoredPrefs(), {
    font: 'nunito',
    radius: 'pill',
    palette: 'custom',
    customAccent: '#ff00aa',
    textScale: 'xl',
    density: 'compact',
    motion: 'off',
    glass: 'heavy',
  });
});

test('readStoredPrefs falls back to defaults for unknown or malformed values', () => {
  stubStorage({
    'teman-nyatet:appearance': JSON.stringify({
      font: 'comic-sans',
      radius: 'blob',
      palette: 'neon',
      customAccent: 'red', // not a #rrggbb hex
      textScale: 'huge',
      density: 'dense',
      motion: 'sometimes',
      glass: 'lots',
    }),
  });
  assert.deepEqual(readStoredPrefs(), DEFAULT_PREFS);
});

test('readStoredPrefs tolerates corrupt JSON', () => {
  stubStorage({ 'teman-nyatet:appearance': '{not json' });
  assert.deepEqual(readStoredPrefs(), DEFAULT_PREFS);
});

test('readStoredPrefs merges partial preferences onto defaults', () => {
  stubStorage({
    'teman-nyatet:appearance': JSON.stringify({ textScale: 'large', motion: 'reduced' }),
  });
  const prefs = readStoredPrefs();
  assert.equal(prefs.textScale, 'large');
  assert.equal(prefs.motion, 'reduced');
  assert.equal(prefs.font, DEFAULT_PREFS.font);
  assert.equal(prefs.glass, DEFAULT_PREFS.glass);
  assert.equal(prefs.customAccent, DEFAULT_PREFS.customAccent);
});

/* ─── applyAppearanceToDom ───────────────────────────────────────────────── */

test('applyAppearanceToDom writes font/radius vars and data attributes', () => {
  const { root, style } = stubDom();
  applyAppearanceToDom({
    ...DEFAULT_PREFS,
    font: 'nunito',
    radius: 'pill',
    textScale: 'xl',
    density: 'compact',
    motion: 'off',
    glass: 'heavy',
  });

  assert.equal(root.dataset.palette, 'classic');
  assert.equal(root.dataset.textScale, 'xl');
  assert.equal(root.dataset.density, 'compact');
  assert.equal(root.dataset.motion, 'off');
  assert.equal(root.dataset.glass, 'heavy');
  assert.ok(style.get('--app-font-sans')!.includes('Nunito'));
  assert.ok(style.get('--app-font-display')!.includes('Nunito'));
  assert.equal(style.get('--radius'), RADIUS_VALUES.pill);
  assert.equal(style.get('--custom-h'), undefined); // only set for custom palettes
});

test('applyAppearanceToDom writes the custom accent hue for custom palettes', () => {
  const { root, style } = stubDom();
  applyAppearanceToDom({ ...DEFAULT_PREFS, palette: 'custom', customAccent: '#18a07a' });

  assert.equal(root.dataset.palette, 'custom');
  assert.equal(style.get('--custom-h'), '163');
  assert.equal(style.get('--radius'), RADIUS_VALUES.default);
});
