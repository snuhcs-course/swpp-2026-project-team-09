/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { characters, givenName, shortTitle } from '@/features/map/short-name';

const FAMILY = '👨‍👩‍👧‍👦';

describe('a short title under a pin', () => {
  it('is cut at a word’s end within 8 characters', () => {
    expect(shortTitle('AI 커리어 설명회')).toBe('AI 커리어');
    expect(shortTitle('저녁 약속')).toBe('저녁 약속');
  });

  it('never cuts inside a character: an emoji of several code points is one', () => {
    expect(characters(`가${FAMILY}🇰🇷👍🏽é`)).toEqual(['가', FAMILY, '🇰🇷', '👍🏽', 'é']);
    // Nine characters in one word: the eighth is the whole family.
    expect(shortTitle(`일이삼사오육칠${FAMILY}구`)).toBe(`일이삼사오육칠${FAMILY}`);
    // Eight characters, though many more code units: nothing is cut.
    expect(shortTitle(`${FAMILY}${FAMILY} 파티 🇰🇷🇰🇷`)).toBe(`${FAMILY}${FAMILY} 파티 🇰🇷🇰🇷`);
  });
});

describe('a given name under a person', () => {
  it('is a Korean name of three syllables without its family name', () => {
    expect(givenName('김민준')).toBe('민준');
    expect(givenName(' 오현우 ')).toBe('현우');
  });

  it('is the whole name otherwise: no part of it is known to be the family name', () => {
    expect(givenName('남궁민수')).toBe('남궁민수');
    expect(givenName('이솔')).toBe('이솔');
    expect(givenName('Jane Doe')).toBe('Jane Doe');
    expect(givenName('민준😀')).toBe('민준😀');
  });
});
