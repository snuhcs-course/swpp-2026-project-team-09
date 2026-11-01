/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// Partitions of a 학번: nine digits with the hyphen after the fourth, without it, empty and null; wrong lengths on
// either side of the hyphen, a hyphen elsewhere, letters and other digits. The registered name: empty, blank, at and
// past its limit.

import { registeredNameOf } from '../src/users/dto/profile.dto.js';
import { registeredNameSchema, studentNumberSchema } from '../src/users/dto/update-profile.dto.js';

describe('A 학번', () => {
  it.each([
    ['with the hyphen', '2026-12345', '202612345'],
    ['without the hyphen', '202612345', '202612345'],
    ['with spaces around', ' 2026-12345 ', '202612345'],
  ])('%s is kept as its nine digits', (_case, sent, kept) => {
    expect(studentNumberSchema.parse(sent)).toBe(kept);
  });

  it.each([
    ['empty', ''],
    ['blank', '   '],
    ['null', null],
  ])('%s clears it', (_case, sent) => {
    expect(studentNumberSchema.parse(sent)).toBeNull();
  });

  it.each([
    ['eight digits', '20261234'],
    ['ten digits', '2026123456'],
    ['three digits before the hyphen', '202-612345'],
    ['six digits after the hyphen', '2026-123456'],
    ['four digits after the hyphen', '2026-1234'],
    ['the hyphen elsewhere', '20261-2345'],
    ['two hyphens', '2026--12345'],
    ['a letter', '2026-1234a'],
    ['full-width digits', '２０２６-１２３４５'],
    ['Arabic-Indic digits', '٢٠٢٦١٢٣٤٥'],
    ['a space inside', '2026 12345'],
    ['a number', 202612345],
  ])('with %s is refused', (_case, sent) => {
    expect(studentNumberSchema.safeParse(sent).success).toBe(false);
  });
});

describe('A registered name', () => {
  it('is kept without the spaces around it', () => {
    expect(registeredNameSchema.parse(' 홍길동 ')).toBe('홍길동');
  });

  it.each([
    ['empty', ''],
    ['blank', '  '],
    ['null', null],
  ])('%s is kept as none', (_case, sent) => {
    expect(registeredNameSchema.parse(sent)).toBeNull();
  });

  it('may have 30 characters but not 31', () => {
    expect(registeredNameSchema.safeParse('a'.repeat(30)).success).toBe(true);
    expect(registeredNameSchema.safeParse('a'.repeat(31)).success).toBe(false);
  });

  it('when none is the name', () => {
    expect(registeredNameOf({ name: '길동', registeredName: null })).toBe('길동');
    expect(registeredNameOf({ name: '길동', registeredName: '홍길동' })).toBe('홍길동');
  });
});
