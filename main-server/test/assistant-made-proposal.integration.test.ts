/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { type QuestProposal } from '../src/assistant/proposal.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { postAssistantMessages } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// A Proposal the User made with 만들기 (P05 ticket 18): the app sends it back with the Quest's id, the model reads it as
// a 파티 already posted, and proposeQuest proposes no second 파티 for it, which 만들기 would make beside the first,
// unless the User asked for another. Nothing is stored: the made Quest's id stands for one.

let app: INestApplication<Server>;
let user: TestUser;
const model = new ScriptedModel();

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, model.model);
  // 2096-05-07 09:00 in Korea.
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockReturnValue(new Date('2096-05-07T00:00:00Z'));
  user = await signInUser(app);
});

afterAll(() => app.close());

const LUNCH: QuestProposal = {
  title: '2096 학식 같이 먹어요',
  description: '내일 점심 학식 같이 먹을 사람 모집해요',
  joinPolicy: 'open',
  board: 'meal',
  capacity: 4,
  startsAt: '2096-05-08T12:00:00+09:00',
  place: null,
  globalEvent: null,
  invitees: [],
};

const MADE_ID = '6b1d2a40-0000-4000-8000-000000000001';

const conversation = [
  { role: 'user', text: '내일 점심에 학식 같이 먹을 사람 4명 모집해줘, 식사 게시판에' },
  {
    role: 'assistant',
    text: '만들기를 누르면 파티가 만들어져요.',
    cards: [],
    proposal: { ...LUNCH, madeQuestId: MADE_ID },
  },
  { role: 'user', text: '방금 만든 파티 1시로 바꿔줘, 새로 만들지 말고' },
];

const atOne = { ...LUNCH, startsAt: '2096-05-08T13:00:00+09:00' };

describe('A Proposal sent back made', () => {
  it('is read by the model as made, with its Quest, and proposeQuest shows no new card for it', async () => {
    model.script({ tool: 'proposeQuest', input: atOne }, { text: '…' });

    const response = await postAssistantMessages(app, user.accessToken, conversation);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ proposal: null });
    expect(model.toolResults()).toEqual([{ result: 'made', questId: MADE_ID, reason: expect.any(String) as unknown }]);
    const said = JSON.stringify(model.received()[0]?.prompt.find(({ role }) => role === 'assistant'));
    expect(said).toContain('[Proposal made: ');
    expect(said).toContain(MADE_ID);
    expect(said).not.toContain('[Proposal shown: ');
  });

  it('is proposed again as another 파티 when the User asked for another', async () => {
    model.script({ tool: 'proposeQuest', input: { ...atOne, another: true } }, { text: '…' });

    const response = await postAssistantMessages(app, user.accessToken, conversation);

    expect(response.body).toMatchObject({ proposal: atOne });
  });
});
