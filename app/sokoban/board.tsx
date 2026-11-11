import styles from './board.module.css';
import type { LevelSpec } from './sokoban';

const WALL = 1;
const TARGET = 4;

export function Board({
  level,
  player,
  boxes,
}: {
  level: LevelSpec;
  player: number;
  boxes: number[];
}) {
  const tiles = level.grid.flat();
  const rows = level.grid.length;
  const cols = level.grid[0].length;
  const onTarget = boxes.filter((c) => tiles[c] === TARGET).length;

  const place = (c: number) => ({
    width: `${100 / cols}%`,
    height: `${100 / rows}%`,
    transform: `translate(${(c % cols) * 100}%, ${Math.floor(c / cols) * 100}%)`,
  });

  return (
    <div
      role='img'
      aria-label={`${level.label} board, ${onTarget} of ${boxes.length} boxes on targets`}
      className={styles.board}
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        aspectRatio: `${cols} / ${rows}`,
        maxWidth: `${cols * 2.5}rem`,
      }}
    >
      {tiles.map((tile, i) => (
        <div key={i} className={tile === WALL ? styles.wall : styles.floor}>
          {tile === TARGET && <span className={styles.target} />}
        </div>
      ))}
      {boxes.map((c, i) => (
        <div
          key={i}
          className={`${styles.piece} ${tiles[c] === TARGET ? styles.boxDone : styles.box}`}
          style={place(c)}
        />
      ))}
      <div
        className={`${styles.piece} ${styles.player}`}
        style={place(player)}
      />
    </div>
  );
}
