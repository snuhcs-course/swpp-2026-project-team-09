/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { Choice } from '@/api/assistant-types';
import { type ChatBubble, messagesToSend } from '@/features/assistant/use-chat';

// What a request sends of the conversation, for the candidates a chip chose.

const STUDENT_UNION: Choice = { kind: 'place', id: 'place-63', label: '학생회관', words: '학관' };
const DORMITORY: Choice = { kind: 'place', id: 'place-919', label: '(관악사)학부 생활관', words: '학관' };

let nextId = 0;

function bubble(role: ChatBubble['role'], text: string, more: Partial<ChatBubble> = {}): ChatBubble {
  nextId += 1;
  return {
    id: nextId,
    role,
    text,
    cards: [],
    mapButtons: [],
    proposal: null,
    choices: [],
    chosen: null,
    failure: null,
    ...more,
  };
}

const ASKING = bubble('assistant', '어디를 말씀하신 건가요?', { choices: [STUDENT_UNION, DORMITORY] });
const CHOSEN = bubble('user', '학생회관', { chosen: { kind: 'place', id: 'place-63', words: '학관' } });

describe('messagesToSend', () => {
  it('sends the candidate a chip chose with its message, and none with the others', () => {
    const messages = messagesToSend([bubble('user', '학관에서 점심'), ASKING, CHOSEN]);

    expect(messages).toEqual([
      { role: 'user', text: '학관에서 점심' },
      { role: 'assistant', text: '어디를 말씀하신 건가요?', cards: [] },
      { role: 'user', text: '학생회관', chosen: { kind: 'place', id: 'place-63', words: '학관' } },
    ]);
  });

  it('keeps the candidate on its message as the conversation goes on', () => {
    const messages = messagesToSend([
      bubble('user', '학관에서 점심'),
      ASKING,
      CHOSEN,
      bubble('assistant', '이렇게 만들까요?'),
      bubble('user', '4명으로'),
    ]);

    expect(messages.filter((message) => message.role === 'user')).toEqual([
      { role: 'user', text: '학관에서 점심' },
      { role: 'user', text: '학생회관', chosen: { kind: 'place', id: 'place-63', words: '학관' } },
      { role: 'user', text: '4명으로' },
    ]);
  });
});
