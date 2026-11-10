import type { Config } from '@react-router/dev/config';

export default {
  // Static site: no runtime server. Every route in app/routes.ts is
  // rendered to HTML at build time, and build/client is all we deploy.
  ssr: false,
  prerender: true,
} satisfies Config;
