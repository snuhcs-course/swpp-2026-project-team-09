/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { userEvent } from '@testing-library/react-native';
import type { ListedGlobalEvent } from '@/api/types';
import type { FakeServer } from './fake-server';
import { screen } from './app';
import { BOOK_TALK, CAREER, MAJOR } from './events';
import { answerParty, MY_HIKE } from './party';

// 파티 만들기 against the fake main server. A test file that uses it mocks what `server.ts` and `live.ts` say.

type User = ReturnType<typeof userEvent.setup>;

// A festival on Friday.
export const FESTIVAL: ListedGlobalEvent = {
  id: 'e4',
  title: '가을 축제 개막 공연',
  description: '총학생회가 여는 축제의 첫 공연',
  startsAt: '2026-10-09T09:00:00.000Z',
  endsAt: null,
  place: '버들골 풍산마당',
  latitude: 37.4579,
  longitude: 126.9535,
  sourceUrl: null,
  publishedAt: null,
  favorite: false,
};

// The 파티 tab's answers, the four events and making MY_HIKE.
export function answerForm(server: FakeServer): void {
  answerParty(server);
  server.on('GET /global-events', { status: 200, body: [CAREER, MAJOR, BOOK_TALK, FESTIVAL] });
  server.on('POST /quests/own', { status: 201, body: MY_HIKE });
  server.on(`POST /quests/${MY_HIKE.id}/invitations`, { status: 204 });
}

export function submit(name: string): ReturnType<typeof screen.getByRole> {
  return screen.getByRole('button', { name });
}

// A title, a description and a board: what 파티 올리기 waits for.
export async function fillPublic(user: User): Promise<void> {
  await user.type(screen.getByLabelText('제목'), '보드게임 카페 가실 분');
  await user.type(screen.getByLabelText('본문'), '룰 몰라도 알려드려요');
  await user.press(screen.getByRole('radio', { name: '취미 게시판' }));
}

// 친구 초대's sheet: the Friends checked, then its button.
export async function invite(user: User, names: readonly string[]): Promise<void> {
  await user.press(screen.getByRole('button', { name: /^친구 초대 /u }));
  for (const name of names) {
    // oxlint-disable-next-line no-await-in-loop -- each press checks one more Friend
    await user.press(screen.getByRole('checkbox', { name }));
  }
  await user.press(
    screen.getByRole('button', { name: names.length === 0 ? '완료' : `${String(names.length)}명 초대` }),
  );
}

// Presses a button again and again, each press after the one before.
export async function pressTimes(user: User, name: string, times: number): Promise<void> {
  for (let step = 0; step < times; step += 1) {
    // oxlint-disable-next-line no-await-in-loop -- each press changes what the next one may do
    await user.press(screen.getByRole('button', { name }));
  }
}
