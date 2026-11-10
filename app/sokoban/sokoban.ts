/**
 * Browser port of the AI 801 Sokoban environment and tabular Q-learning agent.
 *
 * Mirrors sokoban_env.py, qlearning/qlearning_agent.py and the train/run_episode
 * loops in main.py, including their quirks: an episode that runs out of steps is
 * treated as terminal when updating Q-values, and greedy demo runs keep updating
 * the table. Rewards, deadlock pruning and the preset levels are unchanged.
 *
 * Kept free of imports and of non-erasable TypeScript (no enums) so Node can run
 * it directly for benchmarking.
 */

export type LevelId =
  | 'easy'
  | 'medium'
  | 'hard'
  | 'hard2'
  | 'hard3'
  | 'hard4'
  | 'hard5'
  | 'challenge'
  | 'challenge1'
  | 'challenge2';

export type LevelSpec = {
  id: LevelId;
  label: string;
  boxes: number;
  maxSteps: number;
  suggestedEpisodes: number;
  blurb: string;
  /** 0 = floor, 1 = wall, 2 = player, 3 = box, 4 = target */
  grid: number[][];
};

export const LEVELS: LevelSpec[] = [
  {
    id: 'easy',
    label: 'Easy',
    boxes: 1,
    maxSteps: 30,
    suggestedEpisodes: 500,
    blurb: 'One push away from solved.',
    grid: [
      [1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 1],
      [1, 0, 2, 3, 4, 1],
      [1, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 'medium',
    label: 'Medium',
    boxes: 1,
    maxSteps: 60,
    suggestedEpisodes: 3000,
    blurb: 'Push right, then walk around and push down.',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 4, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 'hard',
    label: 'Hard',
    boxes: 1,
    maxSteps: 80,
    suggestedEpisodes: 8000,
    blurb: 'A wall under the box forces a sideways detour.',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 2, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 3, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 1, 0, 0, 4, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 'hard2',
    label: 'Hard 2',
    boxes: 1,
    maxSteps: 100,
    suggestedEpisodes: 8000,
    blurb: 'Two chambers joined by a single gap.',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 3, 0, 1, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 'hard3',
    label: 'Hard 3',
    boxes: 2,
    maxSteps: 120,
    suggestedEpisodes: 10000,
    blurb: 'Two boxes routed past a pair of wall clusters.',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 0, 0, 3, 0, 3, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 'hard4',
    label: 'Hard 4',
    boxes: 2,
    maxSteps: 150,
    suggestedEpisodes: 12000,
    blurb: 'A maze wall with three narrow gaps.',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 2, 3, 0, 0, 1, 0, 0, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 'hard5',
    label: 'Hard 5',
    boxes: 2,
    maxSteps: 100,
    suggestedEpisodes: 10000,
    blurb: 'Targets tucked in an alcove, so push order matters.',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 4, 4, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      [1, 0, 0, 0, 0, 3, 0, 3, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 'challenge',
    label: 'Challenge',
    boxes: 3,
    maxSteps: 200,
    suggestedEpisodes: 20000,
    blurb: 'Three boxes, long detours around two wall clusters.',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 'challenge1',
    label: 'Challenge 1',
    boxes: 4,
    maxSteps: 300,
    suggestedEpisodes: 30000,
    blurb: 'Four boxes, choke points near every target.',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 0, 0, 0, 0, 1, 1, 0, 0, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 0, 0, 0, 0, 1, 1, 0, 0, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 0, 0, 0, 0, 1, 1, 0, 0, 3, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 'challenge2',
    label: 'Challenge 2',
    boxes: 6,
    maxSteps: 500,
    suggestedEpisodes: 50000,
    blurb: 'Six boxes. The hardest preset.',
    grid: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 3, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 4, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
  },
];

export function getLevel(id: LevelId): LevelSpec {
  const level = LEVELS.find((l) => l.id === id);
  if (!level) throw new Error(`Unknown level ${id}`);
  return level;
}

/** Action order matches the Python Action enum: UP, DOWN, LEFT, RIGHT. */
export const ACTION_NAMES = ['Up', 'Down', 'Left', 'Right'] as const;
const DR = [-1, 1, 0, 0];
const DC = [0, 0, -1, 1];

export type StepResult = {
  reward: number;
  done: boolean;
  truncated: boolean;
  invalid: boolean;
  deadlock: boolean;
};

export type Snapshot = { player: number; boxes: number[] };

export class SokobanEnv {
  readonly rows: number;
  readonly cols: number;
  readonly maxSteps: number;
  readonly walls: Uint8Array;
  readonly targets: Uint8Array;
  readonly targetCount: number;

  player = 0;
  /** Box cell indices, kept sorted so the state key is canonical. */
  boxes: number[] = [];
  stepCount = 0;

  private readonly boxAt: Uint8Array;
  private readonly startPlayer: number;
  private readonly startBoxes: number[];

  constructor(spec: LevelSpec) {
    this.rows = spec.grid.length;
    this.cols = spec.grid[0].length;
    this.maxSteps = spec.maxSteps;
    const size = this.rows * this.cols;
    this.walls = new Uint8Array(size);
    this.targets = new Uint8Array(size);
    this.boxAt = new Uint8Array(size);

    let player = 0;
    const boxes: number[] = [];
    let targetCount = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const i = r * this.cols + c;
        const v = spec.grid[r][c];
        if (v === 1) this.walls[i] = 1;
        else if (v === 2) player = i;
        else if (v === 3) boxes.push(i);
        else if (v === 4) {
          this.targets[i] = 1;
          targetCount++;
        }
      }
    }
    this.targetCount = targetCount;
    this.startPlayer = player;
    this.startBoxes = boxes.sort((a, b) => a - b);
    this.reset();
  }

  reset(): string {
    for (const b of this.boxes) this.boxAt[b] = 0;
    this.player = this.startPlayer;
    this.boxes = this.startBoxes.slice();
    for (const b of this.boxes) this.boxAt[b] = 1;
    this.stepCount = 0;
    return this.key();
  }

  key(): string {
    return this.player + '|' + this.boxes.join(',');
  }

  snapshot(): Snapshot {
    return { player: this.player, boxes: this.boxes.slice() };
  }

  boxesOnTargets(): number {
    let n = 0;
    for (const b of this.boxes) if (this.targets[b]) n++;
    return n;
  }

  private isWall(r: number, c: number): boolean {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return true;
    return this.walls[r * this.cols + c] === 1;
  }

  private invalid(deadlock = false): StepResult {
    return {
      reward: -1,
      done: false,
      truncated: this.stepCount >= this.maxSteps,
      invalid: true,
      deadlock,
    };
  }

  /** A box pushed into a corner that is not a target can never leave it. */
  private cornerDeadlock(r: number, c: number): boolean {
    if (this.targets[r * this.cols + c]) return false;
    const top = this.isWall(r - 1, c);
    const bot = this.isWall(r + 1, c);
    const left = this.isWall(r, c - 1);
    const right = this.isWall(r, c + 1);
    return (top && left) || (top && right) || (bot && left) || (bot && right);
  }

  /** A box pushed against a wall segment with no free target along it is stuck. */
  private wallDeadlock(
    br: number,
    bc: number,
    dr: number,
    dc: number,
  ): boolean {
    const perp =
      dr !== 0
        ? [
            [0, -1],
            [0, 1],
          ]
        : [
            [-1, 0],
            [1, 0],
          ];
    for (const [pdr, pdc] of perp) {
      let r = br;
      let c = bc;
      for (;;) {
        if (this.isWall(r, c)) break;
        if (!this.isWall(r + dr, c + dc)) return false;
        const i = r * this.cols + c;
        if (this.targets[i] && !this.boxAt[i]) return false;
        r += pdr;
        c += pdc;
      }
    }
    return true;
  }

  step(action: number): StepResult {
    this.stepCount++;
    const dr = DR[action];
    const dc = DC[action];
    const pr = Math.floor(this.player / this.cols);
    const pc = this.player % this.cols;
    const nr = pr + dr;
    const nc = pc + dc;

    if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols)
      return this.invalid();
    const next = nr * this.cols + nc;
    if (this.walls[next]) return this.invalid();

    let reward: number;
    if (this.boxAt[next]) {
      const br = nr + dr;
      const bc = nc + dc;
      if (br < 0 || br >= this.rows || bc < 0 || bc >= this.cols)
        return this.invalid();
      const dest = br * this.cols + bc;
      if (this.walls[dest] || this.boxAt[dest]) return this.invalid();
      if (this.cornerDeadlock(br, bc)) return this.invalid(true);
      if (this.wallDeadlock(br, bc, dr, dc)) return this.invalid(true);

      const leavingTarget = this.targets[next] === 1;
      this.boxAt[next] = 0;
      this.boxAt[dest] = 1;
      const idx = this.boxes.indexOf(next);
      this.boxes[idx] = dest;
      this.boxes.sort((a, b) => a - b);
      this.player = next;

      reward = this.targets[dest] ? 10 : 0.5;
      if (leavingTarget) reward = -10;
    } else {
      this.player = next;
      reward = this.targets[next] ? 0 : -0.5;
    }

    const done = this.boxesOnTargets() === this.targetCount;
    if (done) reward += 500;

    return {
      reward,
      done,
      truncated: this.stepCount >= this.maxSteps,
      invalid: false,
      deadlock: false,
    };
  }
}

export type QConfig = {
  learningRate: number;
  discountFactor: number;
  epsilonDecay: number;
  epsilonMin: number;
};

export type QConfigId = 'baseline' | 'ql_fast_explore' | 'ql_high_gamma';

/** The three Q-learning configs from parameters.example.json. */
export const Q_CONFIGS: Record<
  QConfigId,
  QConfig & { label: string; note: string }
> = {
  baseline: {
    label: 'Baseline',
    note: 'α 0.15 · γ 0.97 · ε decay 0.9995 · ε floor 0.08',
    learningRate: 0.15,
    discountFactor: 0.97,
    epsilonDecay: 0.9995,
    epsilonMin: 0.08,
  },
  ql_fast_explore: {
    label: 'Fast explore',
    note: 'α 0.15 · γ 0.97 · ε decay 0.997 · ε floor 0.05',
    learningRate: 0.15,
    discountFactor: 0.97,
    epsilonDecay: 0.997,
    epsilonMin: 0.05,
  },
  ql_high_gamma: {
    label: 'High gamma',
    note: 'α 0.15 · γ 0.99 · ε decay 0.999 · ε floor 0.05',
    learningRate: 0.15,
    discountFactor: 0.99,
    epsilonDecay: 0.999,
    epsilonMin: 0.05,
  },
};

/**
 * Tabular Q-learning. Rows live in one growable Float64Array (4 values per state)
 * indexed through a Map, so half a million states do not mean half a million
 * typed-array objects.
 */
export class QLearningAgent {
  epsilon = 1;
  private readonly index = new Map<string, number>();
  private values = new Float64Array(4 * 1024);
  private readonly cfg: QConfig;
  private readonly rng: () => number;

  constructor(cfg: QConfig, rng: () => number = Math.random) {
    this.cfg = cfg;
    this.rng = rng;
  }

  /** Offset of a state's row, creating it the way Python's defaultdict does. */
  private row(state: string): number {
    let i = this.index.get(state);
    if (i === undefined) {
      i = this.index.size * 4;
      if (i + 4 > this.values.length) {
        const grown = new Float64Array(this.values.length * 2);
        grown.set(this.values);
        this.values = grown;
      }
      this.index.set(state, i);
    }
    return i;
  }

  private max4(i: number): number {
    const v = this.values;
    return Math.max(v[i], v[i + 1], v[i + 2], v[i + 3]);
  }

  private maxQ(state: string): number {
    const i = this.index.get(state);
    return i === undefined ? 0 : this.max4(i);
  }

  private bestAction(state: string): number {
    const i = this.row(state);
    const max = this.max4(i);
    const best: number[] = [];
    for (let a = 0; a < 4; a++) if (this.values[i + a] === max) best.push(a);
    return best[Math.floor(this.rng() * best.length)];
  }

  selectAction(state: string, explore: boolean): number {
    if (explore && this.rng() < this.epsilon) return Math.floor(this.rng() * 4);
    return this.bestAction(state);
  }

  update(
    state: string,
    action: number,
    reward: number,
    next: string,
    terminal: boolean,
  ): void {
    const target = terminal
      ? reward
      : reward + this.cfg.discountFactor * this.maxQ(next);
    const i = this.row(state) + action;
    this.values[i] += this.cfg.learningRate * (target - this.values[i]);
  }

  decayEpsilon(): void {
    this.epsilon = Math.max(
      this.cfg.epsilonMin,
      this.epsilon * this.cfg.epsilonDecay,
    );
  }

  /** Q-values for display; zeros for a state the agent has never seen. */
  qValues(state: string): number[] {
    const i = this.index.get(state);
    return i === undefined
      ? [0, 0, 0, 0]
      : Array.from(this.values.subarray(i, i + 4));
  }

  get statesKnown(): number {
    return this.index.size;
  }
}

export type EpisodeResult = { reward: number; solved: boolean; steps: number };

/** One training episode (main.py `train`, one iteration). Caller decays epsilon. */
export function trainEpisode(
  env: SokobanEnv,
  agent: QLearningAgent,
): EpisodeResult {
  let state = env.reset();
  let total = 0;
  for (;;) {
    const action = agent.selectAction(state, true);
    const res = env.step(action);
    const next = env.key();
    agent.update(state, action, res.reward, next, res.done || res.truncated);
    total += res.reward;
    state = next;
    if (res.done || res.truncated)
      return { reward: total, solved: res.done, steps: env.stepCount };
  }
}

export type Frame = Snapshot & {
  step: number;
  action: number | null;
  reward: number;
  total: number;
  invalid: boolean;
  q: number[];
};

/** A greedy run (main.py `run_episode`), recorded frame by frame for playback. */
export function greedyRollout(
  env: SokobanEnv,
  agent: QLearningAgent,
): { frames: Frame[]; solved: boolean } {
  let state = env.reset();
  let total = 0;
  const frames: Frame[] = [
    {
      ...env.snapshot(),
      step: 0,
      action: null,
      reward: 0,
      total: 0,
      invalid: false,
      q: agent.qValues(state),
    },
  ];
  for (let i = 0; i < env.maxSteps; i++) {
    const action = agent.selectAction(state, false);
    const res = env.step(action);
    const next = env.key();
    agent.update(state, action, res.reward, next, res.done || res.truncated);
    total += res.reward;
    state = next;
    frames.push({
      ...env.snapshot(),
      step: env.stepCount,
      action,
      reward: res.reward,
      total,
      invalid: res.invalid,
      q: agent.qValues(state),
    });
    if (res.done) return { frames, solved: true };
    if (res.truncated) return { frames, solved: false };
  }
  return { frames, solved: false };
}
