import type { Route } from './+types/home';

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
    <main className='mx-auto max-w-3xl px-4 py-16'>
      <h1 className='text-3xl font-semibold'>Paul De Silos</h1>
      <p className='mt-2 text-gray-600 dark:text-gray-400'>
        Projects from my Master's in Software Engineering at Penn State.
      </p>
      <ul className='mt-10 grid gap-4 sm:grid-cols-2'>
        {projects.map((p) => (
          <li
            key={p.name}
            className='rounded-2xl border border-gray-200 p-5 dark:border-gray-800'
          >
            <p className='text-xs uppercase tracking-wide text-gray-500'>
              {p.course}
            </p>
            <h2 className='mt-1 font-medium'>{p.name}</h2>
            <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
              {p.blurb}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
