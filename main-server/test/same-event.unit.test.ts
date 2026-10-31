/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import {
  linkedPosts,
  matchAmong,
  normalisedTitle,
  refusalOf,
  type Refusal,
  startsDiffer,
} from '../src/global-events/same-event.js';

const AT_TWO = new Date('2027-03-10T14:00:00+09:00');
const AT_THREE = new Date('2027-03-10T15:00:00+09:00');
const THE_DAY = new Date('2027-03-10T00:00:00+09:00');
const THE_NEXT_DAY = new Date('2027-03-11T14:00:00+09:00');

describe('A normalised title', () => {
  it.each([
    ['[중앙도서관] IEEE Authorship Seminar', 'ieee authorship seminar'],
    ['IEEE   Authorship-Seminar!', 'ieeeauthorship seminar'],
    ['【공지】ＩＥＥＥ Authorship Seminar (대면)', 'IEEE <온라인> Authorship Seminar'],
  ])('reads %s and %s as one', (first, second) => {
    expect(normalisedTitle(first)).toBe(normalisedTitle(second));
  });

  it('keeps what is bracketed when nothing else is left, so that two such titles stay apart', () => {
    expect(normalisedTitle('[특강]')).not.toBe(normalisedTitle('[설명회]'));
  });

  it('keeps words apart', () => {
    expect(normalisedTitle('진로 특강')).not.toBe(normalisedTitle('창업 특강'));
  });
});

describe('The refusing rules', () => {
  it.each<[string, string, Refusal]>([
    ['특강 1차', '특강 2차', 'different_rounds'],
    ['특강 (1회차)', '특강 2차', 'different_rounds'],
    ['특강 대면', '특강 비대면', 'different_modes'],
    ['행사 헬퍼', '행사 디자이너', 'different_roles'],
    ['멘토 모집', '멘티 모집', 'different_roles'],
  ])('tell %s from %s', (first, second, refusal) => {
    expect(refusalOf({ title: first, startsAt: AT_TWO }, { title: second, startsAt: AT_TWO })).toBe(refusal);
  });

  it.each([
    ['특강 1차', '특강'],
    ['특강 1차', '특강 1차'],
    ['특강 대면', '특강'],
    ['대면/비대면 특강', '비대면 특강'],
    ['3차원 프린팅', '2차 프린팅'],
    ['학생용 특강', '일반용 특강'],
    ['멘토링 안내', '멘티 모집'],
  ])('do not tell %s from %s', (first, second) => {
    expect(refusalOf({ title: first, startsAt: AT_TWO }, { title: second, startsAt: AT_TWO })).toBeNull();
  });

  it('refuse two times of one day', () => {
    expect(refusalOf({ title: '특강', startsAt: AT_TWO }, { title: '특강', startsAt: AT_THREE })).toBe(
      'different_times',
    );
  });

  it('keep a day alone against a time of that day, and the day after', () => {
    expect(refusalOf({ title: '특강', startsAt: AT_TWO }, { title: '특강', startsAt: THE_DAY })).toBeNull();
    expect(refusalOf({ title: '특강', startsAt: AT_TWO }, { title: '특강', startsAt: THE_NEXT_DAY })).toBeNull();
  });
});

describe('The match among candidates', () => {
  const session = { title: '[도서관] 특강', startsAt: AT_TWO };

  it('is the one with an equal normalised title and an equal start', () => {
    expect(
      matchAmong(session, [
        { id: 'other title', title: '설명회', startsAt: AT_TWO },
        { id: 'other start', title: '특강', startsAt: THE_NEXT_DAY },
        { id: 'same', title: '특강', startsAt: AT_TWO },
      ]),
    ).toEqual({ kind: 'one', globalEventId: 'same' });
  });

  it('leaves out one a rule refuses, whatever its title normalises to', () => {
    expect(
      matchAmong({ title: '특강 (대면)', startsAt: AT_TWO }, [
        { id: 'remote', title: '특강 (비대면)', startsAt: AT_TWO },
      ]),
    ).toEqual({ kind: 'none' });
  });

  it('says so when several match', () => {
    expect(
      matchAmong(session, [
        { id: 'a', title: '특강', startsAt: AT_TWO },
        { id: 'b', title: '(재공지) 특강', startsAt: AT_TWO },
      ]),
    ).toEqual({ kind: 'several', globalEventIds: ['a', 'b'] });
  });
});

describe('Two starts', () => {
  it('differ by their times, or by their days when one is a day alone', () => {
    expect(startsDiffer(AT_TWO, AT_THREE)).toBe(true);
    expect(startsDiffer(AT_TWO, AT_TWO)).toBe(false);
    expect(startsDiffer(AT_TWO, THE_DAY)).toBe(false);
    expect(startsDiffer(THE_NEXT_DAY, THE_DAY)).toBe(true);
  });
});

describe('The posts a text links', () => {
  it('are read by each Source address, with or without a scheme, each once', () => {
    expect(
      linkedPosts(
        [
          '신청: extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=PGM012002382',
          'http://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=PGM012002382',
          'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=178226',
        ].join('\n'),
      ),
    ).toEqual([
      { source: 'snu_events', key: '178226' },
      { source: 'extra_snu', key: 'PGM012002382' },
    ]);
  });

  it("do not take another site's link with the same parameter", () => {
    expect(linkedPosts('https://example.com/view?dataSeq=PGM1 https://example.com/?bbsidx=1')).toEqual([]);
  });
});
