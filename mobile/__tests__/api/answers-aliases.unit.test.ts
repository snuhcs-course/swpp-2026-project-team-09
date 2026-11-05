/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The checks of the words read through an alias on the Assistant's reply, and of the list of the words the User
// taught it: valid answers, answers of a main server from before aliases, and each field left out or mistyped.

import { inList, inside, omit, type Variant, wrongFields } from '../support/answer-variants';
import { isTaughtAliases } from '@/api/server/alias-client';
import { isAssistantAnswer } from '@/api/server/assistant-client';

const READING = { kind: 'place', words: '학관', id: 'place-63', label: '학생회관', source: 'personal' };
const REPLY = {
  text: '이렇게 만들까요?',
  mapButtons: [],
  cards: [],
  proposal: null,
  choices: [],
  resolvedBy: [READING],
};

const ALIAS = {
  id: 'a1',
  kind: 'place',
  words: '중도',
  target: { id: 'place-62', label: '중앙도서관' },
  uses: 3,
  lastUsedAt: '2026-10-26T03:00:00.000Z',
};

describe('isAssistantAnswer, for the words read through an alias', () => {
  const accepted: Variant[] = [
    ['a reply with a reading', REPLY],
    ['a reply with none', { ...REPLY, resolvedBy: [] }],
    ['a reply of a main server from before aliases', omit(REPLY, 'resolvedBy')],
    ['a reading of a Friend by everyone', { ...REPLY, resolvedBy: [{ ...READING, kind: 'friend', source: 'global' }] }],
    ['a reading by a curated group', { ...REPLY, resolvedBy: [{ ...READING, source: 'curated' }] }],
  ];
  const refused: Variant[] = [
    ['resolvedBy null', { ...REPLY, resolvedBy: null }],
    ['resolvedBy not a list', { ...REPLY, resolvedBy: READING }],
    ...inside(
      REPLY,
      'resolvedBy',
      inList(
        READING,
        wrongFields(READING, { kind: ['quest', 1], words: [1], id: [1], label: [1], source: ['learned', 1] }),
      ),
    ),
  ];

  it.each(accepted)('%s → accepted', (_name, answer) => {
    expect(isAssistantAnswer(answer)).toBe(true);
  });
  it.each(refused)('%s → refused', (_name, answer) => {
    expect(isAssistantAnswer(answer)).toBe(false);
  });
});

describe('isTaughtAliases', () => {
  const accepted: Variant[] = [
    ['a list', { aliases: [ALIAS, { ...ALIAS, id: 'a2', kind: 'friend', target: { id: 'u1', label: '친구' } }] }],
    ['an empty list', { aliases: [] }],
  ];
  const refused: Variant[] = [
    ['no aliases', {}],
    ['aliases null', { aliases: null }],
    ['a bare list', [ALIAS]],
    ...inside(
      { aliases: [] },
      'aliases',
      inList(
        ALIAS,
        wrongFields(ALIAS, {
          id: [1],
          kind: ['quest'],
          words: [1],
          target: [{ id: 'place-62' }, { label: '중앙도서관' }, 'place-62'],
          uses: ['3'],
          lastUsedAt: [1],
        }),
      ),
    ),
  ];

  it.each(accepted)('%s → accepted', (_name, answer) => {
    expect(isTaughtAliases(answer)).toBe(true);
  });
  it.each(refused)('%s → refused', (_name, answer) => {
    expect(isTaughtAliases(answer)).toBe(false);
  });
});
