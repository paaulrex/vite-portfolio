/** This file consist of the logic behind the live demo for Sokoban.
 * Training one agent in batches, plus the replay helper the board
 * needs. No React here, so it is unit tested. */
import {
  LEVELS,
  QLearningAgent,
  SokobanEnv,
  greedyRollout,
  trainEpisode,
  type LevelSpec,
  type QConfig,
  type Snapshot,
} from './sokoban';

export const DEMO_LEVELS = LEVELS.filter((l) => l.id !== 'challenge2');

const CHART_POINTS = 50;

export type Point = {
  start: number;
  end: number;
  solveRate: number;
  epsilon: number;
};

export class Trainer {
  readonly env: SokobanEnv;
  readonly agent: QLearningAgent;
  readonly total: number;
  readonly every: number;
  readonly history: Point[] = [];
  episode = 0;
  solved = 0;
  private last = { episode: 0, solved: 0 };

  constructor(
    level: LevelSpec,
    config: QConfig,
    rng: () => number = Math.random,
  ) {
    this.env = new SokobanEnv(level);
    this.agent = new QLearningAgent(config, rng);
    this.total = level.suggestedEpisodes;
    this.every = Math.ceil(this.total / CHART_POINTS);
  }

  get done(): boolean {
    return this.episode >= this.total;
  }

  run(n: number): number {
    const start = this.episode;
    const end = Math.min(this.total, start + n);
    while (this.episode < end) {
      if (trainEpisode(this.env, this.agent).solved) this.solved++;
      this.agent.decayEpsilon();
      this.episode++;
      if (this.episode % this.every === 0 || this.done) this.record();
    }
    return end - start;
  }

  runFor(
    target: number,
    budgetMs: number,
    now: () => number = () => performance.now(),
  ): number {
    const start = this.episode;
    const stop = now() + budgetMs;
    while (this.episode < target && !this.done && now() < stop) this.run(1);
    return this.episode - start;
  }

  rollout() {
    return greedyRollout(this.env, this.agent);
  }

  private record() {
    const { episode, solved, last } = this;
    this.history.push({
      start: last.episode + 1,
      end: episode,
      solveRate: (solved - last.solved) / (episode - last.episode),
      epsilon: this.agent.epsilon,
    });
    this.last = { episode, solved };
  }
}

export function trackBoxes(frames: Snapshot[]): number[][] {
  let ids = frames[0].boxes;
  return frames.map(({ boxes }) => {
    const from = ids.find((b) => !boxes.includes(b));
    const to = boxes.find((b) => !ids.includes(b));
    if (from !== undefined && to !== undefined) {
      ids = ids.map((b) => (b === from ? to : b));
    }
    return ids;
  });
}

export function dueEpisodes(
  total: number,
  elapsedMs: number,
  durationMs: number,
): number {
  return Math.min(total, Math.ceil((total * elapsedMs) / durationMs));
}
