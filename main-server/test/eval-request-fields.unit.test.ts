/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { WORLD_REQUEST_FIELDS, WORLDS } from '../eval/cases.ts';
import { assistantMessagesSchema } from '../src/assistant/dto/assistant-messages.dto.js';

// What the eval runner sends beside a case's messages, by its world: P6's runs say the app can show 관정 booking, so
// that the library tools answer, and every other world's request is the same as before the field existed, so that
// P19's, P4's and P5's runs compare with their earlier ones. Reported apart from the product's pyramid (ADR 0007).

const messages = [{ role: 'user', text: '관정 3층 자리 하나 잡아 줘' }];

// The body as the runner's postAssistantMessages builds it.
function bodyOf(world: (typeof WORLDS)[number]): object {
  return { messages, ...WORLD_REQUEST_FIELDS[world] };
}

describe('the eval runner request fields', () => {
  it("sends clientCapabilities ['library'] in the P6 world, which the endpoint accepts", () => {
    const body = bodyOf('p6');

    expect(body).toEqual({ messages, clientCapabilities: ['library'] });
    expect(assistantMessagesSchema.parse(body).clientCapabilities).toEqual(['library']);
  });

  it.each(WORLDS.filter((world) => world !== 'p6'))('sends only the messages in the %s world', (world) => {
    expect(JSON.stringify(bodyOf(world))).toBe(JSON.stringify({ messages }));
  });
});
