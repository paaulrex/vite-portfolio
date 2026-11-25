import { MODELS } from './results';
import styles from './score-table.module.css';

const MIN = 0.8;
const MAX = 0.95;
const TICKS = [0.8, 0.85, 0.9, 0.95];

const at = (v: number) => `${((v - MIN) / (MAX - MIN)) * 100}%`;
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function ScoreTable() {
  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <caption className={styles.caption}>
          Scores on the test set. The macro-F1 axis starts at 0.80 so the gaps
          show.
        </caption>
        <thead>
          <tr>
            <th scope='col'>Model</th>
            <th scope='col' className={styles.plotHead}>
              Macro-F1
              <span aria-hidden className={styles.ticks}>
                {TICKS.map((t) => (
                  <span key={t} style={{ left: at(t) }}>
                    {t.toFixed(2)}
                  </span>
                ))}
              </span>
            </th>
            <th scope='col'>Accuracy</th>
            <th scope='col'>AUC</th>
            <th scope='col'>F1, not recommended</th>
          </tr>
        </thead>
        <tbody>
          {MODELS.map((m) => (
            <tr key={m.label}>
              <th scope='row'>
                {m.label}
                <span className={styles.meta}>
                  {m.live ? 'Runs in your browser' : 'Too big to run here'}
                </span>
              </th>
              <td>
                <div className={styles.plot}>
                  {TICKS.map((t) => (
                    <span
                      key={t}
                      aria-hidden
                      className={styles.grid}
                      style={{ left: at(t) }}
                    />
                  ))}
                  <span
                    aria-hidden
                    className={styles.dot}
                    style={{ left: at(m.macroF1) }}
                  />
                  <span
                    className={styles.value}
                    style={{ left: at(m.macroF1) }}
                  >
                    {m.macroF1.toFixed(4)}
                  </span>
                </div>
              </td>
              <td>{pct(m.accuracy)}</td>
              <td>{m.auc.toFixed(4)}</td>
              <td>{m.f1Negative.toFixed(4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
