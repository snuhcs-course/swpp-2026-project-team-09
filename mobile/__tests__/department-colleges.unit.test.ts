/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { GRADUATE, UNDERGRADUATE } from '@/screens/onboarding/departments';

// The main server's department → college table (`main-server/seed/department-colleges.json`), read beside the app's
// department list: the 공부공간 layer greys a space for a department the table does not hold, so every department a
// User can choose must be there.

const TABLE = path.join(__dirname, '..', '..', 'main-server', 'seed', 'department-colleges.json');

function tableOf(): Record<string, string | null> {
  const parsed: unknown = JSON.parse(readFileSync(TABLE, 'utf8'));
  const departments: unknown =
    typeof parsed === 'object' && parsed !== null ? Reflect.get(parsed, 'departments') : null;
  if (typeof departments !== 'object' || departments === null) {
    throw new Error('department-colleges.json holds no departments');
  }
  return Object.fromEntries(Object.entries(departments));
}

const listed = [...UNDERGRADUATE, ...GRADUATE].flatMap(({ departments }) => departments);

describe('department-colleges.json', () => {
  it('has an entry for every department of the app, undergraduate and graduate', () => {
    const table = tableOf();

    expect(listed.filter((department) => !(department in table))).toEqual([]);
  });

  it('maps each to a college or to null', () => {
    const table = tableOf();

    for (const department of listed) {
      const college = table[department];
      expect(college === null || (typeof college === 'string' && college.length > 0)).toBe(true);
    }
  });

  it('maps an undergraduate department to the college the list groups it under', () => {
    const table = tableOf();

    expect(table['경영학과']).toBe('경영대학');
    expect(table['국어국문학과']).toBe('인문대학');
    expect(table['화학생물공학부']).toBe('공과대학');
  });
});
