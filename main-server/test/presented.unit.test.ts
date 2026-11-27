/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerReply, type Lookup } from '../src/assistant/dto/answer.dto.js';
import { type Presented } from '../src/assistant/feature.js';
import { clearDrawn, presentAnswer, presentLookup, reviseAnswer, withdrawAnswer } from '../src/assistant/presented.js';

// What a reply draws on the map changes only through these helpers (P05 ticket 72): an answer takes the map from a
// Lookup and the layer buttons, a Lookup from an answer, and a withdrawn answer also takes the plan on screen off it.

const answer = (date: string): AnswerReply => ({
  input: { kind: 'events', date, eventIds: null },
  chips: [],
  plans: [],
  dropped: [],
  noPlan: null,
});

const lookup: Lookup = {
  kind: 'day',
  chips: [],
  lines: [],
  basis: [],
  scene: { people: [], places: [], routes: [], flags: [] },
  band: null,
  actions: [],
};

const fresh = (): Presented => ({
  mapButtons: ['dining'],
  cards: [],
  proposal: null,
  answer: null,
  lookup: null,
  refusal: null,
});

describe('What a reply draws', () => {
  it('an answer replaces a Lookup and the layer buttons', () => {
    const presented = { ...fresh(), lookup };
    presentAnswer(presented, answer('2026-11-27'));
    expect(presented).toMatchObject({ answer: answer('2026-11-27'), lookup: null, mapButtons: [] });
  });

  it('a Lookup replaces an answer and the layer buttons, unless it keeps the buttons', () => {
    const presented = { ...fresh(), answer: answer('2026-11-27') };
    presentLookup(presented, lookup, { keepsButtons: true });
    expect(presented).toMatchObject({ answer: null, lookup, mapButtons: ['dining'] });
    presentLookup(presented, lookup);
    expect(presented.mapButtons).toEqual([]);
  });

  it('a withdrawn answer clears the plan on screen; clearing leaves it', () => {
    const withdrawn = { ...fresh(), answer: answer('2026-11-27') };
    withdrawAnswer(withdrawn);
    expect(withdrawn).toMatchObject({ answer: null, lookup: null, mapButtons: [], clears: true });
    const cleared = { ...fresh(), lookup };
    clearDrawn(cleared);
    expect(cleared).toMatchObject({ answer: null, lookup: null, mapButtons: [] });
    expect(cleared.clears).toBeUndefined();
  });

  it('a revision changes only an answer drawn', () => {
    const none = fresh();
    reviseAnswer(none, () => answer('2026-11-28'));
    expect(none.answer).toBeNull();
    const drawn = { ...fresh(), answer: answer('2026-11-27') };
    reviseAnswer(drawn, () => answer('2026-11-28'));
    expect(drawn.answer).toEqual(answer('2026-11-28'));
  });
});
