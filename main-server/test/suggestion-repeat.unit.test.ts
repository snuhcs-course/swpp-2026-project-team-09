/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type LedQuest, leadStart, mealSlotOf, repeatLast } from '../src/assistant/suggestions/templates.js';

// The grey suggestion repeat_last (P07 ticket 04) on plain Quests: a habit is two or more Quests the User led in the
// last 14 days at one Place in one meal slot.

function korea(at: string): Date {
  return new Date(`${at}:00+09:00`);
}

const NOW = korea('2101-03-07T09:00');
const HALL = { id: 'place-hall', name: '학생회관' };
const FRIENDS = new Set(['friend-minsu']);

// A Closed Quest for two at 학생회관 that started at `at`, with `changes`.
function led(at: string, changes: Partial<LedQuest> = {}): LedQuest {
  return {
    id: `quest-${at}`,
    startsAt: korea(at),
    place: HALL,
    joinPolicy: 'closed',
    board: null,
    capacity: 2,
    description: '',
    holderIds: ['friend-minsu', 'friend-gone'],
    ...changes,
  };
}

describe('mealSlotOf and leadStart', () => {
  it.each([
    ['10:29', '아침'],
    ['10:30', '점심'],
    ['14:29', '점심'],
    ['14:30', null],
    ['15:59', null],
    ['16:00', '저녁'],
  ])('%s → %s', (time, slot) => {
    const [hours = 0, minutes = 0] = time.split(':').map(Number);
    expect(mealSlotOf(hours * 60 + minutes)).toBe(slot);
  });

  it('starts at the next quarter hour at least 15 minutes ahead', () => {
    expect(leadStart(korea('2101-03-07T11:45'))).toEqual(korea('2101-03-07T12:00'));
    expect(leadStart(korea('2101-03-07T11:46'))).toEqual(korea('2101-03-07T12:15'));
  });
});

describe('repeatLast', () => {
  it('repeats the last of two Quests at one Place and slot, today at its time, inviting who is still a Friend', () => {
    const candidate = repeatLast(NOW, [led('2101-03-02T12:00'), led('2101-03-05T12:30')], FRIENDS);

    expect(candidate).toEqual({
      template: 'repeat_last',
      text: '지난번처럼 학생회관에서 점심 어때요?',
      reason: '최근 2주 2번 · 오늘 12:30',
      repeats: 2,
      action: {
        type: 'proposal',
        input: {
          title: '지난번처럼 학생회관에서 점심',
          description: '',
          joinPolicy: 'closed',
          board: undefined,
          capacity: 2,
          startsAt: '2101-03-07T12:30:00+09:00',
          placeId: 'place-hall',
          inviteeIds: ['friend-minsu'],
        },
        found: [
          { kind: 'place', id: 'place-hall' },
          { kind: 'friend', id: 'friend-minsu' },
        ],
      },
    });
  });

  it("takes an open Quest's Board and description, and starts tomorrow once today's time is too close", () => {
    const open = { joinPolicy: 'open', board: 'meal', capacity: 4, description: '같이 먹어요' } as const;
    const quests = [led('2101-03-01T09:10', open), led('2101-03-03T09:00', open)];

    expect(repeatLast(NOW, quests, FRIENDS)).toMatchObject({
      reason: '최근 2주 2번 · 내일 09:00',
      action: {
        input: {
          title: '지난번처럼 학생회관에서 아침',
          description: '같이 먹어요',
          joinPolicy: 'open',
          board: 'meal',
          capacity: 4,
          startsAt: '2101-03-08T09:00:00+09:00',
          inviteeIds: [],
        },
      },
    });
  });
});

describe('repeatLast, choosing among habits', () => {
  it('prefers the habit with more Quests and counts them as repeats', () => {
    const dinners = ['2101-03-01T18:00', '2101-03-02T18:00', '2101-03-03T18:00'].map((at) => led(at));
    const lunches = [led('2101-03-04T12:00'), led('2101-03-05T12:00')];

    expect(repeatLast(NOW, [...lunches, ...dinners], FRIENDS)).toMatchObject({
      text: '지난번처럼 학생회관에서 저녁 어때요?',
      repeats: 3,
    });
  });

  it.each([
    ['one Quest', [led('2101-03-05T12:00')]],
    ['two Quests in different slots', [led('2101-03-04T09:00'), led('2101-03-05T12:00')]],
    [
      'two Quests at different Places',
      [led('2101-03-04T12:00'), led('2101-03-05T12:00', { place: { id: 'p', name: 'p' } })],
    ],
    ['two Quests between the slots', [led('2101-03-04T15:00'), led('2101-03-05T15:00')]],
    ['a Quest older than 14 days', [led('2101-02-20T12:00'), led('2101-03-05T12:00')]],
    ['a Quest not started yet', [led('2101-03-05T12:00'), led('2101-03-07T12:00')]],
  ])('applies not to %s', (_quests, quests) => {
    expect(repeatLast(NOW, quests, FRIENDS)).toBeNull();
  });
});
