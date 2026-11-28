/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { chatAssistant, type ChatAssistantServices } from '../src/assistant/chat/chat-assistant.js';
import { chatServicesWithoutData } from './chat-services.js';

// An answer offers no other meal or time than the one asked (P05 ticket 86). On 2026-11-28 "월요일 점심" was answered
// "월요일 점심은 걸어서 바로 갈 수 있는 301동식당을 추천해요. 저녁이면 '저녁'이라고 해 주세요.": a rule let the sentence
// of a later day's lunch end by offering dinner, and the model said it of a lunch the User had named. Such an offer
// belongs only to the question of a time that has passed, which the app asks itself (ticket 80). One rule for every kind
// of answer, in every app's instructions.

let SERVICES: ChatAssistantServices;

beforeAll(async () => {
  SERVICES = await chatServicesWithoutData();
});

const APPS = [
  ['an app that draws nothing', undefined],
  ['an app that draws every answer', { drawsAnswers: true, drawsEvents: true, drawsMeets: true, drawsStudy: true }],
] as const;

describe.each(APPS)('The instructions of %s', (_app, options) => {
  it('tell the model to offer no other meal or time than the one asked', () => {
    const { instructions } = chatAssistant(SERVICES, options);

    expect(instructions).toContain(
      'Never end an answer that answered the meal, day or time the User asked about by offering another one',
    );
  });

  // TaeHyun79's review of #774: the breakfast rule names the meals that are served, and a run that read the rule as
  // forbidding it would fail the eval case meal-breakfast-planned-none.
  it('let an answer say what is served when the meal asked for is not served at all, as for breakfast', () => {
    const { instructions } = chatAssistant(SERVICES, options);

    expect(instructions).toContain('saying what is instead is a fact, not an offer');
  });

  it('give no sentence that offers another meal', () => {
    const { instructions } = chatAssistant(SERVICES, options);

    expect(instructions).not.toContain('저녁이면');
    expect(instructions).not.toContain('저녁 plans dinner');
  });
});
