/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { userEvent } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import type { GlobalEvent } from '@/api/types';
import type { FakeServer } from './fake-server';
import { screen } from './app';
import { BOOK_TALK, CAREER, MAJOR } from './events';
import { answerParty, MY_HIKE } from './party';
import { LOBBY } from './server';

// 파티 만들기 against the fake main server, with the camera and the album given. A test file that uses it mocks
// `expo-image-picker` with jest.fn()s, and what `server.ts` and `live.ts` say.

type User = ReturnType<typeof userEvent.setup>;

// A festival on Friday.
export const FESTIVAL: GlobalEvent = {
  id: 'e4',
  title: '가을 축제 개막 공연',
  description: '총학생회가 여는 축제의 첫 공연',
  startsAt: '2026-10-09T09:00:00.000Z',
  endsAt: null,
  place: '버들골 풍산마당',
  latitude: 37.4579,
  longitude: 126.9535,
  sourceUrl: null,
};

export const PHOTO_URI = 'file:///photos/run.jpg';

// The User's own tags, from the profile's hashtags.
export const MY_TAGS = ['러닝', '재즈'];

export function permission(granted: boolean): ImagePicker.PermissionResponse {
  return {
    granted,
    status: granted ? ImagePicker.PermissionStatus.GRANTED : ImagePicker.PermissionStatus.DENIED,
    canAskAgain: true,
    expires: 'never',
  };
}

const PICKED: ImagePicker.ImagePickerResult = { canceled: false, assets: [{ uri: PHOTO_URI, width: 1, height: 1 }] };

// The 파티 tab's answers, the four events, the User's tags and making MY_HIKE; the camera and the album allowed.
export function answerForm(server: FakeServer): void {
  answerParty(server);
  server.on('GET /global-events', { status: 200, body: [CAREER, MAJOR, BOOK_TALK, FESTIVAL] });
  server.on('GET /users/me/profile', { status: 200, body: { ...LOBBY.profile, hashtags: MY_TAGS } });
  server.on('POST /quests/own', { status: 201, body: MY_HIKE });
  server.on(`POST /quests/${MY_HIKE.id}/invitations`, { status: 204 });
  jest.mocked(ImagePicker.requestCameraPermissionsAsync).mockResolvedValue(permission(true));
  jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync).mockResolvedValue(permission(true));
  jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue(PICKED);
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue(PICKED);
}

export function submit(name: string): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name });
}

// A title, a description and a board: what 파티 올리기 waits for.
export async function fillPublic(user: User): Promise<void> {
  await user.type(screen.getByLabelText('제목'), '보드게임 카페 가실 분');
  await user.type(screen.getByLabelText('본문'), '룰 몰라도 알려드려요');
  await user.press(screen.getByRole('button', { name: '게시판 게시판 선택' }));
  await user.press(screen.getByRole('radio', { name: '취미 게시판' }));
}

// Presses a button again and again, each press after the one before.
export async function pressTimes(user: User, name: string, times: number): Promise<void> {
  for (let step = 0; step < times; step += 1) {
    // oxlint-disable-next-line no-await-in-loop -- each press changes what the next one may do
    await user.press(screen.getByRole('button', { name }));
  }
}
