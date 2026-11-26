/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { chatAssistant, type ChatAssistantServices } from '../src/assistant/chat/chat-assistant.js';
import { chatServicesWithoutData } from './chat-services.js';

// Choosing what or where to eat is planned on the map (P05 ticket 14). An app that draws answers was told, besides the
// meal rules, to ask the User's taste first and to answer a menu question with no Restaurant from getMenus, so "월요일에
// 밥 뭐 먹을까" was asked back in text. An app that does not draw answers keeps those rules. What the model then does
// is scored by the eval cases of eval/cases/meal-wishes.yaml.

let SERVICES: ChatAssistantServices;

beforeAll(async () => {
  SERVICES = await chatServicesWithoutData();
});

const TASTE_FIRST = 'To recommend a meal, first ask what the User feels like';

const drawingRules = (): string =>
  chatAssistant(SERVICES, { drawsAnswers: true, drawsEvents: true, drawsMeets: true, drawsArea: true }).instructions;

describe('The chat of an app that draws answers', () => {
  it("does not ask the User's taste before a meal, nor answer a menu question with no Restaurant from getMenus", () => {
    expect(drawingRules()).not.toContain(TASTE_FIRST);
    expect(drawingRules()).not.toContain('A question about menus that names no Restaurant');
    expect(drawingRules()).toContain('After an answer from getMenus, call showOnMap with dining');
  });

  it('plans a wish to choose what or where to eat, on any day, and keeps menus for a named Restaurant', () => {
    expect(drawingRules()).toContain('뭐 먹을까, 뭐 먹지, 밥 추천해 줘, 어디서 먹지, 먹을 만한 데), on any day');
    expect(drawingRules()).toContain(
      'do not ask back about the kind of food, about lunch or dinner, or about the time',
    );
    expect(drawingRules()).toContain('On a later day with no meal named, the plans are lunch');
    expect(drawingRules()).toContain(
      'Only a question about what a Restaurant the User names serves is a menu question',
    );
  });
});

// P05 ticket SKIPNUM: a Class the User says is cancelled is left out of the plan, which ticket 49's rule could only say
// it was not.
describe("A Class the User says is cancelled, in an app's chat that draws answers", () => {
  it("is left out through planMeal, and put back when they go after all; a Friend's never", () => {
    expect(drawingRules()).toContain(
      'call planMeal with skipClasses, each by its start (1시 수업 → 13:00) or its name',
    );
    expect(drawingRules()).toContain("When it answers result 'unknownClass', plan nothing: ask which");
    expect(drawingRules()).toContain('call planMeal with attendClasses');
    expect(drawingRules()).toContain("A Friend's Class is never left out");
    expect(drawingRules()).not.toContain('아직 반영하지 못해서');
  });
});

describe('The chat of an app that does not draw answers', () => {
  it("still asks the User's taste first, and shows the dining layer after any answer about menus", () => {
    const { instructions } = chatAssistant(SERVICES);

    expect(instructions).toContain(
      "Keep small talk short. To recommend a meal, first ask what the User feels like (한식, 일식, 양식, …), then recommend from that day's menus from getMenus.",
    );
    expect(instructions).toContain('After an answer about menus, call showOnMap with dining');
    expect(instructions).not.toContain('뭐 먹을까');
  });
});
