/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { screen } from './support/app';
import { givePhone, ME, ON_CAMPUS, openMain } from './support/main';
import {
  DINNER,
  EVENT,
  FRIEND,
  lookOf,
  MEMBER,
  OTHER_FRIEND,
  PARTY,
  press,
  wordsUnder,
  zoomIn,
} from './support/markers';
import { startFresh, withoutInterestMarks } from './support/mocks';
import { apiClient } from '@/api/client';
import { CAREER_GATHERING } from '@/api/mock/data/quests';

// A spied operation answers in the client's place, so its answers carry a Quest's mocked parts themselves.
const NO_PARTS = { photo: null, tags: [], faces: [] };

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  withoutInterestMarks();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('the map of the main screen, with the whole campus in view', () => {
  it('shows the Friends who can be seen and the member of the Party as small teardrops in their colours', async () => {
    await openMain();

    expect(lookOf(FRIEND)).toBe('person:small:free:f1:exact');
    expect(lookOf('정하은 · 수업 중 · 301동 · 13:50에 끝나요')).toBe('person:small:class:f5:exact');
    expect(lookOf('임채원 · 이동 중 · 교내 순환 셔틀 · 302동 방향')).toBe('person:small:moving:f10:exact');
    expect(lookOf(MEMBER)).toBe('person:small:member:pm1');
    expect(screen.getAllByTestId(/^person:small:(free|class|moving):/u)).toHaveLength(10);
  });

  it('has no marker for a Friend whose position is not known', async () => {
    await openMain();

    expect(screen.queryByRole('button', { name: /^서지우 · /u })).toBeNull();
    expect(screen.queryByRole('button', { name: /^신예린 · /u })).toBeNull();
  });

  it("shows the Party and the Shared Quest as dots, and the Global Event, which the User starred, as the star's pin, without names", async () => {
    await openMain();

    expect(lookOf(EVENT)).toBe('official:pin:starred');
    expect(lookOf(PARTY)).toBe('party:dot');
    expect(lookOf(DINNER)).toBe('party:dot');
    expect(wordsUnder(FRIEND, '김민준')).toBeNull();
    expect(wordsUnder(DINNER, '저녁 약속')).toBeNull();
  });
});

describe('the map of the main screen, closer', () => {
  it('shows people at their full size and places as pins, a Party with its members, still without names', async () => {
    const user = await openMain();

    await zoomIn(user, 2);

    expect(lookOf(FRIEND)).toBe('person:full:free:f1:exact');
    expect(lookOf(MEMBER)).toBe('person:full:member:pm1');
    // One Party goes to the Global Event: its pin has no count.
    expect(lookOf(EVENT)).toBe('official:pin:starred');
    expect(lookOf(PARTY)).toBe('party:pin:4');
    expect(lookOf(DINNER)).toBe('party:pin');
    expect(wordsUnder(FRIEND, '김민준')).toBeNull();
  });

  it('counts the Quests gathering for a Global Event on its pin when they are more than one', async () => {
    jest.spyOn(apiClient, 'listRecruitingQuests').mockResolvedValue([
      { ...CAREER_GATHERING, ...NO_PARTS },
      { ...CAREER_GATHERING, ...NO_PARTS, id: 'q-ai-other' },
    ]);
    const user = await openMain();

    await zoomIn(user, 2);

    expect(lookOf(EVENT)).toBe('official:pin:2:starred');
  });
});

describe('the map of the main screen, closest', () => {
  it("writes the full name under a person, and a place's short name in its tag", async () => {
    const user = await openMain();

    await zoomIn(user, 3);
    await press(user, FRIEND);

    expect(lookOf(FRIEND)).toBe('person:full:free:f1:exact:selected');
    expect(lookOf(DINNER)).toBe('party:pin:label="저녁 약속"');
    expect(wordsUnder(FRIEND, '김민준')).toBeVisible();
    expect(wordsUnder(DINNER, '저녁 약속')).toBeNull();
  });

  it("writes the full name under a member of the User's Party too", async () => {
    const user = await openMain();

    await zoomIn(user, 3);

    expect(wordsUnder(MEMBER, '오현우')).toBeVisible();
  });

  it('writes no words under a Global Event or a Party, which keep their names for a screen reader', async () => {
    const user = await openMain();

    await zoomIn(user, 3);
    await press(user, EVENT);

    // The Global Event "AI 커리어 설명회" and the Party "AI 커리어 설명회 같이 가요", which stand side by side.
    expect(lookOf(EVENT)).toBe('official:pin:starred:selected:label="AI 커리어"');
    expect(lookOf(PARTY)).toBe('party:pin:4:label="AI 커리어"');
    expect(wordsUnder(EVENT, 'AI 커리어')).toBeNull();
    expect(wordsUnder(PARTY, 'AI 커리어')).toBeNull();
  });
});

describe('a selected marker', () => {
  it('looks selected, and gives the look back when another is pressed', async () => {
    const user = await openMain();

    await press(user, FRIEND);
    expect(lookOf(FRIEND)).toBe('person:small:free:f1:exact:selected');

    await press(user, EVENT);
    expect(lookOf(FRIEND)).toBe('person:small:free:f1:exact');
    expect(lookOf(EVENT)).toBe('official:pin:starred:selected');
  });

  it('is drawn above the others, the User included', async () => {
    const user = await openMain();
    await press(user, OTHER_FRIEND);

    const drawn = screen.getAllByTestId(/^(person|me)/u).map((thing) => String(thing.props.accessibilityLabel));

    // The plain ground draws the later one above: the User's own Avatar lies under every face, so that a face over it
    // keeps its press (row 6's boards), and the selected one is above it too.
    expect(drawn.indexOf(OTHER_FRIEND)).toBeGreaterThan(drawn.indexOf(ME));
    expect(drawn.indexOf(ME)).toBeLessThan(drawn.indexOf(FRIEND));
  });
});
