/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import { Share } from 'react-native';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { pass, screen } from './support/app';
import {
  answerFirstRun,
  cardsShown,
  finishOnboarding,
  FRIEND,
  type Held,
  HINT,
  INTERESTS,
  later,
  OPERATING_SYSTEMS,
  type User,
} from './support/first-run';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { answerMainScreen, askMainServer, PHONE_NOW } from './support/server';

// The answers to the first run's three cards against the fake main server (P05 ticket 09): a Class added on 시간표,
// the chosen chips kept as watched interests, an Invite Link through the share sheet, and the line over the input
// that opens the interests card again.

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

const LINK = 'https://snunow.example/invite/k3J9xQ';

let server: FakeServer;
let held: Held;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerMainScreen(server);
  held = answerFirstRun(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function choose(user: User, select: string, choice: string): Promise<void> {
  await user.press(screen.getByRole('combobox', { name: select }));
  await user.press(screen.getByRole('button', { name: choice }));
}

describe('the Timetable card', () => {
  it('is answered by a Class added on 시간표', async () => {
    server.on('POST /timetable/classes', () => {
      held.classes = [OPERATING_SYSTEMS];
      return { status: 201, body: OPERATING_SYSTEMS };
    });
    const user = await finishOnboarding();

    await user.press(screen.getByRole('button', { name: '시간표 넣기' }));
    await pass(500);
    await user.press(screen.getByRole('button', { name: '수업 추가' }));
    await pass(500);
    await user.type(screen.getByLabelText('과목명'), '운영체제');
    await user.press(screen.getByRole('togglebutton', { name: '토' }));
    await choose(user, '시작 시각 · 시', '13');
    await choose(user, '종료 시각 · 시', '14');
    await user.press(screen.getByRole('button', { name: '저장' }));
    await pass(500);
    await user.press(screen.getByRole('button', { name: '뒤로' }));
    await pass(500);

    expect(server.received('POST /timetable/classes')).toHaveLength(1);
    expect(cardsShown()).toEqual([INTERESTS]);
  });
});

describe('the interests card', () => {
  it('keeps the chosen chips through the interests route, and passes on', async () => {
    const user = await finishOnboarding();
    await later(user);
    expect(screen.getByRole('button', { name: '맡기기' })).toBeDisabled();

    await user.press(screen.getByRole('button', { name: '채용' }));
    await user.press(screen.getByRole('button', { name: '스터디' }));
    await user.press(screen.getByRole('button', { name: '2개 맡기기' }));
    await pass(500);

    expect(server.received('POST /interests').map(({ body }) => body)).toEqual([
      { words: '채용' },
      { words: '스터디' },
    ]);
    expect(cardsShown()).toEqual([FRIEND]);
    await later(user);
    expect(screen.queryByRole('button', { name: HINT })).toBeNull();
  });

  it('stays and says so when a chip is not kept', async () => {
    server.on('POST /interests', 'no-answer');
    const user = await finishOnboarding();
    await later(user);

    await user.press(screen.getByRole('button', { name: '채용' }));
    await user.press(screen.getByRole('button', { name: '1개 맡기기' }));
    await pass(500);

    expect(screen.getByText('관심을 맡기지 못했어요')).toBeVisible();
    expect(cardsShown()).toEqual([INTERESTS]);
  });
});

describe('the line over the input', () => {
  it('opens the interests card again for a User with no interest, and goes once one is kept', async () => {
    const user = await finishOnboarding();
    await later(user);
    await later(user);
    await later(user);

    await user.press(screen.getByRole('button', { name: HINT }));
    await pass(500);
    expect(cardsShown()).toEqual([INTERESTS]);
    expect(screen.queryByRole('button', { name: HINT })).toBeNull();

    await user.press(screen.getByRole('button', { name: '러닝' }));
    await user.press(screen.getByRole('button', { name: '1개 맡기기' }));
    await pass(500);

    expect(server.received('POST /interests').map(({ body }) => body)).toEqual([{ words: '러닝' }]);
    expect(cardsShown()).toEqual([]);
    expect(screen.queryByRole('button', { name: HINT })).toBeNull();
  });
});

describe('the Friend card', () => {
  it('makes an Invite Link and opens the share sheet, as 친구 추가 does', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    server.on('POST /invite-links', { status: 201, body: { url: LINK, expiresAt: '2026-10-07T04:00:00.000Z' } });
    const user = await finishOnboarding();
    await later(user);
    await later(user);

    await user.press(screen.getByRole('button', { name: '초대 링크 보내기' }));
    await pass(500);

    expect(server.received('POST /invite-links')).toHaveLength(1);
    expect(share).toHaveBeenCalledWith({ message: `SNU Now에서 친구 해요! ${LINK}` });
    expect(cardsShown()).toEqual([]);
  });

  it('stays and says so when the Invite Link cannot be made', async () => {
    const share = jest.spyOn(Share, 'share');
    server.on('POST /invite-links', 'no-answer');
    const user = await finishOnboarding();
    await later(user);
    await later(user);

    await user.press(screen.getByRole('button', { name: '초대 링크 보내기' }));
    await pass(500);

    expect(share).not.toHaveBeenCalled();
    expect(screen.getByText('초대 링크를 만들지 못했어요')).toBeVisible();
    expect(cardsShown()).toEqual([FRIEND]);
  });
});
