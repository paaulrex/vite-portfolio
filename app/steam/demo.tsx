import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

import styles from './demo.module.css';
import {
  judge,
  loadModels,
  type Judgement,
  type ModelId,
  type Models,
} from './models';
import { REPO, RESULTS } from './results';
import { tokenSpans } from './tokenize';

const IDS: ModelId[] = ['nb', 'textcnn', 'bilstm'];

const SAMPLES = [
  'The best game ever',
  '10/10 would lose 400 hours again',
  'Ruined my life',
  'dangerously addictive, lost my whole weekend',
  'not bad, actually good',
  'not good, actually bad',
];

const TALLY = [
  'All three say Not Recommended',
  'One says Recommended, two says Not Recommended',
  'Two say Recommended, one says Not Recommended',
  'All three say Recommended',
];

const pct = (p: number) => `${Math.round(p * 100)}%`;

export function SentimentDemo() {
  const [models, setModels] = useState<Models | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [text, setText] = useState(SAMPLES[0]);
  const [judgement, setJudgement] = useState<Judgement | null>(null);

  useEffect(() => {
    if (!models || !text.trim()) {
      setJudgement(null);
      return;
    }
    const timer = setTimeout(() => setJudgement(judge(models, text)), 200);
    return () => clearTimeout(timer);
  }, [models, text]);

  async function load() {
    setStatus('loading');
    try {
      setModels(await loadModels());
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className={styles.demo}>
      <label htmlFor='review-text' className={styles.label}>
        Your review
      </label>
      <textarea
        id='review-text'
        className={styles.input}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className={styles.samples}>
        {SAMPLES.map((s) => (
          <button
            key={s}
            type='button'
            className={styles.chip}
            onClick={() => setText(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {models ? (
        judgement && <Votes models={models} judgement={judgement} />
      ) : (
        <>
          <button
            type='button'
            className={styles.load}
            onClick={load}
            disabled={status === 'loading'}
          >
            {status === 'loading'
              ? 'Loading the models…'
              : 'Load the models (19MB)'}
          </button>
          <p className={styles.note}>
            They download once, then run entirely in your browser. Nothing you
            type leaves this page.
          </p>
          {status === 'error' && (
            <p className={styles.error}>
              The models did&rsquo;t load. Check your connection and try again.
            </p>
          )}
        </>
      )}

      <p className={styles.bert}>
        <strong>Want to see what a fine-tuned BERT can do?</strong> It reached{' '}
        {RESULTS.bert.macroF1.toFixed(2)} macro-F1, against{' '}
        {RESULTS.bilstm.macroF1.toFixed(2)} for the best model here, but at
        438&nbsp;MB it&rsquo;s too big to run in your browser.{' '}
        <a href={REPO}>See it on GitHub</a>
      </p>
    </div>
  );
}

function Votes({
  models,
  judgement,
}: {
  models: Models;
  judgement: Judgement;
}) {
  const verdicts = IDS.map((id) => {
    const { label, threshold } = models.manifest.models[id];
    const score = judgement.scores[id];
    return { id, label, threshold, score, yes: score >= threshold };
  });

  return (
    <>
      <ul className={styles.votes}>
        {verdicts.map((v) => (
          <li key={v.id}>
            <div className={styles.voteHead}>
              <span>{v.label}</span>
              <span className={styles.verdict}>
                {v.yes ? 'Recommended' : 'Not recommended'}
              </span>
            </div>
            <div aria-hidden className={styles.track}>
              <div className={styles.fill} style={{ width: pct(v.score) }} />
              <div
                className={styles.threshold}
                style={{ left: pct(v.threshold) }}
              />
            </div>
            <p className={styles.voteMeta}>
              Score {pct(v.score)} &middot; Recommended at {pct(v.threshold)} or
              more
            </p>
          </li>
        ))}
      </ul>
      <p aria-live='polite' className={styles.tally}>
        {TALLY[verdicts.filter((v) => v.yes).length]}
      </p>
      <Attention judgement={judgement} />
    </>
  );
}

function Attention({ judgement }: { judgement: Judgement }) {
  const { text, tokens, attention } = judgement;
  if (!attention.length) return null;

  const max = Math.max(...attention);
  const ranked = tokens
    .map((token, i) => ({ token, weight: attention[i] }))
    .sort((a, b) => b.weight - a.weight);
  const top = [...new Set(ranked.map((r) => r.token))].slice(0, 3);

  const spans = tokenSpans(text).slice(0, attention.length);
  const parts: ReactNode[] = [];
  let pos = 0;
  spans.forEach(([start, end], i) => {
    const shade = { '--w': attention[i] / max } as CSSProperties;
    parts.push(
      text.slice(pos, start),
      <mark key={start} className={styles.mark} style={shade}>
        {text.slice(start, end)}
      </mark>,
    );
    pos = end;
  });
  parts.push(text.slice(pos));

  return (
    <div className={styles.attention}>
      <p className={styles.label}>
        Where the BiLSTM looked hardest: {top.map((t) => `"${t}"`).join(', ')}
      </p>
      <p className={styles.attentionText}>{spans.length ? parts : text}</p>
    </div>
  );
}
