/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The check of the Assistant's reply for its candidates: a reply with them, one from a main server from before them,
// and each candidate field left out or mistyped.

import { inList, inside, omit, type Variant, wrongFields } from '../support/answer-variants';
import { isAssistantAnswer } from '@/api/server/assistant-client';

const CHOICE = { kind: 'place', id: 'place-63', label: '학생회관', words: '학관' };
const REPLY = {
  text: '어디를 말씀하신 건가요?',
  mapButtons: [],
  cards: [],
  proposal: null,
  choices: [CHOICE, { kind: 'friend', id: 'u1', label: '김민준', words: '민준' }],
};

const accepted: Variant[] = [
  ['a reply with candidates', REPLY],
  ['a reply with none', { ...REPLY, choices: [] }],
  ['a reply of a main server from before the candidates', omit(REPLY, 'choices')],
  ['a candidate that is a Global Event', { ...REPLY, choices: [{ ...CHOICE, kind: 'globalEvent' }] }],
];

const refused: Variant[] = [
  ['choices null', { ...REPLY, choices: null }],
  ['choices not a list', { ...REPLY, choices: CHOICE }],
  ...inside(
    REPLY,
    'choices',
    inList(CHOICE, wrongFields(CHOICE, { kind: ['quest', 1], id: [1], label: [1], words: [1] })),
  ),
];

describe('isAssistantAnswer', () => {
  it.each(accepted)('%s → accepted', (_name, answer) => {
    expect(isAssistantAnswer(answer)).toBe(true);
  });
  it.each(refused)('%s → refused', (_name, answer) => {
    expect(isAssistantAnswer(answer)).toBe(false);
  });
});
