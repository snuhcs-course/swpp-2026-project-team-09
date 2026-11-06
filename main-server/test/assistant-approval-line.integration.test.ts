/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { z } from 'zod';
import { FIXED_SENTENCE } from '../src/assistant/adapter.js';
import { APPROVAL_LINE } from '../src/assistant/approval-line.js';
import { ask, postAssistantMessages } from './assistant.js';
import { signInUser, TestUser } from './friends.js';
import { refuseMatchServer } from './match-server.js';
import { ownQuest } from './quests.js';
import { ScriptedModel, type Step } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The Approval line (P12, CD-2), with the scripted model in the model's place: the sentence the server adds to a reply
// showing an Approval Quest that does not say how it is entered. The files share the database, so the Quests start on
// a day of 2084 no other file uses, and every search is of that day.

const DAY = '2084-06-12';

let app: INestApplication<Server>;
let reader: TestUser;
let approval: string;
let open: string;
const model = new ScriptedModel();

beforeAll(async () => {
  app = await startApp(inject('settings'), [], refuseKakao, refuseMatchServer, model.model);
  const leader = await signInUser(app);
  reader = await signInUser(app);
  const subQuest = { title: '모임', startsAt: new Date(`${DAY}T18:00:00+09:00`).toISOString() };
  approval = await ownQuest(app, leader, { joinPolicy: 'approval', subQuest });
  open = await ownQuest(app, leader, { joinPolicy: 'open', subQuest });
});

afterAll(async () => {
  await app.close();
});

// The model searches the day, shows `ids` and answers `text`; the reply's text, to the conversation `messages`.
async function replyText(ids: string[], text: string, messages = ask('같이 갈 파티 있어?')): Promise<string> {
  const steps: Step[] = [{ tool: 'searchRecruitingQuests', input: { from: DAY, to: DAY } }];
  if (ids.length > 0) {
    steps.push({ tool: 'showQuests', input: { ids } });
  }
  model.script(...steps, { text });
  const response = await postAssistantMessages(app, reader.accessToken, messages).expect(200);
  return z.object({ text: z.string() }).parse(response.body).text;
}

describe('A reply showing an Approval Quest', () => {
  it.each([
    ['none of the words', '이 파티 어때요?'],
    ['one of them', '참여 신청해 보세요.'],
  ])('holding %s gets the line once, after its text', async (_, text) => {
    const reply = await replyText([open, approval], text);

    expect(reply).toBe(`${text}\n\n${APPROVAL_LINE.korean}`);
  });

  it.each([
    ['승인 and 신청', '승인 후 참여라 신청을 보내야 해요.'],
    ['신청 and 수락', '참여 신청을 보내면 파티장이 수락해요.'],
  ])('holding %s gets no line', async (_, text) => {
    expect(await replyText([approval], text)).toBe(text);
  });

  it('gets the line in English when the last message has no Hangul', async () => {
    const reply = await replyText([approval], 'Here is one.', ask('any party to join?'));

    expect(reply).toBe(`Here is one.\n\n${APPROVAL_LINE.english}`);
  });

  it('keeps the Korean line when the last message holds only a time, after a Korean one', async () => {
    const reply = await replyText([approval], '이 파티 어때요?', [
      { role: 'user', text: '저녁에 같이 갈 파티 있어?' },
      { role: 'assistant', text: '몇 시쯤이요?', cards: [], proposal: null },
      { role: 'user', text: '18:00' },
    ]);

    expect(reply).toBe(`이 파티 어때요?\n\n${APPROVAL_LINE.korean}`);
  });

  it('gets the line after the fixed sentence when the model wrote no text', async () => {
    expect(await replyText([approval], '')).toBe(`${FIXED_SENTENCE}\n\n${APPROVAL_LINE.korean}`);
  });
});

describe('A reply showing no Approval Quest', () => {
  it('with only Open Quests gets no line', async () => {
    expect(await replyText([open], '이 파티 어때요?')).toBe('이 파티 어때요?');
  });

  it('with no cards gets no line', async () => {
    expect(await replyText([], '이 파티 어때요?')).toBe('이 파티 어때요?');
  });
});
