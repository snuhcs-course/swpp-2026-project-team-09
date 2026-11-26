/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { font } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import { answerEvents, card, CAREER, MY_CAREER, openEvents } from './support/events';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { askMainServer, DINNER, PHONE_NOW } from './support/server';

// The 행사 tab's detail sheet as P06 ticket 14 settled it, against the fake main server: no 내 파티 and no source over
// the title, its type, and the description laid out by its own lines. Expected values: the ticket and its wireframes.

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

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function openCareer(user: Awaited<ReturnType<typeof openEvents>>): Promise<ReturnType<typeof within>> {
  await user.press(card(CAREER).getByRole('button', { name: CAREER.title }));
  await pass(500);
  return within(screen.getByTestId('event-detail'));
}

describe("the sheet's head", () => {
  it("shows neither the 내 파티 of the row nor the source, for an event of the User's 파티 with an announcer", async () => {
    answerEvents(server, { quests: [DINNER, MY_CAREER] });
    const user = await openEvents();
    expect(card(CAREER).getByText('내 파티')).toBeVisible();
    // The row has had no source line since P06 ticket 15.
    expect(card(CAREER).queryByText('컴퓨터공학부 공지')).toBeNull();

    const sheet = await openCareer(user);

    expect(sheet.getByRole('header', { name: CAREER.title })).toBeVisible();
    expect(sheet.queryByText('내 파티')).toBeNull();
    expect(sheet.queryByText('컴퓨터공학부 공지')).toBeNull();
  });
});

describe("the sheet's type", () => {
  it('sets the title in 21 Bold, the time and the place in 14 SemiBold and the description in 14 Regular', async () => {
    answerEvents(server);

    const sheet = await openCareer(await openEvents());

    expect(sheet.getByRole('header', { name: CAREER.title })).toHaveStyle({
      fontFamily: font.bold,
      fontSize: 21,
      lineHeight: 29,
    });
    for (const value of ['오늘 18:00–20:00', CAREER.place ?? '']) {
      expect(sheet.getByText(value)).toHaveStyle({ fontFamily: font.semiBold, fontSize: 14, lineHeight: 21 });
    }
    expect(sheet.getByText(CAREER.description)).toHaveStyle({ fontFamily: font.regular, fontSize: 14, lineHeight: 22 });
  });
});

describe("the sheet's description", () => {
  it('lays the text out by its own lines, 7 apart and 14 across blank lines, its words unchanged', async () => {
    const lines = [
      '안녕하세요.',
      '규장각에서 워크숍을 엽니다.',
      '○ 일시: 11월 27일(금) 15:00~17:00',
      '○ 장소: 82동 113호',
    ];
    // Blank lines at the ends, and a run of two between, one of them a space.
    answerEvents(server, {
      events: [{ ...CAREER, description: `\n${lines[0]}\n${lines[1]}\n\n \n${lines[2]}\n${lines[3]}\n\n` }],
    });

    await openCareer(await openEvents());

    const blocks = screen.getByTestId('event-description');
    expect(blocks.children).toHaveLength(lines.length);
    expect(
      within(blocks)
        .getAllByText(/./u)
        .map((block) => block.props.children as unknown),
    ).toEqual(lines);
    expect(within(blocks).getByText(lines[0])).toHaveStyle({ marginTop: 0 });
    expect(within(blocks).getByText(lines[1])).toHaveStyle({ marginTop: 7 });
    expect(within(blocks).getByText(lines[2])).toHaveStyle({ marginTop: 14 });
    expect(within(blocks).getByText(lines[3])).toHaveStyle({ marginTop: 7 });
  });
});
