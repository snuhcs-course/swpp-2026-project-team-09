/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// Partitions of the answer of GET /assistant/suggestion: each action, no suggestion, and a suggestion with each
// checked field left out, null and of another type. Expected values: the P07 spec, ticket 04.

import { inside, omit, type Variant, wrongFields } from '../support/answer-variants';
import type { Guard } from '@/api/server/answers';
import { isChatSuggestion, isSuggestionAnswer } from '@/api/server/suggestion-client';

function checks<Answer>(guard: Guard<Answer>, accepted: readonly Variant[], refused: readonly Variant[]): void {
  it.each(accepted)('%s → accepted', (_, answer) => {
    expect(guard(answer)).toBe(true);
  });
  it.each(refused)('%s → refused', (_, answer) => {
    expect(guard(answer)).toBe(false);
  });
}

const PROPOSAL = {
  title: '민수랑 점심',
  description: '',
  joinPolicy: 'closed',
  board: null,
  capacity: 2,
  startsAt: '2026-10-06T12:15:00+09:00',
  place: null,
  globalEvent: null,
  invitees: [{ id: 'u1', name: '김민수' }],
};
const PROPOSING = { type: 'proposal', proposal: PROPOSAL };
const ROUTE = { type: 'route', placeId: 'p301', name: '제1공학관' };
const SUGGESTION = { id: 's1', text: '민수랑 점심 어때요?', reason: '공강 시작 · 민수도 공강', action: PROPOSING };

describe('isChatSuggestion', () => {
  checks(
    isChatSuggestion,
    [
      ['a Proposal to show', SUGGESTION],
      ['a route to a Place', { ...SUGGESTION, action: ROUTE }],
    ],
    [
      ...wrongFields(SUGGESTION, { id: [1], text: [1], reason: [1], action: ['proposal'] }),
      ...inside(SUGGESTION, 'action', [
        ['an action the app does not know', { type: 'shortcut', placeId: 'p301' }],
        ['no type', omit(PROPOSING, 'type')],
        ['a Proposal without its title', { type: 'proposal', proposal: omit(PROPOSAL, 'title') }],
        ['a Proposal of null', { type: 'proposal', proposal: null }],
        ...wrongFields(ROUTE, { placeId: [301], name: [1] }),
      ]),
    ],
  );
});

describe('isSuggestionAnswer', () => {
  checks(
    isSuggestionAnswer,
    [
      ['a suggestion', { suggestion: SUGGESTION }],
      ['none, null', { suggestion: null }],
    ],
    [
      ['no suggestion field', {}],
      ['a suggestion of another shape', { suggestion: omit(SUGGESTION, 'action') }],
      ['nothing, 204', null],
    ],
  );
});
