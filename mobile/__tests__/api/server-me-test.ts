// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import type * as SecureStoreFake from '../support/secure-store';
import { refusal } from '../support/fake-server';
import { startFresh } from '../support/mocks';
import {
  askMainServer,
  DINNER_PARTY,
  FRIEND_REQUESTS,
  INVITATION,
  JOIN_REQUESTS,
  LOBBY,
  MEETUPS,
  PHONE_NOW,
  STUDY,
  TOKENS,
} from '../support/server';
import { apiClient } from '@/api/client';
import type { Place, TimetableClass } from '@/api/types';
import { googleAvailable } from '@/auth/google';

// The operations of 내 정보 and 알림 against the main server: the profile, the Master Switch, the User's position,
// the timetable, the Places, and the lists of what waits for the User.

jest.mock('@/auth/google', () => ({
  googleAvailable: jest.fn<boolean, []>(),
  askGoogle: jest.fn(),
  forgetGoogle: jest.fn(),
}));
jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('../support/secure-store'));

const BEARER = `Bearer ${TOKENS.accessToken}`;

beforeEach(async () => {
  jest.useFakeTimers({ now: PHONE_NOW });
  await startFresh();
  jest.mocked(googleAvailable).mockReset().mockReturnValue(false);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('the Lobby and the profile', () => {
  it("gives the Lobby with the User's Friend ID and Master Switch", async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /lobby', { status: 200, body: { ...LOBBY, masterSwitch: true } });

    const lobby = await apiClient.enterLobby();

    expect(lobby.masterSwitch).toBe(true);
    expect(lobby.profile.friendId).toBe('7KX2M9QD');
  });

  it('fails a Lobby without the Master Switch, as an answer of another shape', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /lobby', { status: 200, body: { profile: LOBBY.profile } });

    await expect(apiClient.enterLobby()).rejects.toMatchObject({ status: 0, code: 'UNEXPECTED_ANSWER' });
  });

  it('sends only the changed fields of the profile, and gives the whole profile back', async () => {
    const server = await askMainServer({ signedIn: true });
    const changed = { ...LOBBY.profile, name: '홍길순', admissionYear: null };
    server.on('PATCH /users/me/profile', { status: 200, body: changed });

    const profile = await apiClient.updateProfile({ name: '홍길순', admissionYear: null });

    expect(profile).toEqual(changed);
    expect(server.received('PATCH /users/me/profile')).toEqual([
      {
        method: 'PATCH',
        path: '/users/me/profile',
        query: {},
        authorization: BEARER,
        body: { name: '홍길순', admissionYear: null },
      },
    ]);
  });
});

describe('Location Sharing', () => {
  it('turns the Master Switch on and off', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('PUT /users/me/master-switch', { status: 204 });

    await apiClient.setMasterSwitch(true);
    await apiClient.setMasterSwitch(false);

    expect(server.received('PUT /users/me/master-switch').map(({ body }) => body)).toEqual([
      { on: true },
      { on: false },
    ]);
  });

  it("uploads the User's position and gives whether it was off campus", async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /positions', { status: 200, body: { offCampus: true } });
    const position = { latitude: 37.5665, longitude: 126.978, accuracy: 12, measuredAt: '2026-10-06T03:59:58.000Z' };

    expect(await apiClient.uploadPosition(position)).toEqual({ offCampus: true });
    expect(server.received('POST /positions')[0]?.body).toEqual(position);
  });

  it('throws the refusal of a position while the Master Switch is off', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('POST /positions', refusal(409, 'MASTER_SWITCH_OFF'));

    await expect(
      apiClient.uploadPosition({
        latitude: 37.46,
        longitude: 126.95,
        accuracy: 10,
        measuredAt: PHONE_NOW.toISOString(),
      }),
    ).rejects.toMatchObject({ status: 409, code: 'MASTER_SWITCH_OFF' });
  });
});

describe('the timetable and the Places', () => {
  it('gives the classes with their times', async () => {
    const server = await askMainServer({ signedIn: true });
    const classes: TimetableClass[] = [
      {
        id: 'c1',
        courseName: '컴파일러',
        times: [
          {
            id: 't1',
            weekday: 'monday',
            startTime: '10:00',
            endTime: '11:15',
            placeId: 'p301',
            room: '101호',
          },
          { id: 't2', weekday: 'wednesday', startTime: '13:00', endTime: '14:15', placeId: null, room: null },
        ],
        overlaps: [{ id: 'c2', courseName: '데이터베이스' }],
      },
    ];
    server.on('GET /timetable/classes', { status: 200, body: classes });

    expect(await apiClient.listClasses()).toEqual(classes);
  });

  it('gives the Places, with and without a number', async () => {
    const server = await askMainServer({ signedIn: true });
    const places: Place[] = [
      { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 },
      { id: 'pj', number: null, name: '자하연', latitude: 37.4607, longitude: 126.9521 },
    ];
    server.on('GET /places', { status: 200, body: places });

    expect(await apiClient.listPlaces()).toEqual(places);
  });
});

describe('what waits for the User', () => {
  it('gives the Friend Requests', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /friend-requests', { status: 200, body: FRIEND_REQUESTS });

    expect(await apiClient.listFriendRequests()).toEqual(FRIEND_REQUESTS);
  });

  it('gives the Quest invitations', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /quest-invitations', { status: 200, body: [INVITATION] });

    expect(await apiClient.listQuestInvitations()).toEqual([INVITATION]);
  });

  it('gives the Meetups', async () => {
    const server = await askMainServer({ signedIn: true });
    server.on('GET /meetups', { status: 200, body: MEETUPS });

    expect(await apiClient.listMeetups()).toEqual(MEETUPS);
  });

  it("gives the requests to join one of the User's Quests", async () => {
    const server = await askMainServer({ signedIn: true });
    server.on(`GET /quests/${STUDY.id}/join-requests`, { status: 200, body: JOIN_REQUESTS });

    expect(await apiClient.listJoinRequests(STUDY.id)).toEqual(JOIN_REQUESTS);
  });

  it("gives the Quests with their Leader, capacity and Join Policy, and a Party's Leader where it is told", async () => {
    const server = await askMainServer({ signedIn: true });
    const { leader: _leader, ...withoutLeader } = DINNER_PARTY;
    server.on('GET /quests', { status: 200, body: [STUDY] });
    server.on('GET /parties', { status: 200, body: [DINNER_PARTY, withoutLeader] });

    expect(await apiClient.listQuests()).toEqual([STUDY]);
    expect(await apiClient.listParties()).toEqual([DINNER_PARTY, withoutLeader]);
  });
});
