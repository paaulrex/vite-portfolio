import { useEffect, useMemo, useState } from 'react';

import { Board } from './board';
import styles from './demo.module.css';
import {
  ACTION_NAMES,
  Q_CONFIGS,
  SokobanEnv,
  getLevel,
  type Frame,
  type LevelId,
  type QConfigId,
} from './sokoban';
import { DEMO_LEVELS, Trainer, trackBoxes } from './trainer';

const STEP_MS = 200;

const CONFIG_IDS = Object.keys(Q_CONFIGS) as QConfigId[];

type Replay = {
  frames: Frame[];
  boxes: number[][];
  solved: boolean;
  episodes: number;
  states: number;
};

const boxCount = (n: number) => `${n} ${n === 1 ? 'box' : 'boxes'}`;
const fmt = (n: number) => n.toLocaleString('en-US');

export function SokobanDemo() {
  const [levelId, setLevelId] = useState<LevelId>(DEMO_LEVELS[0].id);
  const [configId, setConfigId] = useState<QConfigId>('baseline');
  const [replay, setReplay] = useState<Replay | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

  const level = getLevel(levelId);
  const config = Q_CONFIGS[configId];
  const start = useMemo(() => new SokobanEnv(level).snapshot(), [level]);
  const last = replay ? replay.frames.length - 1 : 0;
  const atEnd = frame >= last;

  useEffect(() => {
    if (!playing) return;
    if (atEnd) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setFrame((f) => f + 1), STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, atEnd, frame]);

  function clear() {
    setReplay(null);
    setFrame(0);
    setPlaying(false);
  }

  function train() {
    const trainer = new Trainer(level, config);
    trainer.run(trainer.total);
    const run = trainer.rollout();
    setReplay({
      frames: run.frames,
      boxes: trackBoxes(run.frames),
      solved: run.solved,
      episodes: trainer.episode,
      states: trainer.agent.statesKnown,
    });
    setFrame(0);
    setPlaying(true);
  }

  function togglePlay() {
    if (atEnd) {
      setFrame(0);
      setPlaying(true);
    } else {
      setPlaying(!playing);
    }
  }

  function stepBy(delta: number) {
    setPlaying(false);
    setFrame((f) => Math.min(last, Math.max(0, f + delta)));
  }

  const current = replay?.frames[frame];
  const moves = replay ? replay.frames[last].step : 0;

  return (
    <div className={styles.demo}>
      <div className={styles.controls}>
        <label className={styles.field}>
          Level
          <select
            value={levelId}
            onChange={(e) => {
              setLevelId(e.target.value as LevelId);
              clear();
            }}
          >
            {DEMO_LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {`${l.label} · ${boxCount(l.boxes)}`}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          Hyperparameters
          <select
            value={configId}
            onChange={(e) => {
              setConfigId(e.target.value as QConfigId);
              clear();
            }}
          >
            {CONFIG_IDS.map((id) => (
              <option key={id} value={id}>
                {Q_CONFIGS[id].label}
              </option>
            ))}
          </select>
        </label>
        <button
          type='button'
          className={`${styles.button} ${styles.primary}`}
          onClick={train}
        >
          {replay ? 'Train again' : 'Train'}
        </button>
      </div>
      <p className={styles.hint}>
        {level.blurb} Trains for {fmt(level.suggestedEpisodes)} episodes.
      </p>
      <p className={styles.note}>{config.note}</p>

      <Board
        key={levelId}
        level={level}
        player={current ? current.player : start.player}
        boxes={replay ? replay.boxes[frame] : start.boxes}
      />

      {replay && current && (
        <>
          <div className={styles.playback}>
            <button
              type='button'
              className={styles.button}
              onClick={() => stepBy(-1)}
              disabled={frame === 0}
            >
              Back
            </button>
            <button
              type='button'
              className={styles.button}
              onClick={togglePlay}
            >
              {playing ? 'Pause' : atEnd ? 'Replay' : 'Play'}
            </button>
            <button
              type='button'
              className={styles.button}
              onClick={() => stepBy(1)}
              disabled={atEnd}
            >
              Next
            </button>
            <span className={styles.stepInfo}>
              Move {current.step} of {moves}
              {current.action !== null &&
                ` · ${ACTION_NAMES[current.action]}${current.invalid ? ' (blocked)' : ''}`}
              {` · reward ${current.total.toFixed(1)}`}
            </span>
          </div>
          <p aria-live='polite' className={styles.summary}>
            Trained for {fmt(replay.episodes)} episodes and saw{' '}
            {fmt(replay.states)} distinct positions. With exploration off, it{' '}
            {replay.solved
              ? `solved the level in ${moves} moves.`
              : `didn't solve the level within ${level.maxSteps} moves.`}
          </p>
        </>
      )}
    </div>
  );
}
