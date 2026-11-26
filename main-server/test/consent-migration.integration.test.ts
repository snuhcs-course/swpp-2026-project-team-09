/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { randomUUID } from 'node:crypto';
import { inject } from 'vitest';
import { type PrismaClient } from '../src/generated/prisma/client.js';
import { connect, migrate } from './containers.js';
import { migrateBefore } from './old-schema.js';

const THE_MIGRATION = '20261126000000_add_consent';

let shared: PrismaClient;
let prisma: PrismaClient;
let name: string;

// Every row of users, whole, by id. Read by name: the schema's client knows more columns than exist before.
async function usersById(): Promise<Map<string, Record<string, unknown>>> {
  const rows = await prisma.$queryRawUnsafe<{ id: string; row: Record<string, unknown> }[]>(
    'SELECT id::text AS id, row_to_json(u) AS row FROM users u',
  );
  return new Map(rows.map(({ id, row }) => [id, row]));
}

let before: Map<string, Record<string, unknown>>;

beforeAll(async () => {
  shared = connect(inject('settings').DATABASE_URL);
  name = `migration_${randomUUID().replaceAll('-', '')}`;
  await shared.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  const url = new URL(inject('settings').DATABASE_URL);
  url.pathname = `/${name}`;
  migrateBefore(url.toString(), THE_MIGRATION);
  prisma = connect(url.toString());
  // A User who has not finished onboarding, and one who has, with the Master Switch on.
  await prisma.$executeRawUnsafe(
    `INSERT INTO users (google_subject, email, friend_id) VALUES ('100000000000000000101', 'a@snu.ac.kr', 'AAAAAAAA')`,
  );
  await prisma.$executeRawUnsafe(
    `INSERT INTO users (google_subject, email, friend_id, name, department, onboarded_at, master_switch_on)
     VALUES ('100000000000000000102', 'b@snu.ac.kr', 'BBBBBBBB', '홍길동', '컴퓨터공학부', now(), true)`,
  );
  before = await usersById();

  migrate(url.toString());
});

afterAll(async () => {
  await prisma.$disconnect();
  await shared.$executeRawUnsafe(`DROP DATABASE "${name}" WITH (FORCE)`);
  await shared.$disconnect();
});

describe('The migration that keeps the consent on the account', () => {
  it('adds the four columns empty to every User and changes nothing else of the row', async () => {
    const after = await usersById();

    expect(after.size).toBe(2);
    for (const [id, row] of before) {
      expect(after.get(id)).toEqual({
        ...row,
        consent_version: null,
        usage_consent: null,
        consented_at: null,
        usage_chosen_at: null,
      });
    }
  });

  it('leaves each account with no consent as the server reads it', async () => {
    const users = await prisma.user.findMany({
      select: { consentVersion: true, usageConsent: true, consentedAt: true, usageChosenAt: true },
    });

    expect(users).toEqual([
      { consentVersion: null, usageConsent: null, consentedAt: null, usageChosenAt: null },
      { consentVersion: null, usageConsent: null, consentedAt: null, usageChosenAt: null },
    ]);
  });
});
