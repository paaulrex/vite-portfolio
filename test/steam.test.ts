import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { buildModels, type Manifest, type ModelId } from '../app/steam/models';
import { encode } from '../app/steam/tokenize';

/** One review from test/fixtures/steam-parity.json (written by export_web.py). */
type Case = {
  kind: string;
  text: string;
  ids: number[];
  nbFeatures: [number, number][];
  nb: number;
  textcnn: number;
  bilstm: number;
  textcnnInt8: number;
  bilstmInt8: number;
  attention: number[];
};

const MODELS = new URL('../public/models/steam/', import.meta.url);
const text = (file: string) => readFileSync(new URL(file, MODELS), 'utf8');
const bytes = (file: string) =>
  new Uint8Array(readFileSync(new URL(file, MODELS))).buffer;

const manifest: Manifest = JSON.parse(text('manifest.json'));
const models = buildModels(manifest, {
  vocab: text(manifest.vocab),
  nbVocab: text(manifest.models.nb.vocab),
  nb: bytes(manifest.models.nb.file),
  textcnn: bytes(manifest.models.textcnn.file),
  bilstm: bytes(manifest.models.bilstm.file),
});

const fixture: { thresholds: Record<ModelId, number>; cases: Case[] } =
  JSON.parse(
    readFileSync(
      new URL('./fixtures/steam-parity.json', import.meta.url),
      'utf8',
    ),
  );
const cases = fixture.cases.map(
  (c) => [`${c.kind}: ${JSON.stringify(c.text).slice(0, 50)}`, c] as const,
);

describe('manifest', () => {
  it('uses the thresholds the fixture was made with', () => {
    expect(manifest.models.nb.threshold).toBe(fixture.thresholds.nb);
    expect(manifest.models.textcnn.threshold).toBe(fixture.thresholds.textcnn);
    expect(manifest.models.bilstm.threshold).toBe(fixture.thresholds.bilstm);
  });

  it('has a vocabulary entry for every embedding row', () => {
    expect(models.vocab.size).toBe(50_000);
    expect(models.vocab.get('<pad>')).toBe(manifest.padId);
    expect(models.vocab.get('<unk>')).toBe(manifest.unkId);
  });
});

describe('tokenizers match Python', () => {
  it.each(cases)('%s', (_, c) => {
    expect(
      encode(c.text, models.vocab, manifest.maxLen, manifest.unkId),
    ).toEqual(c.ids);
    const features = models.nb.features(c.text);
    expect(features.map(([col]) => col)).toEqual(
      c.nbFeatures.map(([col]) => col),
    );
    features.forEach(([, v], i) =>
      expect(v).toBeCloseTo(c.nbFeatures[i][1], 5),
    );
  });
});

describe('Naive Bayes matches scikit-learn', () => {
  it.each(cases)('%s', (_, c) => {
    expect(models.nb.predict(c.text)).toBeCloseTo(c.nb, 4);
  });
});

describe('TextCNN matches the int8 reference', () => {
  it.each(cases)('%s', (_, c) => {
    expect(models.textcnn.predict(c.ids)).toBeCloseTo(c.textcnnInt8, 4);
  });
});

describe('BiLSTM matches the int8 reference', () => {
  it.each(cases)('%s', (_, c) => {
    const { prob, attention } = models.bilstm.predict(c.ids);
    expect(prob).toBeCloseTo(c.bilstmInt8, 4);
    // The fixture's attention comes from Keras with full-precision embeddings.
    expect(attention).toHaveLength(c.attention.length);
    attention.forEach((a, i) => expect(a).toBeCloseTo(c.attention[i], 2));
  });
});

describe('verdicts match the original models', () => {
  const t = fixture.thresholds;
  it.each(cases)('%s', (_, c) => {
    expect(models.nb.predict(c.text) >= t.nb).toBe(c.nb >= t.nb);
    expect(models.textcnn.predict(c.ids) >= t.textcnn).toBe(
      c.textcnn >= t.textcnn,
    );
    expect(models.bilstm.predict(c.ids).prob >= t.bilstm).toBe(
      c.bilstm >= t.bilstm,
    );
  });
});
