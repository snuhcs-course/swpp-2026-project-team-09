import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export function database(connectionString: string) {
  const url = new URL(connectionString);
  const schema = url.searchParams.get('schema') ?? 'public';
  url.searchParams.delete('schema');
  if(!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema))throw new Error('Invalid database schema');
  return new PrismaClient({adapter: new PrismaPg({connectionString: url.toString(), connectionTimeoutMillis: 3000, options: `-c search_path=${schema}`}, {schema})});
}

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
export async function deployMigrations() {
  await promisify(execFile)(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--config', 'prisma.config.ts'], {timeout:60000});
}
