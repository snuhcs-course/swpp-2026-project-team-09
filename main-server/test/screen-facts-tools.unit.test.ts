/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { chatAssistant, type ChatAssistantServices } from '../src/assistant/chat/chat-assistant.js';
import { contextLines } from '../src/assistant/context-lines.js';
import { NO_CONTEXT, type PlanInput } from '../src/assistant/dto/answer.dto.js';
import { chatServicesWithoutData } from './chat-services.js';

// The [Plan on screen] line's own values, fed back to the planning tool of its kind (P05 ticket 83). The rules tell the
// model to call the tool again with the conditions on screen as they are; on 2026-11-28 the line wrote an unset
// condition as null, which planMeal's input refused (ticket 82). Each kind's conditions here leave every condition
// that can be unset unset, but for what its kind always holds: a meet's Friend, 파티's list, a new 파티's title.

const ASKER = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
const MINSU = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed';
const QUEST = '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b';
const people = [{ userId: ASKER, constraints: [] }];
// A meet is with a Friend at least.
const withMinsu = [...people, { userId: MINSU, constraints: [] }];

const UNSET: [string, PlanInput][] = [
  [
    'planMeal',
    { kind: 'meal', date: '2087-01-07', meal: 'lunch', people, window: { from: null, until: null }, placeId: null },
  ],
  [
    'planMeet',
    { kind: 'meet', date: '2087-01-07', people: withMinsu, window: { from: null, until: null }, placeId: null },
  ],
  [
    'planStudy',
    {
      kind: 'study',
      date: '2087-01-07',
      what: 'any',
      people,
      together: false,
      window: { from: null, until: null },
      area: null,
      minutes: null,
      chosen: { seatSpaceId: null, roomSpaceId: null },
    },
  ],
  ['planEvents', { kind: 'events', date: '2087-01-07', eventIds: null }],
  ['planQuests', { kind: 'quests', globalEventId: null, questIds: [QUEST] }],
  [
    'planNewQuest',
    {
      kind: 'new-quest',
      date: '2087-01-07',
      globalEventId: null,
      title: '보드게임',
      placeId: null,
      time: null,
      people,
    },
  ],
];

let SERVICES: ChatAssistantServices;

beforeAll(async () => {
  SERVICES = await chatServicesWithoutData();
});

// The facts of the line, as the model reads them.
function factsOf(conditions: PlanInput): { line: string; facts: unknown } {
  const [line = ''] = contextLines({ ...NO_CONTEXT, conditions });
  return { line, facts: JSON.parse(line.slice('[Plan on screen: '.length, -1)) };
}

describe("The [Plan on screen] line's values fed back to their planning tool", () => {
  it.each(UNSET)('%s takes them as they are', (name, conditions) => {
    const options = { drawsAnswers: true, drawsEvents: true, drawsMeets: true, drawsStudy: true };
    const tool = chatAssistant(SERVICES, options).tools[name];
    const { line, facts } = factsOf(conditions);

    expect(line).not.toContain('null');
    expect(tool?.input.safeParse(facts).success).toBe(true);
  });
});
