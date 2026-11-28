/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Partitions of 알림's groups: rows of today, yesterday and before in Korea, around each midnight; rows that wait among
// kept ones; a group with no rows; no rows at all. Expected values: P06 ticket 39.

import { type NoticeView, noticeDays } from '@/features/notifications/adapter';

// A row of 알림 with only what the groups read: a kept one at `at`, or one of what waits.
function noticeAt(key: string, at: string | null): NoticeView {
  return {
    key,
    kind: at === null ? 'invitation' : 'accepted',
    icon: 'calendar',
    title: key,
    sub: '',
    questId: null,
    address: null,
    time: null,
    at,
    keptId: at === null ? null : key,
  };
}

// Now is 00:30 on 17 November 2026 in Korea.
const AFTER_MIDNIGHT = new Date('2026-11-17T00:30:00+09:00');

const daysOf = (rows: NoticeView[], now = AFTER_MIDNIGHT): [string, string[]][] =>
  noticeDays(rows, now).map(({ title, notices }) => [title, notices.map(({ key }) => key)]);

describe('noticeDays', () => {
  it('rows of today, yesterday and before, out of order → 오늘, 어제 and 이전, the latest first in each', () => {
    const rows = [
      noticeAt('before', '2026-11-10T09:00:00+09:00'),
      noticeAt('today-early', '2026-11-17T00:05:00+09:00'),
      noticeAt('yesterday-early', '2026-11-16T08:00:00+09:00'),
      noticeAt('today-late', '2026-11-17T00:20:00+09:00'),
      noticeAt('yesterday-late', '2026-11-16T23:59:00+09:00'),
      noticeAt('two-days-ago', '2026-11-15T23:59:00+09:00'),
    ];
    expect(daysOf(rows)).toEqual([
      ['오늘', ['today-late', 'today-early']],
      ['어제', ['yesterday-late', 'yesterday-early']],
      ['이전', ['two-days-ago', 'before']],
    ]);
  });

  it('rows that wait, among kept ones → at the top of 오늘, in the order given', () => {
    const rows = [noticeAt('kept', '2026-11-17T00:10:00+09:00'), noticeAt('wait-1', null), noticeAt('wait-2', null)];
    expect(daysOf(rows)).toEqual([['오늘', ['wait-1', 'wait-2', 'kept']]]);
  });

  it.each([
    ['midnight in Korea, given in UTC', '2026-11-16T15:00:00Z', '오늘'],
    ['a minute before midnight in Korea', '2026-11-16T14:59:00Z', '어제'],
    ['the start of the day before in Korea', '2026-11-15T15:00:00Z', '어제'],
    ['a minute before that', '2026-11-15T14:59:00Z', '이전'],
  ])('a time at %s (%s), with now at 00:30 in Korea → %s', (_, at, title) => {
    expect(daysOf([noticeAt('one', at)])).toEqual([[title, ['one']]]);
  });

  it('only rows of before → 이전 alone, with no empty 오늘 or 어제', () => {
    expect(daysOf([noticeAt('before', '2026-11-01T09:00:00+09:00')])).toEqual([['이전', ['before']]]);
  });

  it('no row → no group', () => {
    expect(daysOf([])).toEqual([]);
  });
});
