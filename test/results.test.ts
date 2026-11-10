import { describe, expect, it } from 'vitest';

import { bestRun, levels, runs, totals } from '../app/sokoban/results';

describe('runs', () => {
  it('has all 21 team runs, best first', () => {
    expect(runs).toHaveLength(21);
    for (let i = 1; i < runs.length; i++) {
      const [a, b] = [runs[i - 1], runs[i]];
      expect(
        a.solveRate > b.solveRate ||
          (a.solveRate === b.solveRate && a.avgScore >= b.avgScore),
      ).toBe(true);
    }
  });

  it('splits into 9 Q-learning and 12 DQN runs', () => {
    expect(runs.filter((r) => r.agent === 'qlearning')).toHaveLength(9);
    expect(runs.filter((r) => r.agent === 'dqn')).toHaveLength(12);
  });

  it('gives every run a readable config label', () => {
    for (const r of runs) expect(r.configLabel).not.toMatch(/_/);
  });

  it('agrees on the setup the page describes', () => {
    expect(totals).toEqual({
      runs: 21,
      levels: 12,
      episodesPerRun: 10_000,
      attemptsPerRun: 24,
    });
  });
});

describe('bestRun', () => {
  it('finds the best Q-learning run: baseline, progressive, 14 of 24', () => {
    const { run, tiedWith } = bestRun('qlearning');
    expect(run).toMatchObject({
      configLabel: 'Baseline',
      schedule: 'progressive',
      solved: 14,
      attempts: 24,
    });
    expect(run.solveRate).toBeCloseTo(58.33, 2);
    expect(tiedWith).toBe(0);
  });

  it('finds the best DQN run and the two runs tied with it at 25%', () => {
    const { run, tiedWith } = bestRun('dqn');
    expect(run.solveRate).toBe(25);
    expect(run.configLabel).toBe('Large buffer');
    expect(tiedWith).toBe(2);
  });
});

describe('levels', () => {
  const byId = Object.fromEntries(levels.map((l) => [l.level, l]));

  it('covers the 10 presets and the 2 generated levels in order', () => {
    expect(levels.map((l) => l.label)).toEqual([
      'Easy',
      'Medium',
      'Hard',
      'Hard 2',
      'Hard 3',
      'Hard 4',
      'Hard 5',
      'Challenge',
      'Challenge 1',
      'Challenge 2',
      'Random',
      'Random (hard)',
    ]);
    expect(levels.filter((l) => l.generated).map((l) => l.level)).toEqual([
      'random',
      'random-hard',
    ]);
  });

  it('pools 2 attempts per run: 18 for Q-learning, 24 for DQN', () => {
    for (const l of levels) {
      expect(l.results.qlearning.attempts).toBe(18);
      expect(l.results.dqn.attempts).toBe(24);
    }
  });

  it('backs the claim that DQN never solved a multi-box level', () => {
    for (const l of levels.filter((x) => x.boxes > 1)) {
      expect(l.results.dqn.solved).toBe(0);
    }
  });

  it('backs the claim that Q-learning handled Hard 3, Hard 5 and Challenge', () => {
    for (const id of ['hard3', 'hard5', 'challenge']) {
      expect(byId[id].results.qlearning.rate).toBeGreaterThan(50);
    }
  });

  it('backs the claim that nobody solved Challenge 1, 2 or the generated levels', () => {
    for (const id of ['challenge1', 'challenge2', 'random', 'random-hard']) {
      expect(byId[id].results.qlearning.solved).toBe(0);
      expect(byId[id].results.dqn.solved).toBe(0);
    }
  });
});
