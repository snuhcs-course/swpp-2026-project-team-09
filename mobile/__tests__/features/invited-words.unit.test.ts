/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLine, ConditionChip } from '@/api/assistant-types';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { SubQuest } from '@/api/types';
import {
  invitedNamesOf,
  invitedPlaceOf,
  invitedWordOf,
  nextLineOf,
  sentLineOf,
} from '@/features/assistant/invited-words';

// P04 ticket 23, the feedback of 2026-11-22 (item 7a): the card after inviting says whom and to what, then when and
// where. Expected values: the feedback report's own example, "안진영에게 점심 초대를 보냈어요" / "모레(월) 14:00
// 학생회관식당 · 수락하면 알려 드려요".

const NOW = new Date('2026-11-21T10:00:00+09:00');

function words(line: AnswerLine): string {
  return line.map(({ text }) => text).join('');
}

// Partitions: a lunch's title, a dinner's, a meeting's, a title with no meal.
describe('what an invitation is to', () => {
  it('is the meal the title names, else 약속', () => {
    expect(invitedWordOf('302동식당에서 점심')).toBe('점심');
    expect(invitedWordOf('학생회관식당에서 저녁')).toBe('저녁');
    expect(invitedWordOf('민수와 만나기')).toBe('약속');
    expect(invitedWordOf('배드민턴')).toBe('약속');
  });
});

// Partitions: one Friend, two, a chip with words after the name, and a chip that is no Friend's.
describe('whom an invitation went to', () => {
  it("names the Friends of the person chips, each by the words before ' · '", () => {
    const chips: ConditionChip[] = [
      { kind: 'person', text: '안진영', userId: 'u1' },
      { kind: 'person', text: '이민수 · 자리 모름', userId: 'u2' },
      { kind: 'from', text: '12:00 이후', userId: null },
    ];

    expect(invitedNamesOf(chips)).toEqual(['안진영', '이민수']);
    expect(sentLineOf(['안진영'], '점심')).toBe('안진영에게 점심 초대를 보냈어요');
    expect(sentLineOf(['안진영', '이민수'], '약속')).toBe('안진영, 이민수에게 약속 초대를 보냈어요');
  });
});

const STEP = PLAN_QUEST.quest.subQuests[0];

function step(startsAt: string, label: string): SubQuest[] {
  return STEP === undefined
    ? []
    : [{ ...STEP, startsAt, place: { placeId: null, label, latitude: null, longitude: null } }];
}

// Partitions: a meal, whose Restaurant its title names; a meeting, whose step at the start is where; none at it.
describe('where an invitation is to', () => {
  const steps = [...step('2026-11-21T03:00:00.000Z', '301동 앞'), ...step('2026-11-21T03:15:00.000Z', '제2공학관')];

  it("is a meal's Restaurant, else the Place of the step at the start", () => {
    expect(invitedPlaceOf('302동식당에서 점심', steps, '2026-11-21T12:15:00+09:00')).toBe('302동식당');
    expect(invitedPlaceOf('민수와 만나기', steps, '2026-11-21T12:00:00+09:00')).toBe('301동 앞');
    expect(invitedPlaceOf('민수와 만나기', steps, '2026-11-21T13:00:00+09:00')).toBeNull();
  });
});

// Partitions: today, the day after tomorrow, no Place.
describe('when and where an invitation is for', () => {
  it('says the day only when it is not today, then the time, the Place, and what comes next', () => {
    expect(words(nextLineOf('2026-11-21T12:15:00+09:00', '302동식당', NOW))).toBe(
      '12:15 302동식당 · 수락하면 알려 드려요',
    );
    expect(words(nextLineOf('2026-11-23T14:00:00+09:00', '학생회관식당', NOW))).toBe(
      '모레(월) 14:00 학생회관식당 · 수락하면 알려 드려요',
    );
    expect(words(nextLineOf('2026-11-21T12:15:00+09:00', null, NOW))).toBe('12:15 · 수락하면 알려 드려요');
  });
});
