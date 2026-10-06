import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Agent instructions live in the repository's root AGENTS.md and CLAUDE.md.
  agentRules: false,
  // The tests build the site with their own settings into another folder, so that they never replace a real build.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  // Google's button on plain http needs the full referrer.
  headers: () =>
    Promise.resolve([
      { source: '/sign-in', headers: [{ key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' }] },
    ]),
};

export default nextConfig;
