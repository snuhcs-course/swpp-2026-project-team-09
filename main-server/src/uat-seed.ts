/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 * 2026-11-23  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

import { PrismaPg } from '@prisma/adapter-pg';
import { Redis } from 'ioredis';
import { PrismaClient } from './generated/prisma/client.js';
import { TESTER_LETTERS, type Tester } from './uat/uat-accounts.js';
import { cancelUatEvent, resetTester, setUpUat, uatStatus } from './uat/uat.seed.js';

const USAGE = 'Usage: uat-seed setup | reset a1|a2|a3 | s2-cancel | status';

function testerOf(word: string | undefined): Tester | undefined {
  return TESTER_LETTERS.find((letter) => letter.toLowerCase() === word?.toLowerCase());
}

async function run(
  prisma: PrismaClient,
  redis: Redis | null,
  command: string | undefined,
  word: string | undefined,
): Promise<string[]> {
  const now = new Date();
  if (command === 'setup' && word === undefined) {
    return [
      '[setup] 세션 시작 상태로 준비했어요. 모든 폰의 앱을 껐다 켜세요.',
      ...(await setUpUat(prisma, redis, now)),
    ];
  }
  const tester = testerOf(word);
  if (command === 'reset' && tester !== undefined) {
    return [`[reset ${tester}] 이 테스터만 처음 상태로 돌렸어요.`, ...(await resetTester(prisma, redis, tester, now))];
  }
  if (command === 's2-cancel' && word === undefined) {
    return ['[s2-cancel]', ...(await cancelUatEvent(prisma, redis))];
  }
  if (command === 'status' && word === undefined) {
    return ['[status]', ...(await uatStatus(prisma, redis, now))];
  }
  throw new Error(USAGE);
}

// The UAT data (README.md: UAT data): `node dist/uat-seed setup` prepares the session, `reset a1` sets one tester
// back, `s2-cancel` cancels "[UAT] Event" and `status` reads where everyone stands. It needs DATABASE_URL, and
// REDIS_HOST with REDIS_PORT for what Redis keeps, and starts no Nest application.
async function uatSeed(): Promise<void> {
  const [command, word] = process.argv.slice(2);
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
    const [first = '', ...rest] = await run(prisma, redis, command, word);
    console.log([first, ...rest.map((line) => (line.startsWith('   ') ? line : `- ${line}`))].join('\n'));
    if (redis === null) {
      console.log('- REDIS_HOST가 없어서 위치와 AI 메시지 수는 그대로예요.');
    }
  } finally {
    await prisma.$disconnect();
    redis?.disconnect();
  }
}
await uatSeed();
