/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { userEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import type * as PushDevice from '@/push/device';
import { keep, readKept } from '@/storage/kept';
import type * as SecureStoreFake from '../support/secure-store';
import type * as FakeSocketModule from '../support/fake-socket';
import type * as PushFake from '../support/push';
import { pass, screen } from '../support/app';
import type { FakeServer } from '../support/fake-server';
import { askForCards, inCard, pressIn, SEAT_CARD, startLibraryChat } from '../support/library-chat';
import { openMain } from '../support/main';
import { MY_HIKE } from '../support/party';
import { givePushPhone, PHONE_TOKEN, type PushPhone } from '../support/push';
import { LUNCH, makeProposal, REGISTER, ROOM_CARD, sendParty, startServerBuild } from '../support/push-moments';
import { MIN_JUN_HOLDER } from '../support/room';
import { signIn, signOut } from '../support/sign-out';

// The sheet that asks about push (board t17), shown once after the design's moments, against the fake main server:
// the real push wrapper over a mocked `expo-notifications`.

jest.mock('expo-location');
jest.mock('expo-image-picker');
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
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));
jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('../support/fake-socket'));
jest.mock('@/push/device', () => jest.requireActual<typeof PushDevice>('@/push/device'));
jest.mock('expo', () => jest.requireActual<typeof PushFake>('../support/push').expoModule);
jest.mock('expo-notifications', () => jest.requireActual<typeof PushFake>('../support/push').notificationsModule);

const QUESTION = '나설 시각을 휴대폰으로 알려 드릴까요?';

type User = ReturnType<typeof userEvent.setup>;

let server: FakeServer;
let phone: PushPhone;

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function sheetShown(): boolean {
  return screen.queryByRole('header', { name: QUESTION }) !== null;
}

function registered(): unknown[] {
  return server.received(REGISTER).map(({ body }) => body);
}

async function press(user: User, name: string): Promise<void> {
  await user.press(screen.getByRole('button', { name }));
  await pass(500);
}

async function startUndetermined(): Promise<void> {
  server = await startServerBuild();
  phone = givePushPhone({ permission: 'undetermined' });
}

describe('the sheet after the Party form', () => {
  beforeEach(startUndetermined);

  it('shows after sending a Party that invites a Friend, and stays on screen after the form leaves', async () => {
    const user = await openMain();

    await sendParty(user, [MIN_JUN_HOLDER.name]);

    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
    expect(screen.getByRole('header', { name: QUESTION })).toBeVisible();
    expect(screen.getByText('나설 시각, 초대, 예약, 관심만 보내요.')).toBeVisible();
    expect(screen.getByText('나중에를 고르면 알림 목록에만 남아요.')).toBeVisible();
    expect(phone.prompts()).toBe(0);
    expect(registered()).toEqual([]);
  });

  it('does not show after sending a Party without a Friend', async () => {
    const user = await openMain();

    await sendParty(user, []);

    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
    expect(sheetShown()).toBe(false);
  });

  it('does not show when every invitation was refused', async () => {
    server.on(`POST /quests/${MY_HIKE.id}/invitations`, { status: 409, body: { statusCode: 409, message: 'No' } });
    const user = await openMain();

    await sendParty(user, [MIN_JUN_HOLDER.name]);

    expect(sheetShown()).toBe(false);
  });
});

describe("the sheet's buttons", () => {
  beforeEach(startUndetermined);

  it('asks the phone on 알림 받기, then sends the token, and does not show again for the next Party', async () => {
    const user = await openMain();
    await sendParty(user, [MIN_JUN_HOLDER.name]);

    await press(user, '알림 받기');

    expect(phone.prompts()).toBe(1);
    expect(registered()).toEqual([{ token: PHONE_TOKEN }]);
    expect(sheetShown()).toBe(false);
    await sendParty(user, [MIN_JUN_HOLDER.name]);
    expect(sheetShown()).toBe(false);
  });

  it('sends nothing when the User refuses the prompt', async () => {
    phone = givePushPhone({ permission: 'undetermined', prompt: 'denied' });
    const user = await openMain();
    await sendParty(user, [MIN_JUN_HOLDER.name]);

    await press(user, '알림 받기');

    expect(phone.prompts()).toBe(1);
    expect(registered()).toEqual([]);
  });

  it('closes on 나중에 without the prompt, and never shows again on the phone, also after a sign-in', async () => {
    const user = await openMain();
    await sendParty(user, [MIN_JUN_HOLDER.name]);

    await press(user, '나중에');
    expect(sheetShown()).toBe(false);
    await signOut(user, server);
    await signIn(user, server);
    await sendParty(user, [MIN_JUN_HOLDER.name]);

    expect(server.received(`POST /quests/${MY_HIKE.id}/invitations`)).toHaveLength(2);
    expect(sheetShown()).toBe(false);
    expect(phone.prompts()).toBe(0);
  });
});

describe('the permission already answered', () => {
  beforeEach(startUndetermined);

  it.each(['denied', 'granted'] as const)('shows no sheet with the permission %s', async (permission) => {
    phone = givePushPhone({ permission });
    const user = await openMain();

    await sendParty(user, [MIN_JUN_HOLDER.name]);

    expect(sheetShown()).toBe(false);
    expect(phone.prompts()).toBe(0);
  });

  it('registers at once, without the sheet, when the permission came granted without a prompt', async () => {
    const user = await openMain();
    phone = givePushPhone({ permission: 'granted' });

    await sendParty(user, [MIN_JUN_HOLDER.name]);

    expect(sheetShown()).toBe(false);
    expect(registered()).toEqual([{ token: PHONE_TOKEN }]);
  });
});

describe('Android 13 and above', () => {
  beforeEach(startUndetermined);

  // Notifications start disabled there: a permission never asked is reported as denied that can be asked again.
  it('shows the sheet for a permission never asked, and 알림 받기 leads to the prompt and the registration', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    phone = givePushPhone({ permission: 'denied', canAskAgain: true });
    const user = await openMain();
    await sendParty(user, [MIN_JUN_HOLDER.name]);

    expect(screen.getByRole('header', { name: QUESTION })).toBeVisible();
    await press(user, '알림 받기');

    expect(phone.prompts()).toBe(1);
    expect(registered()).toEqual([{ token: PHONE_TOKEN }]);
  });
});

describe('the sheet after the Proposal card', () => {
  beforeEach(startUndetermined);

  it('shows after 만들기 on a Proposal that invites a Friend, and 알림 받기 asks and registers', async () => {
    const user = await makeProposal(server, LUNCH);

    expect(screen.queryByTestId('chat-sheet')).toBeNull();
    expect(screen.getByRole('header', { name: QUESTION })).toBeVisible();
    await press(user, '알림 받기');

    expect(phone.prompts()).toBe(1);
    expect(registered()).toEqual([{ token: PHONE_TOKEN }]);
  });

  it('does not show once the sheet was shown on the phone', async () => {
    await keep({ pushAsked: true });

    await makeProposal(server, LUNCH);

    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
    expect(sheetShown()).toBe(false);
  });

  it('does not show for a Proposal without a Friend', async () => {
    await makeProposal(server, { ...LUNCH, invitees: [] });

    expect(screen.getByRole('tab', { name: /^내 파티/u })).toBeSelected();
    expect(sheetShown()).toBe(false);
  });
});

describe('the sheet after a booking of the library', () => {
  let library: Awaited<ReturnType<typeof startLibraryChat>>;

  beforeEach(async () => {
    library = await startLibraryChat();
    ({ server } = library);
    server.on(REGISTER, { status: 204 });
    phone = givePushPhone({ permission: 'undetermined' });
  });

  it('shows once a seat is booked', async () => {
    await askForCards(library, [SEAT_CARD]);

    await pressIn(inCard(`library-book-${SEAT_CARD.library.key}`), '예약하기');
    await pass(500);

    expect(screen.getByText('7193번 예약되었어요!')).toBeVisible();
    expect(screen.getByRole('header', { name: QUESTION })).toBeVisible();
    expect(phone.prompts()).toBe(0);
  });

  it('shows once a room is booked', async () => {
    await askForCards(library, [ROOM_CARD]);
    const shown = inCard(`library-book-${ROOM_CARD.library.key}`);

    await pressIn(shown, '과제');
    await pressIn(shown, '예약하기');
    await pass(500);

    expect(screen.getByText('G412 예약되었어요!')).toBeVisible();
    expect(screen.getByRole('header', { name: QUESTION })).toBeVisible();
  });

  it('does not show when the booking is declined', async () => {
    await askForCards(library, [SEAT_CARD]);

    await pressIn(inCard(`library-book-${SEAT_CARD.library.key}`), '취소');
    await pass(500);

    expect(sheetShown()).toBe(false);
  });
});

describe('what the phone keeps', () => {
  it('reads an older value without pushAsked as false', async () => {
    const older = { signedIn: true, consented: true, onboardingCompleted: true, suggestion: null, answers: null };
    await AsyncStorage.setItem('snunow.kept', JSON.stringify(older));

    expect((await readKept()).pushAsked).toBe(false);
  });
});
