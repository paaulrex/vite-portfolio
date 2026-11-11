import {
  Embedding,
  dense,
  f32,
  layer,
  matVecAdd,
  relu,
  sigmoid,
  softmax,
  type Layer,
  type Tensors,
} from './nn';
import { nbTerms } from './tokenize';

/** TF-IDF features into multinomial Naive BNayes (2 classes, so a sigmoid) */
export class NaiveBayes {
  private readonly columns = new Map<string, number>();
  private readonly idf: Float32Array;
  private readonly delta: Float32Array;
  private readonly logPriorDelta: number;

  constructor(terms: string[], t: Tensors, logPriorDelta: number) {
    terms.forEach((term, col) => this.columns.set(term, col));
    this.idf = f32(t, 'idf');
    this.delta = f32(t, 'delta');
    this.logPriorDelta = logPriorDelta;
  }

  /** Non-zero TF-IDF values as [col, val], sorted by col. */
  features(text: string): [number, number][] {
    const counts = new Map<number, number>();
    for (const term of nbTerms(text)) {
      const col = this.columns.get(term);
      if (col !== undefined) counts.set(col, (counts.get(col) ?? 0) + 1);
    }
    const raw = [...counts].map(([col, tf]): [number, number] => [
      col,
      (1 + Math.log(tf)) * this.idf[col],
    ]);
    const norm = Math.sqrt(raw.reduce((s, [, v]) => s + v * v, 0));
    return raw
      .map(([col, v]): [number, number] => [col, v / norm])
      .sort((a, b) => a[0] - b[0]);
  }

  predict(text: string): number {
    const z = this.features(text).reduce(
      (sum, [col, x]) => sum + x * this.delta[col],
      this.logPriorDelta,
    );
    return sigmoid(z);
  }
}

const WIDTHS = [3, 4, 5];
const WIDEST = Math.max(...WIDTHS);

/** Convolutions of width 3, 4 and 5 over the embeddings, each max-pooled. */
export class TextCNN {
  private readonly embedding: Embedding;
  private readonly convs: (Layer & { k: number })[];
  private readonly hidden: Layer;
  private readonly out: Layer;
  private readonly maxLen: number;
  private readonly padId: number;

  constructor(t: Tensors, maxLen: number, padId: number) {
    this.embedding = new Embedding(t);
    this.convs = WIDTHS.map((k) => ({ k, ...layer(t, `conv_${k}`) }));
    this.hidden = layer(t, 'dense');
    this.out = layer(t, 'out');
    this.maxLen = maxLen;
    this.padId = padId;
  }

  predict(ids: number[]): number {
    const { dim } = this.embedding;
    const n = ids.length;
    // No mask in this model, so padding counts, as it did in Keras. Every
    // window that starts at or after `n` sees only padding and gives the same
    // result, so the first of them stands in for the rest.
    const len = Math.min(this.maxLen, n + WIDEST);
    const x = this.embedding.lookup([
      ...ids,
      ...Array<number>(len - n).fill(this.padId),
    ]);
    const pooled: number[] = [];
    for (const { k, w, b } of this.convs) {
      const max = new Float64Array(b.length).fill(-Infinity);
      for (let s = 0; s <= Math.min(n, this.maxLen - k); s++) {
        const y = dense(x.subarray(s * dim, (s + k) * dim), { w, b });
        y.forEach((v, f) => (max[f] = Math.max(max[f], v)));
      }
      // ReLU after the max gives the same answer as before it
      max.forEach((v) => pooled.push(Math.max(0, v)));
    }
    return sigmoid(dense(relu(dense(pooled, this.hidden)), this.out)[0]);
  }
}

type Cell = { w: Float32Array; u: Float32Array; b: Float32Array };

export class BiLSTM {
  private readonly embedding: Embedding;
  private readonly fwd: Cell;
  private readonly bwd: Cell;
  private readonly attn: Layer;
  private readonly context: Float32Array;
  private readonly hidden: Layer;
  private readonly out: Layer;

  constructor(t: Tensors) {
    const cell = (name: string): Cell => ({
      w: f32(t, `${name}.kernel`),
      u: f32(t, `${name}.recurrent`),
      b: f32(t, `${name}.bias`),
    });
    this.embedding = new Embedding(t);
    this.fwd = cell('fwd');
    this.bwd = cell('bwd');
    this.attn = layer(t, 'attn');
    this.context = f32(t, 'attn.context');
    this.hidden = layer(t, 'dense');
    this.out = layer(t, 'out');
  }

  /** The probability, plus each token's share of the attn (sums to 1) */
  predict(ids: number[]): { prob: number; attention: number[] } {
    const { dim } = this.embedding;
    const units = this.fwd.b.length / 4;
    const x = this.embedding.lookup(ids);
    const rows = ids.map((_, i) => x.subarray(i * dim, (i + 1) * dim));
    const fwd = runLstm(this.fwd, rows);
    const bwd = runLstm(this.bwd, [...rows].reverse()).reverse();
    const states = fwd.map((f, i) => {
      const h = new Float64Array(2 * units);
      h.set(f);
      h.set(bwd[i], units);
      return h;
    });
    const attention = softmax(
      states.map((h) =>
        dense(h, this.attn).reduce(
          (s, v, j) => s + Math.tanh(v) * this.context[j],
          0,
        ),
      ),
    );

    // With no toeksn this stays all zeroes, which is what Keras does too
    const pooled = new Float64Array(2 * units);
    states.forEach((h, i) =>
      h.forEach((v, j) => (pooled[j] += attention[i] * v)),
    );
    const prob = sigmoid(dense(relu(dense(pooled, this.hidden)), this.out)[0]);
    return { prob, attention };
  }
}

/** One LSTM direction over `rows`, returning h after each step.
 * Keras gate order is input, forget, candidate, output. */
function runLstm({ w, u, b }: Cell, rows: Float32Array[]): Float64Array[] {
  const units = b.length / 4;
  const c = new Float64Array(units);
  let h = new Float64Array(units);
  return rows.map((x) => {
    const z = matVecAdd(h, u, dense(x, { w, b }));
    h = new Float64Array(units);
    for (let j = 0; j < units; j++) {
      const i = sigmoid(z[j]);
      const f = sigmoid(z[units + j]);
      const g = Math.tanh(z[2 * units + j]);
      const o = sigmoid(z[3 * units + j]);
      c[j] = f * c[j] + i * g;
      h[j] = o * Math.tanh(c[j]);
    }
    return h;
  });
}
