/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 ******************************************************************************/

import { PrismaPg } from '@prisma/adapter-pg';
import { Redis } from 'ioredis';
import { PrismaClient } from './generated/prisma/client.js';
import { UAT_SCENARIOS, type UatScenario } from './uat/uat-scenarios.js';
import { cancelUatEvent, prepareUatScenario } from './uat/uat.seed.js';

const CANCEL = 'risk4-cancel';

// The UAT data (README.md: UAT data): `node dist/uat-seed risk1` prepares a scenario, and `risk4-cancel` cancels
// Risk 4's event. It needs DATABASE_URL, and REDIS_HOST with REDIS_PORT for what Redis keeps, and starts no Nest
// application.
async function uatSeed(): Promise<void> {
  const [command] = process.argv.slice(2);
  const scenario = UAT_SCENARIOS.find((name) => name === command);
  if (scenario === undefined && command !== CANCEL) {
    throw new Error(`Usage: uat-seed ${[...UAT_SCENARIOS, CANCEL].join(' | ')}`);
  }
  const databaseUrl = process.env['DATABASE_URL'];
  if (databaseUrl === undefined) {
    throw new Error('DATABASE_URL is not set');
  }
  // As in PrismaService: pg waits for a new connection without limit by default.
  const adapter = new PrismaPg({ connectionString: databaseUrl, connectionTimeoutMillis: 5_000 });
  const prisma = new PrismaClient({ adapter });
  const host = process.env['REDIS_HOST'];
  const redis =
    host === undefined ? null : new Redis({ host, port: Number(process.env['REDIS_PORT'] ?? 6379), lazyConnect: true });
  try {
    await redis?.connect();
    const lines =
      scenario === undefined
        ? await cancelUatEvent(prisma, redis)
        : await prepareUatScenario(prisma, redis, scenario satisfies UatScenario, new Date());
    console.log(
      [`[${command ?? ''}] 준비했어요. 세 폰의 앱을 껐다 켜세요.`, ...lines.map((line) => `- ${line}`)].join('\n'),
    );
    if (redis === null) {
      console.log('- REDIS_HOST가 없어서 위치와 AI 메시지 수는 그대로예요.');
    }
  } finally {
    await prisma.$disconnect();
    redis?.disconnect();
  }
}
await uatSeed();
