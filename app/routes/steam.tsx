import { Link } from 'react-router';

import styles from '~/components/project.module.css';
import { RESULTS, TEST_SET, TRAIN_REVIEWS } from '~/steam/results';
import { ScoreTable } from '~/steam/score-table';
import type { Route } from './+types/steam';

const REPO = 'https://github.com/paaulrex/AI574-Sentiment-Analysis';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Steam Review Sentiment' },
    {
      name: 'description',
      content:
        'Four models, from Naive Bayes to a fined-tuned BERT, judging whether Steam reviews recommend the game. Three of them run in your browser.',
    },
  ];
}

const fmt = (n: number) => n.toLocaleString('en-US');

export default function Steam() {
  const { textcnn, bilstm, bert } = RESULTS;
  const gap = (a: number, b: number) => (b - a).toFixed(4);
  const recommended = Math.round(TEST_SET.recommendedShare * 100);
  const allWrong = ((TEST_SET.allWrong / TEST_SET.reviews) * 100).toFixed(1);

  return (
    <main>
      <Link to='/' className={styles.back}>
        ← All projects
      </Link>

      <header className={styles.intro}>
        <p className={styles.eyebrow}>
          Natural Languange Processing &middot; Solo academic project
        </p>
        <h1 className={styles.title}>Steam review sentiment</h1>
        <p className={styles.lede}>
          Can a model tell from the words alone whether a steam review
          recommends the game? I trained four, from a Naive Bayes baseline to a
          fine-tuned BERT, on {fmt(TRAIN_REVIEWS)} revies. Then I tested them on{' '}
          {fmt(TEST_SET.reviews)} revies of {TEST_SET.games} games released in
          2025-26, newer than anything they trained on
        </p>
        <a href={REPO} className={styles.repo}>
          View the code on GitHub
        </a>
      </header>

      <section className={styles.section}>
        <h2>Results</h2>
        <p className={styles.text}>
          Each model&rsquo;s decision threshold was tuned on validation data,
          then frozen before testing. The main score is macro-F1, the average of
          the F1 for each verdict. {recommended}% of tests reviews are
          recommendations, so a model that always said &ldquo;Recommended&rdquo;
          would look fine on accuracy while never catching a single complaint.
        </p>
        <ScoreTable />
        <ul className={styles.findings}>
          <li>
            Each more complex model scored higher, but the steps are uneven.
            Reading the reviews in both directions (BILSTM) added{' '}
            {gap(textcnn.macroF1, bilstm.macroF1)} macro-F1 over TextCNN, while
            Bert&rsquo;s pretraining added {gap(bilstm.macroF1, bert.macroF1)}.
          </li>
          <li>
            {fmt(TEST_SET.allWrong)} reviews ({allWrong}%) fooled all four
            models, a rough ceiling on judging a review from its text alone.
          </li>
        </ul>
      </section>
    </main>
  );
}
