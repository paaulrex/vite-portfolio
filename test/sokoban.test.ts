import { describe, expect, it } from 'vitest';

import {
  LEVELS,
  Q_CONFIGS,
  QLearningAgent,
  SokobanEnv,
  getLevel,
  greedyRollout,
  trainEpisode,
  type LevelId,
  type LevelSpec,
} from '../app/sokoban/sokoban';

const UP = 0;
const DOWN = 1;
const LEFT = 2;
const RIGHT = 3;

/** A hand-drawn level. 0 floor, 1 wall, 2 player, 3 box, 4 target. */
function level(grid: number[][], maxSteps = 50): LevelSpec {
  const boxes = grid.flat().filter((v) => v === 3).length;
  return {
    id: 'easy',
    label: 'Test',
    boxes,
    maxSteps,
    suggestedEpisodes: 0,
    blurb: '',
    grid,
  };
}

/** Small seeded PRNG (mulberry32) so training runs are repeatable. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cell = (env: SokobanEnv, r: number, c: number) => r * env.cols + c;

describe('preset levels', () => {
  it.each(LEVELS.map((l) => [l.id, l] as const))(
    '%s is well formed',
    (_id, spec) => {
      const flat = spec.grid.flat();
      const width = spec.grid[0].length;
      expect(spec.grid.every((row) => row.length === width)).toBe(true);
      expect(flat.filter((v) => v === 2)).toHaveLength(1);
      expect(flat.filter((v) => v === 3)).toHaveLength(spec.boxes);
      expect(flat.filter((v) => v === 4)).toHaveLength(spec.boxes);
    },
  );

  it('looks levels up by id', () => {
    expect(getLevel('hard3').boxes).toBe(2);
    expect(() => getLevel('nope' as LevelId)).toThrow();
  });
});

describe('SokobanEnv rewards', () => {
  it('solves Easy with a single push: +10 on target, +500 for solving', () => {
    const env = new SokobanEnv(getLevel('easy'));
    const res = env.step(RIGHT);
    expect(res).toMatchObject({ reward: 510, done: true, invalid: false });
  });

  it('charges -0.5 for a plain move', () => {
    const env = new SokobanEnv(getLevel('easy'));
    const res = env.step(UP);
    expect(res).toMatchObject({ reward: -0.5, done: false, invalid: false });
    expect(env.player).toBe(cell(env, 1, 2));
  });

  it('charges -1 for walking into a wall and leaves the player in place', () => {
    const env = new SokobanEnv(getLevel('easy'));
    env.step(LEFT);
    const before = env.player;
    const res = env.step(LEFT);
    expect(res).toMatchObject({ reward: -1, invalid: true, deadlock: false });
    expect(env.player).toBe(before);
  });

  it('gives +0.5 for pushing a box onto plain floor', () => {
    const env = new SokobanEnv(getLevel('medium'));
    const res = env.step(RIGHT);
    expect(res).toMatchObject({ reward: 0.5, done: false, invalid: false });
    expect(env.boxes).toEqual([cell(env, 2, 4)]);
  });

  it('gives -10 for pushing a box off a target', () => {
    const env = new SokobanEnv(
      level([
        [1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 1],
        [1, 2, 3, 4, 0, 0, 1],
        [1, 0, 0, 0, 0, 0, 1],
        [1, 0, 3, 0, 4, 0, 1],
        [1, 0, 0, 0, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1],
      ]),
    );
    expect(env.step(RIGHT)).toMatchObject({ reward: 10, done: false });
    expect(env.step(RIGHT)).toMatchObject({ reward: -10, invalid: false });
  });
});

describe('SokobanEnv deadlock pruning', () => {
  it('refuses to push a box into a corner that is not a target', () => {
    const env = new SokobanEnv(
      level([
        [1, 1, 1, 1, 1],
        [1, 0, 3, 2, 1],
        [1, 0, 0, 4, 1],
        [1, 1, 1, 1, 1],
      ]),
    );
    const boxes = env.boxes.slice();
    const res = env.step(LEFT);
    expect(res).toMatchObject({ reward: -1, invalid: true, deadlock: true });
    expect(env.boxes).toEqual(boxes);
  });

  it('refuses to push a box against a wall with no target along it', () => {
    const env = new SokobanEnv(
      level([
        [1, 1, 1, 1, 1, 1, 1],
        [1, 0, 0, 0, 0, 0, 1],
        [1, 0, 0, 3, 0, 0, 1],
        [1, 4, 0, 2, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1],
      ]),
    );
    const res = env.step(UP);
    expect(res).toMatchObject({ invalid: true, deadlock: true });
  });

  it('allows the same push when a free target sits along that wall', () => {
    const env = new SokobanEnv(
      level([
        [1, 1, 1, 1, 1, 1, 1],
        [1, 4, 0, 0, 0, 0, 1],
        [1, 0, 0, 3, 0, 0, 1],
        [1, 0, 0, 2, 0, 0, 1],
        [1, 1, 1, 1, 1, 1, 1],
      ]),
    );
    const res = env.step(UP);
    expect(res).toMatchObject({ reward: 0.5, invalid: false, deadlock: false });
  });
});

describe('SokobanEnv episode bookkeeping', () => {
  it('truncates exactly at maxSteps', () => {
    const env = new SokobanEnv(getLevel('easy'));
    for (let i = 1; i < env.maxSteps; i++) {
      expect(env.step(i % 2 ? UP : DOWN).truncated).toBe(false);
    }
    expect(env.step(UP).truncated).toBe(true);
  });

  it('reset restores the start state and the same key', () => {
    const env = new SokobanEnv(getLevel('medium'));
    const start = env.key();
    env.step(RIGHT);
    env.step(DOWN);
    expect(env.key()).not.toBe(start);
    expect(env.reset()).toBe(start);
    expect(env.stepCount).toBe(0);
  });

  it('keeps boxes sorted so equal positions give equal keys', () => {
    const env = new SokobanEnv(getLevel('hard3'));
    const sorted = env.boxes.slice().sort((a, b) => a - b);
    expect(env.boxes).toEqual(sorted);
    expect(env.key()).toBe(`${env.player}|${sorted.join(',')}`);
  });
});

describe('QLearningAgent', () => {
  const cfg = Q_CONFIGS.baseline;

  it('applies the terminal update Q += α(r - Q)', () => {
    const agent = new QLearningAgent(cfg);
    agent.update('s', RIGHT, 10, 'next', true);
    expect(agent.qValues('s')[RIGHT]).toBeCloseTo(0.15 * 10);
  });

  it('bootstraps from max Q of the next state when not terminal', () => {
    const agent = new QLearningAgent(cfg);
    agent.update('n', UP, 10, 'x', true); // Q(n, Up) = 1.5
    agent.update('s', DOWN, -0.5, 'n', false);
    const target = -0.5 + 0.97 * 1.5;
    expect(agent.qValues('s')[DOWN]).toBeCloseTo(0.15 * target);
  });

  it('reports zeros for unseen states without creating them', () => {
    const agent = new QLearningAgent(cfg);
    expect(agent.qValues('never')).toEqual([0, 0, 0, 0]);
    expect(agent.statesKnown).toBe(0);
  });

  it('keeps growing past its initial table size', () => {
    const agent = new QLearningAgent(cfg);
    for (let i = 0; i < 5000; i++) agent.update(`s${i}`, i % 4, i, 'x', true);
    expect(agent.statesKnown).toBe(5000);
    expect(agent.qValues('s4999')[4999 % 4]).toBeCloseTo(0.15 * 4999);
    expect(agent.qValues('s0')[0]).toBe(0);
  });

  it('decays epsilon down to its floor and no further', () => {
    const agent = new QLearningAgent(cfg);
    agent.decayEpsilon();
    expect(agent.epsilon).toBeCloseTo(0.9995);
    for (let i = 0; i < 20000; i++) agent.decayEpsilon();
    expect(agent.epsilon).toBe(cfg.epsilonMin);
  });

  it('acts greedily when not exploring', () => {
    const agent = new QLearningAgent(cfg, seeded(1));
    agent.update('s', LEFT, 10, 'x', true);
    for (let i = 0; i < 20; i++)
      expect(agent.selectAction('s', false)).toBe(LEFT);
  });
});

describe('training (main.py loop)', () => {
  function train(id: LevelId, seed: number) {
    const spec = getLevel(id);
    const env = new SokobanEnv(spec);
    const agent = new QLearningAgent(Q_CONFIGS.baseline, seeded(seed));
    for (let ep = 0; ep < spec.suggestedEpisodes; ep++) {
      trainEpisode(env, agent);
      agent.decayEpsilon();
    }
    return { env, agent };
  }

  it.each(['easy', 'medium', 'hard', 'hard2'] as const)(
    'learns to solve %s within its suggested episodes',
    (id) => {
      const { env, agent } = train(id, 42);
      const run = greedyRollout(env, agent);
      expect(run.solved).toBe(true);
      expect(run.frames.at(-1)!.total).toBeGreaterThan(500);
    },
  );

  it('records a frame per step, starting from the initial state', () => {
    const { env, agent } = train('easy', 7);
    const run = greedyRollout(env, agent);
    expect(run.frames[0]).toMatchObject({ step: 0, action: null, total: 0 });
    run.frames.slice(1).forEach((f, i) => expect(f.step).toBe(i + 1));
    expect(run.frames).toHaveLength(2); // one push solves Easy
    expect(run.frames[1]).toMatchObject({ action: RIGHT, reward: 510 });
  });
});
