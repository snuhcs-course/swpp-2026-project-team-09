// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06 to 2026-10-09, prompted by AhnJinYoung, fyoon46 and Jaehyun0320, reviewed by fyoon46 in #74
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
import { startFresh } from './support/mocks';
import { apiClient } from '@/api/client';
import { CAREER_GATHERING } from '@/api/mock/data/quests';

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('the map of the main screen, with the whole campus in view', () => {
  it('shows the Friends who can be seen and the member of the Party as small teardrops in their colours', async () => {
    await openMain();

    expect(lookOf(FRIEND)).toBe('person:small:free:f1');
    expect(lookOf('정하은 · 수업 중 · 301동 · 13:50에 끝나요')).toBe('person:small:class:f5');
    expect(lookOf('임채원 · 이동 중 · 교내 순환 셔틀 · 302동 방향')).toBe('person:small:moving:f10');
    expect(lookOf(MEMBER)).toBe('person:small:member:pm1');
    expect(screen.getAllByTestId(/^person:small:(free|class|moving):/u)).toHaveLength(10);
  });

  it('has no marker for a Friend whose position is not known', async () => {
    await openMain();

    expect(screen.queryByRole('button', { name: /^서지우 · /u })).toBeNull();
    expect(screen.queryByRole('button', { name: /^신예린 · /u })).toBeNull();
  });

  it('shows the Global Event, the Party and the Shared Quest as dots, without names', async () => {
    await openMain();

    expect(lookOf(EVENT)).toBe('official:dot');
    expect(lookOf(PARTY)).toBe('party:dot');
    expect(lookOf(DINNER)).toBe('party:dot');
    expect(wordsUnder(FRIEND, '민준')).toBeNull();
    expect(wordsUnder(DINNER, '저녁 약속')).toBeNull();
  });
});

describe('the map of the main screen, closer', () => {
  it('shows people at their full size and places as pins, a Party with its members, still without names', async () => {
    const user = await openMain();

    await zoomIn(user, 2);

    expect(lookOf(FRIEND)).toBe('person:full:free:f1');
    expect(lookOf(MEMBER)).toBe('person:full:member:pm1');
    // One Party goes to the Global Event: its pin has no count.
    expect(lookOf(EVENT)).toBe('official:pin');
    expect(lookOf(PARTY)).toBe('party:pin:4');
    expect(lookOf(DINNER)).toBe('party:pin');
    expect(wordsUnder(FRIEND, '민준')).toBeNull();
  });

  it('counts the Quests gathering for a Global Event on its pin when they are more than one', async () => {
    jest
      .spyOn(apiClient, 'listRecruitingQuests')
      .mockResolvedValue([CAREER_GATHERING, { ...CAREER_GATHERING, id: 'q-ai-other' }]);
    const user = await openMain();

    await zoomIn(user, 2);

    expect(lookOf(EVENT)).toBe('official:pin:2');
  });
});

describe('the map of the main screen, closest', () => {
  it('writes the given name under a person and no words under a place', async () => {
    const user = await openMain();

    await press(user, FRIEND);
    await press(user, '가까이 보기');

    expect(lookOf(FRIEND)).toBe('person:full:free:f1:selected');
    expect(lookOf(DINNER)).toBe('party:pin');
    expect(wordsUnder(FRIEND, '민준')).toBeVisible();
    expect(wordsUnder(DINNER, '저녁 약속')).toBeNull();
  });

  it("writes the given name under a member of the User's Party too", async () => {
    const user = await openMain();

    await press(user, MEMBER);
    await press(user, '가까이 보기');

    expect(wordsUnder(MEMBER, '현우')).toBeVisible();
  });

  it('writes no words under a Global Event or a Party, which keep their names for a screen reader', async () => {
    const user = await openMain();

    await press(user, EVENT);
    await press(user, '가까이 보기');

    // The Global Event "AI 커리어 설명회" and the Party "AI 커리어 설명회 같이 가요", which stand side by side.
    expect(lookOf(EVENT)).toBe('official:pin:selected');
    expect(lookOf(PARTY)).toBe('party:pin:4');
    expect(wordsUnder(EVENT, 'AI 커리어')).toBeNull();
    expect(wordsUnder(PARTY, 'AI 커리어')).toBeNull();
  });
});

describe('a selected marker', () => {
  it('looks selected, and gives the look back when another is pressed', async () => {
    const user = await openMain();

    await press(user, FRIEND);
    expect(lookOf(FRIEND)).toBe('person:small:free:f1:selected');

    await press(user, EVENT);
    expect(lookOf(FRIEND)).toBe('person:small:free:f1');
    expect(lookOf(EVENT)).toBe('official:dot:selected');
  });

  it('is drawn above the others, the User included', async () => {
    const user = await openMain();
    await press(user, OTHER_FRIEND);

    const drawn = screen.getAllByTestId(/^(person|me)/u).map((thing) => String(thing.props.accessibilityLabel));

    // The plain ground draws the later one above: the User's own Avatar is above every other, but the selected one.
    expect(drawn.indexOf(OTHER_FRIEND)).toBeGreaterThan(drawn.indexOf(ME));
    expect(drawn.indexOf(ME)).toBeGreaterThan(drawn.indexOf(FRIEND));
  });
});
