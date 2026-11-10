import { Link } from 'react-router';

import type { Route } from './+types/home';
import styles from './home.module.css';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Paul De Silos | Portfolio' },
    {
      name: 'description',
      content:
        "Master's projects in machine learning, each with a live demo that runs in your browser.",
    },
  ];
}

const projects = [
  {
    name: 'Sokoban RL',
    course: 'Reinforcement Learning',
    blurb: 'A Q-Learning agent that trains live in your browser.',
    to: '/projects/sokoban',
  },
  {
    name: 'Steam review sentiment',
    course: 'Natural Language Processing',
    blurb: 'Type a review and three models vote on it.',
  },
  {
    name: 'Brain MRI tumor CNN',
    course: 'Deep Learning',
    blurb: 'Classify a scan from the evaluation set.',
  },
];

export default function Home() {
  return (
    <main>
      <h1>Paul De Silos</h1>
      <p className={styles.lede}>
        Projects from my Master's in Software Engineering at Penn State.
      </p>
      <ul className={styles.grid}>
        {projects.map((p) => {
          const body = (
            <>
              <p className={styles.course}>{p.course}</p>
              <h2 className={styles.name}>{p.name}</h2>
              <p className={styles.blurb}>{p.blurb}</p>
            </>
          );
          return (
            <li key={p.name}>
              {p.to ? (
                <Link to={p.to} className={styles.card}>
                  {body}
                </Link>
              ) : (
                <div className={styles.card}>
                  {body}
                  <p className={styles.soon}>Coming soon</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
