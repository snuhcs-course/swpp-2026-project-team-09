/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { answered, startFresh } from '../support/mocks';
import { mockClient } from '@/api/mock/client';
import type { OnboardingAnswers } from '@/api/types';
import { keep } from '@/storage/kept';

// The mocks of 내 정보 and 알림, which answer in Expo Go, on the web and in the screens' tests.

const LIBRARY = { latitude: 37.4594, longitude: 126.95199 };
const ANSWERS: OnboardingAnswers = {
  name: '홍길동',
  department: '컴퓨터공학부',
  admissionYear: 2022,
  hashtags: ['러닝'],
  courseLevel: 'undergraduate',
  gender: null,
};

beforeEach(async () => {
  jest.useFakeTimers();
  await startFresh();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the mock of what waits for the User', () => {
  it("lists the `Profile` frame's Friend Requests, an invitation and a Meetup, and no request to join", async () => {
    const requests = await answered(mockClient.listFriendRequests());
    const invitations = await answered(mockClient.listQuestInvitations());
    const meetups = await answered(mockClient.listMeetups());

    expect(requests.received.map(({ sender }) => sender.name)).toEqual(['한도경', '김하늘', '박서준']);
    expect(invitations.map(({ quest }) => [quest.leader.name, quest.title])).toEqual([['윤태오', '물리 실험 보고서']]);
    expect(meetups.received.map(({ proposer, title, state }) => [proposer.name, title, state])).toEqual([
      ['이서연', '학관 점심', 'proposed'],
    ]);
    expect(await answered(mockClient.listJoinRequests('q-ai'))).toEqual([]);
  });
});

describe('the mock of Location Sharing', () => {
  const ON_CAMPUS = { ...LIBRARY, accuracy: 10, measuredAt: '2026-10-01T04:37:00.000Z' };

  it('keeps the Master Switch, which starts off, and gives it with the Lobby', async () => {
    await keep({ onboardingCompleted: true, answers: ANSWERS });

    expect((await answered(mockClient.enterLobby())).masterSwitch).toBe(false);
    await answered(mockClient.setMasterSwitch(true));
    expect((await answered(mockClient.enterLobby())).masterSwitch).toBe(true);
  });

  it('refuses a position while the Master Switch is off, as the main server does', async () => {
    await expect(answered(mockClient.uploadPosition(ON_CAMPUS))).rejects.toMatchObject({
      status: 409,
      code: 'MASTER_SWITCH_OFF',
    });
  });

  it('keeps a position on campus and answers one off campus', async () => {
    await answered(mockClient.setMasterSwitch(true));

    expect(await answered(mockClient.uploadPosition(ON_CAMPUS))).toEqual({ offCampus: false });
    expect(await answered(mockClient.uploadPosition({ ...ON_CAMPUS, latitude: 37.5665, longitude: 126.978 }))).toEqual({
      offCampus: true,
    });
  });
});

describe('the mock of the profile', () => {
  it('changes the fields sent, which the next Lobby holds', async () => {
    await keep({ onboardingCompleted: true, answers: ANSWERS });

    const profile = await answered(mockClient.updateProfile({ name: '안진영', admissionYear: null }));

    expect(profile).toEqual({
      name: '안진영',
      department: '컴퓨터공학부',
      admissionYear: null,
      hashtags: ['러닝'],
      friendId: '7KX2M9QD',
    });
    expect((await answered(mockClient.enterLobby())).profile).toEqual(profile);
  });
});

describe('the mock of the timetable', () => {
  it("lists the `Profile` frame's four classes, each on a Place of the mock's list", async () => {
    const classes = await answered(mockClient.listClasses());
    const places = await answered(mockClient.listPlaces());

    expect(classes.map(({ courseName }) => courseName)).toEqual(['운영체제', '알고리즘', '확률통계', '자료구조']);
    const placeIds = new Set(places.map(({ id }) => id));
    expect(
      classes.flatMap(({ times }) => times).every(({ placeId }) => placeId !== null && placeIds.has(placeId)),
    ).toBe(true);
  });
});
