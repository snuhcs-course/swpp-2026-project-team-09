import { fileURLToPath } from 'node:url';

// The seed files (README.md: Seed data). src/ and dist/ lie at the same depth below it.
export const SEED_DIRECTORY = fileURLToPath(new URL('../../seed/', import.meta.url));
