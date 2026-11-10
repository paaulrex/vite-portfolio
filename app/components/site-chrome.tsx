import { Link } from 'react-router';
import styles from './site-chrome.module.css';

const LINKS = [
  { label: 'GitHub', href: 'https://github.com/paaulrex' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/pauldesilos' },
];

const linkClass =
  'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to='/' className={styles.name}>
          Paul De Silos
        </Link>
        <nav className={styles.nav}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className={linkClass}>
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        © {new Date().getFullYear()} Paul De Silos
      </div>
    </footer>
  );
}
