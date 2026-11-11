/** Tensor views and the small bits of math the three models share. Kernels
 * are row-major [in, out], the Keras layout, so y = x · W + b. */
export type TensorSpec = {
  name: string;
  dtype: 'float32' | 'int8';
  shape: number[];
  offset: number;
  length: number;
};

export type Tensors = Record<string, Float32Array | Int8Array>;

/** Views each tensors in `buffer` w/o copying (offsets are 4-byte aligned). */
export function readTensors(buffer: ArrayBuffer, specs: TensorSpec[]): Tensors {
  const out: Tensors = {};
  for (const { name, dtype, offset, length } of specs) {
    out[name] =
      dtype === 'int8'
        ? new Int8Array(buffer, offset, length)
        : new Float32Array(buffer, offset, length / 4);
  }
  return out;
}

export function f32(t: Tensors, name: string): Float32Array {
  const a = t[name];
  if (!(a instanceof Float32Array)) throw new Error(`Missing tensor ${name}`);
  return a;
}

export function i8(t: Tensors, name: string): Int8Array {
  const a = t[name];
  if (!(a instanceof Int8Array)) throw new Error(`Missing tensor ${name}`);
  return a;
}

export type Layer = { w: Float32Array; b: Float32Array };

export const layer = (t: Tensors, name: string): Layer => ({
  w: f32(t, `${name}.kernel`),
  b: f32(t, `${name}.bias`),
});

/** y += x · W, skipping zeros in x (common after ReLU). Returns y. */
export function matVecAdd(
  x: ArrayLike<number>,
  w: Float32Array,
  y: Float64Array,
): Float64Array {
  const n = y.length;
  for (let i = 0; i < x.length; i++) {
    const xi = x[i];
    if (xi === 0) continue;
    for (let j = 0, k = i * n; j < n; j++, k++) y[j] += xi * w[k];
  }
  return y;
}

export const dense = (x: ArrayLike<number>, { w, b }: Layer) =>
  matVecAdd(x, w, Float64Array.from(b));

export const relu = (v: Float64Array) => v.map((x) => Math.max(0, x));

export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

export function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const e = scores.map((s) => Math.exp(s - max));
  const sum = e.reduce((a, v) => a + v, 0);
  return e.map((v) => v / sum);
}

/** int8 embeddings: ea row is its int8 vals times that row's scale */
export class Embedding {
  readonly dim: number;
  private readonly q: Int8Array;
  private readonly scale: Float32Array;

  constructor(t: Tensors) {
    this.q = i8(t, 'embedding');
    this.scale = f32(t, 'embedding.scale');
    this.dim = this.q.length / this.scale.length;
  }

  lookup(ids: number[]): Float32Array {
    const { q, scale, dim } = this;
    const out = new Float32Array(ids.length * dim);
    ids.forEach((id, r) => {
      for (let i = 0; i < dim; i++) {
        out[r * dim + i] = q[id * dim + i] * scale[id];
      }
    });
    return out;
  }
}
