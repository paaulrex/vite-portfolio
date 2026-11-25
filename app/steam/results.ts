export type ModelKey = 'nb' | 'textcnn' | 'bilstm' | 'bert';

export type ModelResult = {
  label: string;
  live: boolean;
  threshold: number;
  macroF1: number;
  accuracy: number;
  auc: number;
  f1Negative: number;
};

export const RESULTS: Record<ModelKey, ModelResult> = {
  nb: {
    label: 'Naive Bayes + TF-IDF',
    live: true,
    threshold: 0.29,
    macroF1: 0.8494,
    accuracy: 0.8681,
    auc: 0.9296,
    f1Negative: 0.7963,
  },
  textcnn: {
    label: 'TextCNN',
    live: true,
    threshold: 0.3,
    macroF1: 0.8719,
    accuracy: 0.8898,
    auc: 0.9428,
    f1Negative: 0.8239,
  },
  bilstm: {
    label: 'BiLISTM + Attention',
    live: true,
    threshold: 0.37,
    macroF1: 0.8741,
    accuracy: 0.8911,
    auc: 0.9513,
    f1Negative: 0.8278,
  },
  bert: {
    label: 'Fine-tuned BERT',
    live: false,
    threshold: 0.17,
    macroF1: 0.9136,
    accuracy: 0.9253,
    auc: 0.9746,
    f1Negative: 0.8819,
  },
};

export const MODELS = Object.values(RESULTS);

export const TRAIN_REVIEWS = 899_248;

export const TEST_SET = {
  reviews: 770_815,
  games: 30,
  recommendedShare: 0.6814,
  allWrong: 25_900,
};
