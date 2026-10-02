import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// The seed files (README.md: Seed data). src/ and dist/ lie at the same depth below it.
export const SEED_DIRECTORY = fileURLToPath(new URL('../../seed/', import.meta.url));

export async function readSeedFile<T>(directory: string, file: string, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(JSON.parse(await readFile(join(directory, file), 'utf8')));
}
