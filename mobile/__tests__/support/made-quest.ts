/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type userEvent, within } from '@testing-library/react-native';
import { PLAN_QUEST } from '@/api/mock/data/plan-quest';
import type { Quest } from '@/api/types';
import { keepTokens } from '@/auth/tokens';
import { pass, screen } from './app';
import type { FakeServer } from './fake-server';
import { socketServer } from './live';
import { accessTokenOf, DINNER } from './server';

// A Quest made from a Plan on the everyday map (P02 ticket 07), against the fake main server. The User is the stored
// answer's asker, 유상, who leads the stored reply's Quest of POST /plans: 302동식당 from 12:15, with 민수 invited.

export const MINSU = '35976b5c-4daf-454f-b10e-c8b09a33ca37';
export const MADE = PLAN_QUEST.quest;
// What its flag and its line say before 민수 answers.
export const FLAG = '12:15 점심 · 수락 0/1';
// Its own marker on the everyday map, which the flag takes the place of while the switch is on.
export const OWN_MARKER = '퀘스트 · 302동식당에서 점심';

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

// A press on the flag on the map, which the line above the input names the same.
export async function pressFlag(user: ReturnType<typeof userEvent.setup>, words: string): Promise<void> {
  await user.press(within(screen.getByTestId('main-map-touches')).getByRole('button', { name: words }));
}

// A signal of the socket server, and the time for the app to follow.
export async function signal(name: string, payload?: object): Promise<void> {
  await socketServer((socket) => {
    socket.send(name, payload);
  });
  await pass(500);
}
