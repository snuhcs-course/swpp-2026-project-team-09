/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-09  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { within } from '@testing-library/react-native';
import type { Quest } from '@/api/types';
import { color } from '@/design-system';
import type * as SecureStoreFake from './support/secure-store';
import type * as FakeSocketModule from './support/fake-socket';
import type { FakeServer } from './support/fake-server';
import { sockets } from './support/fake-socket';
import { screen } from './support/app';
import { givePhone, ON_CAMPUS } from './support/main';
import { startFresh } from './support/mocks';
import { openAt } from './support/party';
import { answerRoom, HIS_PICNIC, openRoom, PICNIC } from './support/room';
import { askMainServer, PHONE_NOW } from './support/server';

// 일정's grey and orange against the fake main server (P06 ticket 19): a step is grey once cancelled, past its end or
// passed by a later step's start, and the first other one is orange. A Holder's mark of done is no part of it, the
// room has no ✓, and the time and place box and the 파티 form follow the orange step.

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

const [MEET] = PICNIC.subQuests;
// 18:10 in Korea: 피크닉 started at 18:00, so the meeting before it, which has no end, is behind.
const DURING_PICNIC = new Date('2026-10-06T09:10:00.000Z');
const HELP = [
  '일정을 추가·수정·삭제하면 다른 멤버에게 알림이 가요',
  '행사를 골라 만든 일정은 행사를 따라가서 고칠 수 없어요',
];

let server: FakeServer;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  sockets.length = 0;
  server = await askMainServer({ signedIn: true });
  answerRoom(server);
  givePhone({ permission: 'granted', position: ON_CAMPUS });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function steps(): ReturnType<typeof within>[] {
  return screen.getAllByTestId('plan-step').map((step) => within(step));
}

describe("일정's grey and orange", () => {
  it('keeps a step the User marked done orange, with no ✓, and its ? opens the help', async () => {
    const marked: Quest = {
      ...HIS_PICNIC,
      subQuests: HIS_PICNIC.subQuests.map((one) => (one.id === MEET?.id ? { ...one, done: true } : one)),
    };
    answerRoom(server, marked);
    const user = await openRoom(marked);

    const [first, second] = steps();
    expect(screen.getAllByTestId('plan-step')[0]).not.toHaveStyle({ opacity: 0.45 });
    expect(first?.getByText('오늘 17:40')).toHaveStyle({ color: color.party });
    expect(second?.getByText('오늘 18:00–20:00')).not.toHaveStyle({ color: color.party });
    expect(screen.queryByRole('button', { name: '완료로 표시' })).toBeNull();
    expect(screen.queryByRole('button', { name: '완료 취소' })).toBeNull();

    await user.press(screen.getByRole('button', { name: '일정 도움말' }));
    for (const line of HELP) {
      expect(screen.getByText(line)).toBeVisible();
    }
    // The lines the user took out on 2026-11-27.
    expect(screen.queryByText(/도보 시간과 도착 알림에 쓰여요$/u)).toBeNull();
    expect(screen.queryByText('내 파티 목록의 시간과 장소도 일정에서 가져와요')).toBeNull();
  });

  it('greys a step without an end once the next one starts, and the time and place box follows', async () => {
    jest.setSystemTime(DURING_PICNIC);
    answerRoom(server, HIS_PICNIC);
    await openRoom(HIS_PICNIC);

    const [first, second] = steps();
    expect(screen.getAllByTestId('plan-step')[0]).toHaveStyle({ opacity: 0.45 });
    expect(first?.getByText('오늘 17:40')).not.toHaveStyle({ color: color.party });
    expect(second?.getByText('오늘 18:00–20:00')).toHaveStyle({ color: color.party });
    expect(screen.getByText('오늘 18:00')).toBeVisible();
    // The greyed step keeps its own time; the box no longer says it.
    expect(screen.getAllByText('오늘 17:40')).toHaveLength(1);
  });

  it('has the 파티 form edit the orange step', async () => {
    jest.setSystemTime(DURING_PICNIC);

    await openAt(`/party-form?questId=${PICNIC.id}`);

    expect(screen.getByRole('header', { name: '모집글 수정' })).toBeVisible();
    expect(screen.getByText('오늘 18:00')).toBeVisible();
    expect(screen.queryByText('오늘 17:40')).toBeNull();
  });
});
