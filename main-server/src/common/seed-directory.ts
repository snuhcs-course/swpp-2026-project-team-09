// AI-generated with Claude Opus 5.5, 2026-10-03, prompted by TaeHyun79, reviewed by fyoon46 in #29
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// The seed files (README.md: Seed data). src/ and dist/ lie at the same depth below it.
export const SEED_DIRECTORY = fileURLToPath(new URL('../../seed/', import.meta.url));

export async function readSeedFile<T>(directory: string, file: string, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(JSON.parse(await readFile(join(directory, file), 'utf8')));
}
