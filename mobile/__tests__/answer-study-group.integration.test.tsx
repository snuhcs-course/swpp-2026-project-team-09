/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import { STUDY_GROUP_MORE_NEEDED, STUDY_GROUP_TO_SEND } from '@/api/mock/data/study-group-answers';
import { text } from '@/design-system';
import { LOW_LINES } from '@/screens/main/answer/card-caps';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { pass, screen } from './support/app';
import { mapThings } from './support/answer-map';
import type { FakeServer } from './support/fake-server';
import type { FakeLibrary } from './support/kwanjeong/fake-library';
import { inDock, inFrame, startLibraryChat } from './support/library-chat';
import { pickDone, pickRow, pickRows } from './support/picking';
import { ASKED_AT, askerAlone, askTogether, FIRST_FREE, ROOM_MARK, SAID } from './support/study-group';

// The study answer together in the meal's frame (P10 ticket 11; design group-study-design ② ③ 가): the time card with
// "같이" and the Friends' busy time, the room's mark and the people on the map, the room ticket in the card, and the
// button beside the input, against the fake main server and the fake library.

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
let library: FakeLibrary;

beforeEach(async () => {
  ({ server, library } = await startLibraryChat(ASKED_AT));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const ticket = (): ReturnType<typeof within> => within(inFrame().getByTestId('room-ticket'));

// The input a recalculation sent: its people and whether together.
function inputOf(body: unknown): { people: number; together: unknown } | null {
  if (typeof body !== 'object' || body === null || !('input' in body)) {
    return null;
  }
  const { input } = body;
  if (typeof input !== 'object' || input === null || !('people' in input) || !Array.isArray(input.people)) {
    return null;
  }
  return { people: input.people.length, together: 'together' in input ? input.together : undefined };
}

function askedPeople(): (number | undefined)[] {
  return server.received('POST /assistant/answers').map(({ body }) => inputOf(body)?.people);
}

// The answer's own row of a Friend: the fake server's Friends hold another 이서연, and the band's comes first.
function answerRow(name: string): ReturnType<typeof screen.getByRole> {
  const [row] = within(screen.getByTestId('time-card-rows')).getAllByRole('checkbox', {
    name: new RegExp(`^${name} · `, 'u'),
  });
  if (row === undefined) {
    throw new Error(`No row of ${name}`);
  }
  return row;
}

// Partitions: the answer to send. Expected values: the server's fixture, the design, and the fake library's rooms.
describe('The study answer together, to send', () => {
  it('shows the time card with the Friends, the room on the map, the ticket with its first free room, and 동의 요청 보내기', async () => {
    await askTogether({ server, library }, STUDY_GROUP_TO_SEND);
    await pass(500);

    expect(screen.getByRole('button', { name: '같이 공부할 친구 추가' })).toHaveTextContent('같이 3 ›');
    expect(mapThings()).toContain(ROOM_MARK);
    expect(inFrame().getByText(SAID)).toBeVisible();
    expect(ticket().getByText('그룹스터디룸 · 4명')).toBeVisible();
    expect(ticket().getByText('4층 6인실')).toBeVisible();
    expect(ticket().getByText(FIRST_FREE)).toBeVisible();
    expect(inDock().getByRole('button', { name: '동의 요청 보내기' })).toBeOnTheScreen();
  });

  it('asks again without a Friend taken out in the time card', async () => {
    const { user } = await askTogether({ server, library }, STUDY_GROUP_TO_SEND);
    server.on('POST /assistant/answers', { status: 200, body: STUDY_GROUP_MORE_NEEDED });
    await pass(500);

    await user.press(screen.getByRole('button', { name: '같이 공부할 친구 추가' }));
    await user.press(pickRow('김지은'));
    await user.press(pickDone());
    await pass(500);

    expect(askedPeople()).toEqual([3]);
  });
});

// Partitions: three people, and the asker alone. Expected values: the design (가) and the server's rule.
describe('The study answer together, short of people', () => {
  it('is dimmed with how many more, and its button opens the Friends to pick', async () => {
    const { user } = await askTogether({ server, library }, STUDY_GROUP_MORE_NEEDED);
    await pass(500);

    expect(inFrame().getByText('그룹스터디룸은 네 명부터예요. 한 명만 더 부르면 돼요.')).toBeVisible();
    expect(ticket().getByText('4명부터')).toBeVisible();
    await user.press(inDock().getByRole('button', { name: '+ 같이 한 명 더' }));
    expect(pickRows()).toContainEqual(expect.stringMatching(/^최준호 · /u));
  });

  it('for the asker alone, picks three Friends and asks again with the four together', async () => {
    const { user } = await askTogether({ server, library }, askerAlone(), { words: '같이 공부할 자리 있어?' });
    server.on('POST /assistant/answers', { status: 200, body: STUDY_GROUP_TO_SEND });
    await pass(500);

    expect(inFrame().getByText('그룹스터디룸은 네 명부터예요. 세 명 더 부르면 돼요.')).toBeVisible();
    await user.press(inDock().getByRole('button', { name: '+ 같이' }));
    await user.press(answerRow('박민수'));
    await user.press(answerRow('이서연'));
    await user.press(answerRow('김지은'));
    await user.press(pickDone());
    await pass(500);

    expect(askedPeople()).toEqual([4]);
    expect(inputOf(server.received('POST /assistant/answers')[0]?.body)?.together).toBe(true);
    expect(inDock().getByRole('button', { name: '동의 요청 보내기' })).toBeOnTheScreen();
  });
});

// Partitions: logged out of the library. Expected values: the seat answer's way (the ticket's room alone, its red line
// "관정도서관 로그인이 필요해요" under the ticket, 로그인).
describe('The study answer together, logged out of the library', () => {
  it('keeps the room’s label alone, says to log in as the seat answer does, and its button logs in', async () => {
    await askTogether({ server, library }, STUDY_GROUP_TO_SEND, { loggedIn: false });
    await pass(500);

    expect(within(inFrame().getByTestId('room-ticket-room')).getByText('방')).toBeVisible();
    expect(ticket().queryByText(FIRST_FREE)).toBeNull();
    expect(inFrame().getByText('관정도서관 로그인이 필요해요')).toBeVisible();
    expect(inFrame().queryByText('로그인하면 빈 방을 볼 수 있어요')).toBeNull();
    expect(inDock().getByRole('button', { name: '로그인' })).toBeOnTheScreen();
  });

  it('says nothing of the login while people are missing, its button being "+ 같이 한 명 더"', async () => {
    await askTogether({ server, library }, STUDY_GROUP_MORE_NEEDED, { loggedIn: false });
    await pass(500);

    expect(inDock().getByRole('button', { name: '+ 같이 한 명 더' })).toBeOnTheScreen();
    expect(inFrame().queryByText('관정도서관 로그인이 필요해요')).toBeNull();
  });
});

// The lowered card, from #655's pictures: the card shows the low step's lines of an answer's words, and the sentence
// takes them whole, so that the ticket under it never shows cut there. Partitions: logged in and out, which move the
// login line. Expected values: the low step's lines (`card-caps.ts`).
describe('The study answer together at the lowest step', () => {
  it.each([true, false])('shows its sentence alone in the low lines, logged in: %s', async (loggedIn) => {
    await askTogether({ server, library }, STUDY_GROUP_TO_SEND, { loggedIn });
    await pass(500);

    expect(screen.getByTestId('study-group-words')).toHaveStyle({ minHeight: LOW_LINES * text.bodyLg.lineHeight });
  });

  it('writes its sentence in the lines the low step counts', async () => {
    await askTogether({ server, library }, STUDY_GROUP_MORE_NEEDED, { loggedIn: false });
    await pass(500);

    expect(inFrame().getByText('그룹스터디룸은 네 명부터예요. 한 명만 더 부르면 돼요.')).toHaveStyle({
      lineHeight: text.bodyLg.lineHeight,
    });
  });
});
