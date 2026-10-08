import { Logger } from '@nestjs/common';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { PrismaPg } from '@prisma/adapter-pg';
import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { SignalsService } from './common/signals.service.js';
import { prepareDemoAccounts, seedDemo } from './demo/demo.seed.js';
import { PrismaClient } from './generated/prisma/client.js';

// Compose's health check of demo-seed looks for it.
const SEEDED_FILE = '/tmp/demo-seeded';
const WATCH_INTERVAL = 5000;

function setting(name: string): string {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

// The demo profile's data (README.md: Demo data): `pnpm demo:seed` writes it once; with `--watch` it then prepares each
// account of DEMO_ACCOUNT_EMAILS that finishes Onboarding, once per run.
async function demoSeed(): Promise<void> {
  const logger = new Logger('DemoSeed');
  const emails = (process.env['DEMO_ACCOUNT_EMAILS'] ?? '')
    .split(',')
    .map((email) => email.trim())
    .filter((email) => email !== '');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: setting('DATABASE_URL'), connectionTimeoutMillis: 5_000 }),
  });
  const messaging = ClientProxyFactory.create({
    transport: Transport.REDIS,
    options: { host: setting('REDIS_HOST'), port: Number(setting('REDIS_PORT')) },
  });
  await messaging.connect();
  const signals = new SignalsService(messaging);
  try {
    await seedDemo(prisma, signals);
    const prepared = new Set(await prepareDemoAccounts(prisma, emails, signals));
    logger.log(`Wrote the demo data and prepared ${prepared.size} of the ${emails.length} demo accounts`);
    if (!process.argv.includes('--watch')) {
      return;
    }
    await writeFile(SEEDED_FILE, '');
    for (;;) {
      // oxlint-disable-next-line no-await-in-loop -- one look at a time
      await sleep(WATCH_INTERVAL);
      // oxlint-disable-next-line no-await-in-loop -- one look at a time
      for (const id of await prepareDemoAccounts(prisma, emails, signals, { except: prepared })) {
        prepared.add(id);
        logger.log(`Prepared the demo account ${id}`);
      }
    }
  } finally {
    await prisma.$disconnect();
    await messaging.close();
  }
}
await demoSeed();
