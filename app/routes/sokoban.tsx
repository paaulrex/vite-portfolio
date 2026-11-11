import { Link } from 'react-router';

import { LevelsChart, RunsChart, SERIES_COLOR } from '~/sokoban/charts';
import { SokobanDemo } from '~/sokoban/demo';
import {
  AGENT_LABEL,
  bestRun,
  levels,
  runs,
  totals,
  type Agent,
} from '~/sokoban/results';
import type { Route } from './+types/sokoban';
import styles from './sokoban.module.css';

/** TODO: Need more descriptions */
const CREDIT =
  'This work is a project for a graduate-level course with team members Jerum H. and Larry M. I built the multi-level training harness behind every number on this page: the hyperparameter configs, the three level schedules, the results export, and the batch script that ran all 21 runs (about 17 hours).';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Sokoban RL | Paul De Silos' },
    {
      name: 'description',
      content:
        'Tabular Q-learning vs a deep Q-network on 12 Sokoban levels, with results from 21 training runs.',
    },
  ];
}

const REWARDS = [
  ['Solve the level (bonus)', '+500'],
  ['Push a box onto a target', '+10'],
  ['Push a box onto plain floor', '+0.5'],
  ['Take a step', '-0.5'],
  ['Make a blocked move, or a push that would trap a box', '-1'],
  ['Push a box off a target', '-10'],
] as const;

function StatTile({
  label,
  value,
  detail,
  agent,
}: {
  label: string;
  value: string;
  detail: string;
  agent?: Agent;
}) {
  return (
    <div className={styles.tile}>
      <div className={styles.tileLabel}>
        {agent && (
          <span
            aria-hidden
            className={styles.dot}
            style={{ background: SERIES_COLOR[agent] }}
          />
        )}
        {label}
      </div>
      <div className={styles.tileValue}>{value}</div>
      <div className={styles.tileDetail}>{detail}</div>
    </div>
  );
}

export default function Sokoban() {
  const ql = bestRun('qlearning');
  const dqn = bestRun('dqn');
  const pct = (n: number) => `${Math.round(n)}%`;

  return (
    <main>
      <Link to='/' className={styles.back}>
        ← All projects
      </Link>

      <header className={styles.intro}>
        <p className={styles.eyebrow}>Reinforcement Learning · Team project</p>
        <h1 className={styles.title}>Sokoban RL</h1>
        <p className={styles.lede}>
          Sokoban is a puzzle where you push boxes onto targets. You can only
          push, never pull, so one careless move can make a level unsolvable. We
          trained two reinforcement-learning agents to play it: tabular
          Q-learning, which keeps a table of every state it has seen, and a deep
          Q-network (DQN), which learns a neural network that estimates the
          value of each move.
        </p>
        {CREDIT && <p className={styles.credit}>{CREDIT}</p>}
      </header>

      <section className={styles.section}>
        <h2>Train an agent</h2>
        <p className={styles.text}>
          Pick a level and a set of hyperparameters, then train a fresh
          Q-learning agent right here in your browser. When it finishes, it
          replays the level with exploration turned off, so you see only what it
          learned. Challenge 2 isn&rsquo;t offered: in testing it never solved,
          even after 50,000 training episodes.
        </p>
        <SokobanDemo />
      </section>

      <section className={styles.section}>
        <h2>Results</h2>
        <p className={styles.text}>
          Each of the {totals.runs} runs trained one agent for{' '}
          {totals.episodesPerRun.toLocaleString('en-US')} episodes over all{' '}
          {totals.levels} levels then played each level twice with exploration
          turned off ({totals.attemptsPerRun} test attempts). Runs differ in
          hyperparameters and in how episodes were split across levels:{' '}
          <em>equal</em> (an even share), <em>random</em> (a random level each
          episode) or <em>progressive</em> (more episodes on harder levels).
        </p>

        <div className={styles.tiles}>
          <StatTile
            agent='qlearning'
            label={`Best ${AGENT_LABEL.qlearning} run`}
            value={pct(ql.run.solveRate)}
            detail={`${ql.run.solved} of ${ql.run.attempts} solved · ${ql.run.configLabel}, ${ql.run.schedule}`}
          />
          <StatTile
            agent='dqn'
            label={`Best ${AGENT_LABEL.dqn} run`}
            value={pct(dqn.run.solveRate)}
            detail={`${dqn.run.solved} of ${dqn.run.attempts} solved · ${
              dqn.tiedWith
                ? `${dqn.tiedWith + 1} runs tied`
                : dqn.run.configLabel
            }`}
          />
          <StatTile
            label='Training per run'
            value={totals.episodesPerRun.toLocaleString('en-US')}
            detail={`episodes across ${totals.levels} levels`}
          />
        </div>

        <ul className={styles.findings}>
          <li>
            Tabular Q-learning beat DQN. It&rsquo;s best run solved{' '}
            {pct(ql.run.solveRate)} of test attempts, against{' '}
            {pct(dqn.run.solveRate)} for DQN's best.
          </li>
          <li>
            Q-learning handled the two- and three-box levels (Hard 3, Hard 5,
            Challenge) in most runs. DQN never solved a level with more than one
            box.
          </li>
          <li>
            Neither agent solved Challenge 1, Challenge 2 or the generated
            levels. Those are built fresh every episode, so an agent never sees
            the same layout twice.
          </li>
        </ul>

        <div className={styles.charts}>
          <RunsChart runs={runs} />
          <LevelsChart levels={levels} />
        </div>

        <section className={styles.section}>
          <h2>How moves are scored</h2>
          <p className={styles.text}>
            Each turn the agent picks one of four moves. The environment also
            refuses pushes that would trap a box in a corner or against a wall
            with no target along it, which removes the simplest dead ends before
            the agent has to learn them.
          </p>
          <table className={styles.rewards}>
            <tbody>
              {REWARDS.map(([event, reward]) => (
                <tr key={event}>
                  <td>{event}</td>
                  <td>{reward}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </section>
    </main>
  );
}
