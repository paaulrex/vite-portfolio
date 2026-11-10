import data from './results.json';
import { LEVELS, Q_CONFIGS } from './sokoban';

export type Agent = 'qlearning' | 'dqn';
export type Schedule = 'equal' | 'random' | 'progressive';

export const AGENTS: Agent[] = ['qlearning', 'dqn'];

export const AGENT_LABEL: Record<Agent, string> = {
  qlearning: 'Q-learning',
  dqn: 'Deep Q-Network',
};

export const AGENT_SHORT: Record<Agent, string> = {
  qlearning: 'QL',
  dqn: 'DQN',
};

const CONFIG_LABEL: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(Q_CONFIGS).map(([id, cfg]) => [id, cfg.label]),
  ),
  dqn_baseline: 'Baseline',
  dqn_fast_sync: 'Fast sync',
  dqn_large_buffer: 'Large buffer',
  dqn_single_network: 'Single network',
};

const RANDOM_LEVEL_LABEL: Record<string, string> = {
  random: 'Random',
  'random-hard': 'Random (hard)',
};

export type Run = {
  id: string;
  agent: Agent;
  configLabel: string;
  schedule: Schedule;
  episodes: number;
  solved: number;
  attempts: number;
  solveRate: number;
  avgScore: number;
};

export type LevelResult = { solved: number; attempts: number; rate: number };

export type LevelSummary = {
  level: string;
  label: string;
  boxes: number;
  generated: boolean;
  results: Record<Agent, LevelResult>;
};

function asAgent(val: string): Agent {
  if (val === 'qlearning' || val === 'dqn') return val;
  throw new Error(`Unknown agent in results.json: ${val}`);
}

function asSchedule(val: string): Schedule {
  if (val === 'equal' || val === 'random' || val === 'progressive') {
    return val;
  }
  throw new Error(`Unknown schedule in results.json ${val}`);
}

export const runs: Run[] = data.runs
  .map((r) => ({
    id: r.source,
    agent: asAgent(r.agent),
    configLabel: CONFIG_LABEL[r.config] ?? r.config,
    schedule: asSchedule(r.schedule),
    episodes: r.episodes,
    solved: r.solved,
    attempts: r.runs,
    solveRate: (r.solved / r.runs) * 100,
    avgScore: r.avgScore,
  }))
  .sort((a, b) => b.solveRate - a.solveRate || b.avgScore - a.avgScore);

export function bestRun(agent: Agent): { run: Run; tiedWith: number } {
  const mine = runs.filter((r) => r.agent === agent);
  const run = mine[0];
  const tiedWith = mine.filter((r) => r.solveRate === run.solveRate).length - 1;
  return { run, tiedWith };
}

export const levels: LevelSummary[] = data.runs[0].levels.map(
  ({ level, targets }) => {
    const results = Object.fromEntries(
      AGENTS.map((a) => {
        let solved = 0;
        let attempts = 0;
        for (const run of data.runs) {
          if (run.agent !== a) continue;
          const l = run.levels.find((x) => x.level === level);
          if (!l) throw new Error(`Run ${run.source} is missing ${level}`);
          solved += l.solved;
          attempts += l.runs;
        }
        return [a, { solved, attempts, rate: (solved / attempts) * 100 }];
      }),
    ) as Record<Agent, LevelResult>;

    const preset = LEVELS.find((l) => l.id === level);
    return {
      level,
      label: preset?.label ?? RANDOM_LEVEL_LABEL[level] ?? level,
      boxes: targets,
      generated: !preset,
      results,
    };
  },
);

export const totals = {
  runs: runs.length,
  levels: levels.length,
  episodesPerRun: runs[0].episodes,
  attemptsPerRun: runs[0].attempts,
};
