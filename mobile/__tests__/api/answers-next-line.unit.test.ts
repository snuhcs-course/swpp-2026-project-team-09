/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { omit, type Variant } from '../support/answer-variants';
import { isAssistantAnswer } from '@/api/server/assistant-client';

// What the app takes as a reply's next line: a line, none, a main server from before next lines, and each field left
// out or mistyped.

const LINE = {
  id: 'n1',
  text: '이 행사 같이 갈 사람 모집해줘',
  chosen: { kind: 'globalEvent', id: 'e1', words: '이 행사' },
};
const REPLY = {
  text: '행사가 있어요.',
  mapButtons: [],
  cards: [],
  proposal: null,
  choices: [],
  resolvedBy: [],
  nextLine: LINE,
};

describe('isAssistantAnswer, for the next line', () => {
  const accepted: Variant[] = [
    ['a line with a candidate', REPLY],
    ['a line with none', { ...REPLY, nextLine: { ...LINE, chosen: null } }],
    ['no line', { ...REPLY, nextLine: null }],
    ['a main server from before next lines', omit(REPLY, 'nextLine')],
  ];
  const refused: Variant[] = [
    ['a line that is no object', { ...REPLY, nextLine: 'line' }],
    ['a line with no text', { ...REPLY, nextLine: omit(LINE, 'text') }],
    ['a line with no id', { ...REPLY, nextLine: omit(LINE, 'id') }],
    ['a candidate of another kind', { ...REPLY, nextLine: { ...LINE, chosen: { ...LINE.chosen, kind: 'quest' } } }],
    ['a candidate with no words', { ...REPLY, nextLine: { ...LINE, chosen: omit(LINE.chosen, 'words') } }],
  ];

  it.each(accepted)('%s → accepted', (_name, answer) => {
    expect(isAssistantAnswer(answer)).toBe(true);
  });
  it.each(refused)('%s → refused', (_name, answer) => {
    expect(isAssistantAnswer(answer)).toBe(false);
  });
});
