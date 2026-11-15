/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type userEvent, within } from '@testing-library/react-native';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { Quest, QuestMember } from '@/api/types';
import { keepTokens } from '@/auth/tokens';
import type { Kept } from '@/storage/kept';
import { pass, screen } from './app';
import type { FakeServer } from './fake-server';
import { socketServer } from './live';
import { MINSU } from './plan-invitation';
import { accessTokenOf, DINNER } from './server';

// A Quest made from a Plan on the everyday map (P02 ticket 07), against the fake main server. The User is the stored
// answer's asker, 유상, who leads the stored reply's Quest of POST /plans: 302동식당 on Tuesday 17 November from 12:15,
// with 민수 invited.

export const MADE = PLAN_QUEST.quest;
// Changed for 민수's acceptance: the stored Quest with 민수 accepted among its members, as the main server then holds it.
export const MADE_ACCEPTED: Quest = {
  ...MADE,
  members: MADE.members?.map((member): QuestMember =>
    member.user.id === MINSU ? { ...member, state: 'accepted' } : member,
  ),
};
// What its flag and its line say before 민수 answers, on the fake main server's day, 6 October.
export const FLAG = '11월 17일 (화) 12:15 점심 · 수락 0/1';
// Its own marker on the everyday map, which the flag takes the place of while the switch is on.
export const OWN_MARKER = '퀘스트 · 302동식당에서 점심';
// What the phone keeps once the Quest was made from a Plan on it, with the switch on.
export const KEPT_MADE: Partial<Kept> = { answerOnMap: true, madeQuests: [MADE.id] };

// Signs in as the asker of the stored answer, in place of the fake main server's own User.
export async function signInAsAsker(): Promise<void> {
  await keepTokens({ accessToken: accessTokenOf(MADE.leader?.id ?? ''), refreshToken: 'refresh-1' });
}

// The User's Quests: the dinner, which was not made from a Plan, and the made Quest.
export function answerMadeQuest(server: FakeServer, made: Quest = MADE): void {
  server.on('GET /quests', { status: 200, body: [DINNER, made] });
}

export function madeLine(): ReturnType<typeof screen.queryByTestId> {
  return screen.queryByTestId('made-quest-line');
}

export function madeCard(): ReturnType<typeof within> {
  return within(screen.getByTestId('made-quest-frame'));
}

// A press on a marker of the map: the flag, which the line above the input names the same, or another.
export async function pressMarker(user: ReturnType<typeof userEvent.setup>, words: string): Promise<void> {
  await user.press(within(screen.getByTestId('main-map-touches')).getByRole('button', { name: words }));
}

// A signal of the socket server, and the time for the app to follow.
export async function signal(name: string, payload?: object): Promise<void> {
  await socketServer((socket) => {
    socket.send(name, payload);
  });
  await pass(500);
}
