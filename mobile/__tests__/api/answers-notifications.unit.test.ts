/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions of the check of `GET /notifications`: the documented shape, `ahead` left out, null, a text and of another
// type, and each checked field wrong. Expected values: main-server's README (Notifications).

import { inList, omit, wrongFields } from '../support/answer-variants';
import { isKeptNotifications } from '@/api/server/waiting-answers';

const LEAVE_BY = {
  id: 'leave-by:party:q1',
  kind: 'leave-by',
  title: '지금 나서요',
  ahead: '12:18 나설 시각',
  line: '학생회관식당까지 걸어서 15분',
  at: '2026-11-17T12:18:00+09:00',
  url: '/main?card=party:q1',
};

describe('isKeptNotifications', () => {
  it.each([
    ['a Notification with a title ahead', [LEAVE_BY]],
    ['one whose title ahead is null', [{ ...LEAVE_BY, ahead: null }]],
    ['one from a server that sends no title ahead', [omit(LEAVE_BY, 'ahead')]],
    ['none', []],
  ])('%s → accepted', (_, answer) => {
    expect(isKeptNotifications(answer)).toBe(true);
  });

  it.each([
    ['one Notification outside a list', LEAVE_BY],
    ['a title ahead that is a number', [{ ...LEAVE_BY, ahead: 1218 }]],
    ...inList(LEAVE_BY, wrongFields(LEAVE_BY, { id: [1], kind: [1], title: [1], line: [1], at: [1], url: [1] })),
  ])('%s → refused', (_, answer) => {
    expect(isKeptNotifications(answer)).toBe(false);
  });
});
