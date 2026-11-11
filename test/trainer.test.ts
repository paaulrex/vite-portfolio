import { describe, expect, it } from 'vitest';

import { Q_CONFIGS, getLevel } from '../app/sokoban/sokoban';
import {
  DEMO_LEVELS,
  Trainer,
  dueEpisodes,
  trackBoxes,
} from '../app/sokoban/trainer';

/** Small seeded PRNG (mulberry32), the same one sokoban.test.ts uses. */
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

describe('DEMO_LEVELS', () => {
  it('offers every preset except Challenge 2', () => {
    expect(DEMO_LEVELS.map((l) => l.id)).toEqual([
      'easy',
      'medium',
      'hard',
      'hard2',
      'hard3',
      'hard4',
      'hard5',
      'challenge',
      'challenge1',
    ]);
  });
});

describe('Trainer', () => {
  it('trains in batches and stops at the level’s suggested episodes', () => {
    const t = new Trainer(getLevel('easy'), Q_CONFIGS.baseline, seeded(1));
    expect(t.total).toBe(500);
    expect(t.run(200)).toBe(200);
    expect(t.episode).toBe(200);
    expect(t.done).toBe(false);
    expect(t.run(1000)).toBe(300);
    expect(t.done).toBe(true);
    expect(t.run(10)).toBe(0);
    expect(t.episode).toBe(500);
  });

  it('decays epsilon once per episode', () => {
    const t = new Trainer(getLevel('easy'), Q_CONFIGS.baseline, seeded(2));
    t.run(10);
    expect(t.agent.epsilon).toBeCloseTo(0.9995 ** 10, 12);
  });

  it('counts the episodes it solved while exploring', () => {
    const t = new Trainer(getLevel('easy'), Q_CONFIGS.baseline, seeded(3));
    t.run(t.total);
    expect(t.solved).toBeGreaterThan(0);
    expect(t.solved).toBeLessThanOrEqual(t.total);
  });

  it('runFor stops at the target, capped at the total', () => {
    const t = new Trainer(getLevel('easy'), Q_CONFIGS.baseline, seeded(4));
    expect(t.runFor(50, Infinity)).toBe(50);
    expect(t.runFor(10_000, Infinity)).toBe(450);
    expect(t.done).toBe(true);
  });

  it('runFor stops when its time budget runs out', () => {
    const t = new Trainer(getLevel('easy'), Q_CONFIGS.baseline, seeded(5));
    const clock = () => t.episode; // pretend each episode takes 1 ms
    expect(t.runFor(500, 5, clock)).toBe(5);
    expect(t.runFor(500, 5, clock)).toBe(5);
    expect(t.episode).toBe(10);
  });

  it.each(['easy', 'medium', 'hard', 'hard2'] as const)(
    'runs the main.py loop: solves %s after full training',
    (id) => {
      const t = new Trainer(getLevel(id), Q_CONFIGS.baseline, seeded(42));
      t.run(t.total);
      expect(t.rollout().solved).toBe(true);
    },
  );
});

describe('Trainer history', () => {
  it('records 50 evenly spaced points, whatever the level size', () => {
    for (const id of ['easy', 'medium'] as const) {
      const t = new Trainer(getLevel(id), Q_CONFIGS.baseline, seeded(7));
      t.run(t.total);
      expect(t.history.map((p) => p.end)).toEqual(
        Array.from({ length: 50 }, (_, i) => (i + 1) * t.every),
      );
    }
  });

  it('records the same history however the episodes are batched', () => {
    const a = new Trainer(getLevel('easy'), Q_CONFIGS.baseline, seeded(8));
    const b = new Trainer(getLevel('easy'), Q_CONFIGS.baseline, seeded(8));
    a.run(a.total);
    while (!b.done) b.run(7);
    expect(b.history).toEqual(a.history);
  });

  it('covers every episode once, ending with a short final stretch', () => {
    const level = { ...getLevel('easy'), suggestedEpisodes: 510 };
    const t = new Trainer(level, Q_CONFIGS.baseline, seeded(9));
    t.run(t.total);
    expect(t.every).toBe(11);
    expect(t.history).toHaveLength(47);
    t.history.forEach((p, i) =>
      expect(p.start).toBe(i === 0 ? 1 : t.history[i - 1].end + 1),
    );
    expect(t.history.at(-1)).toMatchObject({ start: 507, end: 510 });
    const solved = t.history.reduce(
      (sum, p) => sum + p.solveRate * (p.end - p.start + 1),
      0,
    );
    expect(solved).toBeCloseTo(t.solved, 9);
  });

  it('stores epsilon as of the end of each stretch', () => {
    const t = new Trainer(getLevel('easy'), Q_CONFIGS.baseline, seeded(10));
    t.run(t.total);
    expect(t.history[0].epsilon).toBeCloseTo(0.9995 ** t.every, 12);
    expect(t.history.at(-1)?.epsilon).toBe(t.agent.epsilon);
  });
});

describe('dueEpisodes', () => {
  it('spreads a run’s episodes evenly over its duration', () => {
    expect(dueEpisodes(500, 0, 5000)).toBe(0);
    expect(dueEpisodes(500, 1000, 5000)).toBe(100);
    expect(dueEpisodes(500, 2501, 5000)).toBe(251); // rounds up
    expect(dueEpisodes(500, 9000, 5000)).toBe(500); // never past the total
  });
});

describe('trackBoxes', () => {
  it('keeps each box at one index when the sorted order changes', () => {
    const frames = [
      { player: 4, boxes: [5, 9] },
      { player: 5, boxes: [9, 10] }, // the box at 5 is pushed to 10
      { player: 5, boxes: [9, 10] }, // no box moves
      { player: 9, boxes: [8, 10] }, // the box at 9 is pushed to 8
    ];
    expect(trackBoxes(frames)).toEqual([
      [5, 9],
      [10, 9],
      [10, 9],
      [10, 8],
    ]);
  });

  it('tracks the same boxes the environment reports on a real replay', () => {
    const t = new Trainer(getLevel('hard3'), Q_CONFIGS.baseline, seeded(42));
    t.run(t.total);
    const { frames } = t.rollout();
    const tracked = trackBoxes(frames);
    frames.forEach((f, i) =>
      expect([...tracked[i]].sort((a, b) => a - b)).toEqual(f.boxes),
    );
    expect(tracked.at(-1)).not.toEqual(tracked[0]); // at least one push
  });
});
