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

export class Trainer {
  readonly env: SokobanEnv;
  readonly agent: QLearningAgent;
  readonly total: number;
  episode = 0;
  solved = 0;

  constructor(
    level: LevelSpec,
    config: QConfig,
    rng: () => number = Math.random,
  ) {
    this.env = new SokobanEnv(level);
    this.agent = new QLearningAgent(config, rng);
    this.total = level.suggestedEpisodes;
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
    }
    return end - start;
  }

  rollout() {
    return greedyRollout(this.env, this.agent);
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
