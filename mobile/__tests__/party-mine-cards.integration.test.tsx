/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { StyleSheet, type TextStyle, type ViewStyle } from 'react-native';
import type { Quest } from '@/api/types';
import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMyParty, MIN_JUN_HOLDER, myPicnicParty, PICNIC } from './support/room';
import { answerParty, MY_HIKE, openAt } from './support/party';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// The cards of 내 파티 as 찾기's (P06 ticket 18), against the fake main server, on Tuesday 6 October 2026 at 13:00 in
// Korea: the tag and the count, the crown of a 파티 the User leads, the title, the time, the place and the event each
// on its line, the live outline, and the gap between the groups.

jest.mock('expo-location');
jest.mock('@/hooks/use-reduce-motion', () => ({
  useReduceMotion: (): boolean => true,
  useMotionAllowed: (): boolean => false,
  useReduceMotionSetting: (): boolean => true,
}));
jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('./support/fake-socket'));

let server: FakeServer;
let setAnswers: ReturnType<typeof answerParty>;

// 김민준's Open Quest on the 식사 board, which the User holds with him.
const THEIRS: Quest = { ...MY_HIKE, id: 'quest-theirs', title: '남의 점심', board: 'meal', leader: MIN_JUN_HOLDER };

type Host = ReturnType<typeof screen.getByRole>;

function card(title: string): ReturnType<typeof within> {
  return within(screen.getByRole('button', { name: title }));
}

function styleOf(element: Host | null | undefined): ViewStyle & TextStyle {
  const style: unknown = element?.props.style;
  return StyleSheet.flatten<ViewStyle & TextStyle>(Array.isArray(style) ? style : [style]);
}

// The User's Open Quest whose one Sub Quest starts at `startsAt`.
function plannedAt(title: string, startsAt: string): Quest {
  const [first] = MY_HIKE.subQuests;
  return { ...MY_HIKE, id: `quest-${title}`, title, subQuests: first === undefined ? [] : [{ ...first, startsAt }] };
}

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  setAnswers = answerParty(server, { quests: [DINNER, MY_HIKE] });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the top of a card of 내 파티', () => {
  it('shows a 공개 파티’s board and 비공개 for a 비공개 one in the tag, without the kind', async () => {
    setAnswers({
      quests: [DINNER, MY_HIKE, { ...MY_HIKE, id: 'quest-boardless', title: '게시판 없는 파티', board: null }],
    });
    await openAt('/party?tab=mine');

    expect(card(MY_HIKE.title).getByText('취미 게시판')).toBeVisible();
    expect(card(MY_HIKE.title).queryByText('공개')).toBeNull();
    expect(card(DINNER.title).getByText('비공개')).toBeVisible();
    expect(card('게시판 없는 파티').queryByText(/게시판$|^공개$|^비공개$/u)).toBeNull();
  });

  it('crowns the count of a Quest the User leads, named 방장, and of no other', async () => {
    setAnswers({ quests: [DINNER, MY_HIKE, THEIRS] });
    await openAt('/party?tab=mine');

    expect(card(MY_HIKE.title).getByLabelText('방장')).toBeVisible();
    expect(card(DINNER.title).getByLabelText('방장')).toBeVisible();
    expect(card(THEIRS.title).queryByLabelText('방장')).toBeNull();
    expect(card(THEIRS.title).getByText('식사 게시판')).toBeVisible();
    // The crown stands first in the count's row.
    const crown = card(MY_HIKE.title).getByLabelText('방장');
    const row = crown.parent;
    if (row === null) {
      throw new Error('The crown has no row');
    }
    expect(row.children[0]).toBe(crown);
    expect(within(row).getByText('1/6명')).toBeVisible();
  });
});

describe('the words of a card of 내 파티', () => {
  it('puts the title on up to two lines, then the time, the place and the event each on its line', async () => {
    const event = { id: 'event-career', title: 'AI 커리어 설명회' };
    setAnswers({ quests: [DINNER, { ...MY_HIKE, globalEvent: event }] });
    await openAt('/party?tab=mine');

    const hike = card(MY_HIKE.title);
    expect(hike.getByText(MY_HIKE.title)).toHaveProp('numberOfLines', 2);
    expect(hike.getByText('20:10 · 7시간 후')).toHaveProp('numberOfLines', 1);
    expect(hike.getByText('학생회관 (63동)')).toHaveProp('numberOfLines', 2);
    expect(hike.getByText(event.title)).toHaveStyle({ color: color.blue600 });
    expect(hike.getByText(event.title)).toHaveProp('numberOfLines', 1);
    expect(hike.queryByText('·')).toBeNull();
    expect(card(DINNER.title).queryByTestId('event-line')).toBeNull();
  });

  it('reads 장소 미정 on its line when the next step has no place', async () => {
    const [first] = MY_HIKE.subQuests;
    setAnswers({ quests: [{ ...MY_HIKE, subQuests: first === undefined ? [] : [{ ...first, place: null }] }] });
    await openAt('/party?tab=mine');

    expect(card(MY_HIKE.title).getByText('장소 미정')).toHaveProp('numberOfLines', 2);
  });
});

describe('the cards of 내 파티 together', () => {
  it('outlines in navy the card of the Party the User is in, and no other', async () => {
    setAnswers({ quests: [DINNER, PICNIC] });
    answerMyParty(server, myPicnicParty());
    await openAt('/party?tab=mine');

    expect(screen.getByRole('button', { name: PICNIC.title })).toHaveStyle({
      borderWidth: 2,
      borderColor: color.snuBlue,
    });
    expect(screen.getByRole('button', { name: DINNER.title })).toHaveStyle({
      borderWidth: 1,
      borderColor: color.border,
    });
  });

  it('leaves 20 from a group’s last card to the next group’s header words, and 12 between cards', async () => {
    setAnswers({ quests: [DINNER, MY_HIKE, plannedAt('내일 점심', '2026-10-07T03:00:00.000Z')] });
    await openAt('/party?tab=mine');

    const header = screen.getByRole('header', { name: '내일' });
    const group = header.parent;
    expect(Number(styleOf(group?.parent).gap) + Number(styleOf(header).paddingTop)).toBe(20);
    expect(styleOf(screen.getByRole('header', { name: '오늘' }).parent).gap).toBe(12);
  });
});
