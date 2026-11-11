import { BiLSTM, NaiveBayes, TextCNN } from './classifiers';
import { readTensors, type TensorSpec } from './nn';

export type ModelId = 'nb' | 'textcnn' | 'bilstm';

type ModelSpec = {
  label: string;
  threshold: number;
  file: string;
  sizeBytes: number;
  tensors: TensorSpec[];
};

/** public/models/steam/manifest.json */
export type Manifest = {
  version: number;
  maxLen: number;
  padId: number;
  unkId: number;
  vocab: string;
  models: Record<'textcnn' | 'bilstm', ModelSpec> & {
    nb: ModelSpec & { vocab: string; logPriorDelta: number };
  };
};

export type ModelFiles = {
  vocab: string;
  nbVocab: string;
  nb: ArrayBuffer;
  textcnn: ArrayBuffer;
  bilstm: ArrayBuffer;
};

const lines = (text: string) => text.split(/\r?\n/);

export function buildModels(m: Manifest, files: ModelFiles) {
  const { nb, textcnn, bilstm } = m.models;
  return {
    manifest: m,
    vocab: new Map(lines(files.vocab).map((token, id) => [token, id] as const)),
    nb: new NaiveBayes(
      lines(files.nbVocab),
      readTensors(files.nb, nb.tensors),
      nb.logPriorDelta,
    ),
    textcnn: new TextCNN(
      readTensors(files.textcnn, textcnn.tensors),
      m.maxLen,
      m.padId,
    ),
    bilstm: new BiLSTM(readTensors(files.bilstm, bilstm.tensors)),
  };
}

export type Models = ReturnType<typeof buildModels>;

/** Downloads everything the manifest lists and builds the models. */
export async function loadModels(base = '/models/steam/'): Promise<Models> {
  const get = async (file: string) => {
    const res = await fetch(base + file);
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    return res;
  };
  const text = (file: string) => get(file).then((r) => r.text());
  const bytes = (file: string) => get(file).then((r) => r.arrayBuffer());

  const m: Manifest = await (await get('manifest.json')).json();
  const [vocab, nbVocab, nb, textcnn, bilstm] = await Promise.all([
    text(m.vocab),
    text(m.models.nb.vocab),
    bytes(m.models.nb.file),
    bytes(m.models.textcnn.file),
    bytes(m.models.bilstm.file),
  ]);
  return buildModels(m, { vocab, nbVocab, nb, textcnn, bilstm });
}
