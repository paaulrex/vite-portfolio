import { useState, type KeyboardEvent, type ReactNode } from 'react';

import {
  AGENTS,
  AGENT_LABEL,
  AGENT_SHORT,
  type Agent,
  type LevelSummary,
  type Run,
} from './results';
import styles from './charts.module.css';

export const SERIES_COLOR: Record<Agent, string> = {
  qlearning: 'var(--ql)',
  dqn: 'var(--dqn)',
};

const TICKS = [0, 25, 50, 75, 100];

const pct = (n: number) => `${Math.round(n)}%`;

function useActiveMark(count: number) {
  const [active, setActive] = useState<number | null>(null);

  function onKeyDown(e: KeyboardEvent) {
    const step = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    setActive((i) =>
      i === null ? 0 : Math.min(count - 1, Math.max(0, i + step)),
    );
  }

  return {
    active,
    setActive,
    chartProps: {
      tabIndex: 0,
      onKeyDown,
      onFocus: () => setActive((i) => i ?? 0),
      onBlur: () => setActive(null),
      onPointerLeave: () => setActive(null),
    },
  };
}

function ChartCard({
  title,
  subtitle,
  children,
  table,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  table: ReactNode;
}) {
  return (
    <figure className={styles.card}>
      <figcaption>
        <h3>{title}</h3>
        <p className={styles.subtitle}>{subtitle}</p>
      </figcaption>
      <Legend />
      {children}
      <details className={styles.details}>
        <summary>Show as table</summary>
        <div className={styles.tableScroll}>{table}</div>
      </details>
    </figure>
  );
}

function Legend() {
  return (
    <ul className={styles.legend}>
      {AGENTS.map((a) => (
        <li key={a}>
          <span
            aria-hidden
            className={styles.swatch}
            style={{ background: SERIES_COLOR[a] }}
          />
          {AGENT_LABEL[a]}
        </li>
      ))}
    </ul>
  );
}

function Grid() {
  return (
    <div aria-hidden className={styles.grid}>
      {TICKS.map((t) => (
        <div key={t} className={styles.gridLine} style={{ left: `${t}%` }} />
      ))}
    </div>
  );
}

function Axis({ labelClass }: { labelClass: string }) {
  return (
    <div aria-hidden className={styles.axis}>
      <div className={labelClass} />
      <div className={styles.axisTrack}>
        {TICKS.map((t) => (
          <span
            key={t}
            className={`${styles.tick} ${t % 50 ? styles.minorTick : ''}`}
            style={{ left: `${t}%` }}
          >
            {t}%
          </span>
        ))}
      </div>
    </div>
  );
}

function Bar({
  agent,
  value,
  className,
  active,
  tooltip,
}: {
  agent: Agent;
  value: number;
  className: string;
  active: Boolean;
  tooltip: ReactNode;
}) {
  return (
    <div
      className={`${styles.bar} ${className} ${active ? styles.active : ''}`}
    >
      <div
        className={styles.fill}
        style={{ width: `${value}%`, background: SERIES_COLOR[agent] }}
      />
      <span className={styles.value}>{pct(value)}</span>
      {active && (
        <div
          className={styles.tooltip}
          style={{
            left: `clamp(6.5rem - var(--tip-overlap, 0rem), ${value}%, 100% - 4rem)`,
          }}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}

function TooltipBody({
  agent,
  value,
  lines,
}: {
  agent: Agent;
  value: string;
  lines: string[];
}) {
  return (
    <>
      <div className={styles.tipHead}>
        <span
          aria-hidden
          className={styles.tipKey}
          style={{ background: SERIES_COLOR[agent] }}
        />
        <span className={styles.tipValue}>{value}</span>
      </div>
      {lines.map((l) => (
        <div key={l} className={styles.tipLine}>
          {l}
        </div>
      ))}
    </>
  );
}

export function RunsChart({ runs }: { runs: Run[] }) {
  const { active, setActive, chartProps } = useActiveMark(runs.length);
  const describe = (r: Run) =>
    `${AGENT_LABEL[r.agent]}, ${r.configLabel}, ${r.schedule}, schedule: ${pct(r.solveRate)}, ${r.solved} of ${r.attempts} solved`;

  return (
    <ChartCard
      title='Every training run, ranked'
      subtitle={`Share of the ${runs[0].attempts} test attempts each run solved after ${runs[0].episodes.toLocaleString('en-US')} training episodes.`}
      table={
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Agent</th>
              <th>Config</th>
              <th>Schedule</th>
              <th>Solved</th>
              <th>Rate</th>
              <th>Avg score</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{AGENT_LABEL[r.agent]}</td>
                <td>{r.configLabel}</td>
                <td>{r.schedule}</td>
                <td>
                  {r.solved} / {r.attempts}
                </td>
                <td>{pct(r.solveRate)}</td>
                <td>{r.avgScore.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div
        {...chartProps}
        role='group'
        aria-label='Every training run, ranked by solve rate. Use the arrow keys to step through runs.'
        className={`${styles.chart} ${styles.runs}`}
      >
        {runs.map((r, i) => (
          <div
            key={r.id}
            className={styles.runRow}
            onPointerEnter={() => setActive(i)}
          >
            <div className={styles.runLabel}>
              <span className={styles.runAgent}>{AGENT_SHORT[r.agent]}</span>
              <span>
                {r.configLabel}
                <span className={styles.subtitle}> · {r.schedule}</span>
              </span>
            </div>
            <div className={styles.runTrack}>
              <Grid />
              <Bar
                agent={r.agent}
                value={r.solveRate}
                className={styles.runBar}
                active={active === i}
                tooltip={
                  <TooltipBody
                    agent={r.agent}
                    value={pct(r.solveRate)}
                    lines={[
                      `${AGENT_LABEL[r.agent]} · ${r.configLabel} · ${r.schedule}`,
                      `${r.solved} of ${r.attempts} test attempts solved`,
                      `Average test score ${r.avgScore.toFixed(1)}`,
                    ]}
                  />
                }
              />
            </div>
          </div>
        ))}
        <Axis labelClass={styles.runLabel} />
      </div>
      <p aria-live='polite' className={styles.srOnly}>
        {active === null ? '' : describe(runs[active])}
      </p>
    </ChartCard>
  );
}

export function LevelsChart({ levels }: { levels: LevelSummary[] }) {
  const marks = levels.flatMap((l) =>
    AGENTS.map((agent) => ({ level: l, agent })),
  );
  const { active, setActive, chartProps } = useActiveMark(marks.length);
  const describe = ({ level, agent }: (typeof marks)[number]) => {
    const r = level.results[agent];
    return `${AGENT_LABEL[agent]} on ${level.label}: ${pct(r.rate)}, ${r.solved} of ${r.attempts} solved`;
  };

  return (
    <ChartCard
      title='What each agent learned, level by level'
      subtitle='Test attempts solved on each elvel, pooled across all runs of that agent.'
      table={
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Level</th>
              <th>Boxes</th>
              {AGENTS.map((a) => (
                <th key={a}>{AGENT_LABEL[a]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {levels.map((l) => (
              <tr key={l.level}>
                <td>{l.label}</td>
                <td>{l.boxes}</td>
                {AGENTS.map((a) => (
                  <td key={a}>
                    {pct(l.results[a].rate)} ({l.results[a].solved} /{' '}
                    {l.results[a].attempts})
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      }
    >
      <div
        {...chartProps}
        role='group'
        aria-label='Solve rate per level for each agent. Use the arrow keys to step through bars.'
        className={`${styles.chart} ${styles.levels}`}
      >
        {levels.map((l, li) => (
          <div key={l.level} className={styles.levelRow}>
            <div className={styles.levelLabel}>
              <div className={styles.levelName}>{l.label}</div>
              <div className={styles.levelMeta}>
                {l.boxes} {l.boxes === 1 ? 'box' : 'boxes'}
                {l.generated && ' · generated'}
              </div>
            </div>
            <div className={styles.levelTrack}>
              <Grid />
              {AGENTS.map((agent, ai) => {
                const i = li * AGENTS.length + ai;
                const r = l.results[agent];
                return (
                  <div key={agent} onPointerEnter={() => setActive(i)}>
                    <Bar
                      agent={agent}
                      value={r.rate}
                      className={styles.levelBar}
                      active={active === i}
                      tooltip={
                        <TooltipBody
                          agent={agent}
                          value={pct(r.rate)}
                          lines={[
                            `${AGENT_LABEL[agent]} · ${l.label}`,
                            `${r.solved} of ${r.attempts} test attempts solved`,
                          ]}
                        />
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <Axis labelClass={styles.levelLabel} />
      </div>
      <p aria-live='polite' className={styles.srOnly}>
        {active === null ? '' : describe(marks[active])}
      </p>
    </ChartCard>
  );
}
