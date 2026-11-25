import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { MODELS, RESULTS, TEST_SET } from '../app/steam/results';

describe('Steam results', () => {
  it('lists the models weakest to strongest', () => {
    const scores = MODELS.map((m) => m.macroF1);
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
  });

  it('uses the thresholds the exported models ship with', () => {
    const manifest = JSON.parse(
      readFileSync(
        new URL('../public/models/steam/manifest.json', import.meta.url),
        'utf8',
      ),
    );
    for (const id of ['nb', 'textcnn', 'bilstm'] as const) {
      expect(RESULTS[id].threshold).toBe(manifest.models[id].threshold);
    }
  });

  it('matches the numbers quoted in the findings', () => {
    const { textcnn, bilstm, bert } = RESULTS;
    expect(bilstm.macroF1 - textcnn.macroF1).toBeCloseTo(0.0022, 4);
    expect(bert.macroF1 - bilstm.macroF1).toBeCloseTo(0.0395, 4);
    expect(TEST_SET.allWrong / TEST_SET.reviews).toBeCloseTo(0.0336, 4);
    expect(TEST_SET.recommendedShare).toBeCloseTo(0.68, 2);
  });

  it('keeps every macro-F1 on the chart’s 0.80–0.95 axis', () => {
    for (const m of MODELS) {
      expect(m.macroF1).toBeGreaterThan(0.8);
      expect(m.macroF1).toBeLessThan(0.95);
    }
  });
});
