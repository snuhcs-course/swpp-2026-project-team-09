/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { LIBRARY_ANSWER_RULES, LIBRARY_RULES } from '../src/assistant/library/library-rules.js';

// The text chat's 관정도서관 rules stay as they were before an app drew answers; the fixture is that text.
const TEXT_CHAT_RULES = readFileSync(new URL('fixtures/library/text-chat-rules.txt', import.meta.url), 'utf8');

describe('The 관정도서관 rules', () => {
  it('of the text chat are those of today, character for character', () => {
    expect(LIBRARY_RULES).toBe(TEXT_CHAT_RULES);
  });

  it('of an app that draws answers fill the first of several seat spaces and still ask among rooms', () => {
    expect(LIBRARY_ANSWER_RULES).not.toContain('When the words fit several bookable spaces, ask which one');
    expect(LIBRARY_ANSWER_RULES).toContain('When the words fit several bookable seat spaces');
    expect(LIBRARY_ANSWER_RULES).toContain('When the words fit several bookable rooms, ask which one');
  });
});
