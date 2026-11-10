# Paul De Silos · Portfolio

Projects from my Master’s in Software Engineering at Penn State. Each project page shows the results and, where it can, a demo that runs entirely in your browser. The site is fully static: there is no backend.

## Projects

| Project | Course | Status |
| --- | --- | --- |
| Sokoban RL | Reinforcement Learning (AI 801) | Results page done. In-browser training demo next. |
| Steam review sentiment | Natural Language Processing | Planned |
| Brain MRI tumor CNN | Deep Learning | Planned |

## Stack

- [React Router 8](https://reactrouter.com/) in framework mode, prerendered to static HTML
- React 19, TypeScript, Vite 8
- CSS Modules, with design tokens in `app/app.css`
- Vitest and Prettier

## Getting started

Requires Node 22.22 or newer (deploys use Node 24).

```bash
npm install
npm run dev
```

The dev server runs at http://localhost:5173.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Prerenders every route into `build/client` |
| `npm test` | Runs the unit tests |
| `npm run typecheck` | Generates route types, then runs `tsc` |
| `npm run format` | Formats `app`, `test` and the config files with Prettier |

## Project layout

```
app/
  root.tsx           Page shell: header, footer, error page
  routes.ts          Route table
  app.css            Design tokens, reset and base element styles
  components/        Site header and footer
  routes/            One file per page, each with its own .module.css
  sokoban/
    sokoban.ts       TypeScript port of the Sokoban environment and Q-learning agent
    results.json     Results from the team’s 21 training runs
    results.ts       Turns results.json into the numbers the page shows
    charts.tsx       Ranked-runs and per-level bar charts
test/                Vitest unit tests
amplify.yml          AWS Amplify build settings
```

## Styling

Each component imports its own `.module.css`, so class names are scoped to that file. All colors are CSS variables in `app/app.css`. Dark mode follows the system setting and is a single block that redefines them.

## Tests

- `test/sokoban.test.ts` covers the environment and the agent: level layouts, rewards, deadlock checks, the Q-learning update, and seeded training runs that must solve the easier levels.
- `test/results.test.ts` pins the numbers and claims on the Sokoban page. If `results.json` changes, these tests fail until the page copy is checked against the new data.

## Deployment

`react-router.config.ts` sets `ssr: false` and `prerender: true`, so `npm run build` produces plain static files in `build/client`. AWS Amplify Hosting builds the site with `amplify.yml` and serves that folder.

Amplify needs one rewrite rule (Hosting → Rewrites and redirects) so unknown URLs get the site’s 404 page:

| Source | Target | Type |
| --- | --- | --- |
| `/<*>` | `/__spa-fallback.html` | Not found (404) |

## Credits

Sokoban RL was a team project for AI 801 at Penn State with Jerum H. and Larry M. `results.json` comes from the team’s training runs, and `app/sokoban/sokoban.ts` is a TypeScript port of the team’s Python environment and Q-learning agent.
