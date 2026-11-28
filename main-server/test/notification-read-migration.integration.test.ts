/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import { inject } from 'vitest';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { connect, migrate } from './containers.js';
import { migrateBefore } from './old-schema.js';

const THE_MIGRATION = '20261128120000_add_notification_read_at';

let shared: PrismaClient;
let prisma: PrismaClient;
let name: string;

// Each Notification's title with whether it is read, as the server reads them.
async function readByTitle(): Promise<Record<string, boolean>> {
  const rows = await prisma.notification.findMany({ select: { title: true, readAt: true } });
  return Object.fromEntries(rows.map(({ title, readAt }) => [title, readAt !== null]));
}

beforeAll(async () => {
  shared = connect(inject('settings').DATABASE_URL);
  name = `migration_${randomUUID().replaceAll('-', '')}`;
  await shared.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  const url = new URL(inject('settings').DATABASE_URL);
  url.pathname = `/${name}`;
  migrateBefore(url.toString(), THE_MIGRATION);
  prisma = connect(url.toString());
  await prisma.$executeRawUnsafe(
    `INSERT INTO users (google_subject, email, friend_id) VALUES ('100000000000000000201', 'n@snu.ac.kr', 'NNNNNNNN')`,
  );
  // One whose time has come before the Release, and the next morning's 지금 나서요, kept before it for after it.
  await prisma.$executeRawUnsafe(
    `INSERT INTO notifications (user_id, kind, card_kind, card_id, at, title, line, rings)
     SELECT id, 'accepted', 'party', 'q-1', now() - interval '1 hour', 'come', '저녁', true FROM users
     UNION ALL
     SELECT id, 'leave-by', 'party', 'q-2', now() + interval '1 day', 'ahead', '수업', true FROM users`,
  );

  migrate(url.toString());
});

afterAll(async () => {
  await prisma.$disconnect();
  await shared.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
  await shared.$disconnect();
});

describe('The migration that keeps which Notifications are read', () => {
  it('marks read the Notifications whose time has come, and leaves one still ahead unread to count when it rings', async () => {
    expect(await readByTitle()).toEqual({ come: true, ahead: false });
  });
});
