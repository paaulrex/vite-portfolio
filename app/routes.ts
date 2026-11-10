import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('projects/sokoban', 'routes/sokoban.tsx'),
] satisfies RouteConfig;
