/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { runFeature } from '../src/assistant/adapter.js';
import { NO_CONTEXT } from '../src/assistant/dto/answer.dto.js';
import { defineTool, type Feature, type Request } from '../src/assistant/feature.js';
import { ScriptedModel } from './scripted-model.js';

// A tool call refused for its input leaves one log line (P05 ticket 84): on 2026-11-28 "7000원 이하" failed with no line
// to read, so the cause was guessed from the code. The line names the tool, each refused field with what it expected,
// and what was repaired, and never a value the model gave, which may hold the User's words. Partitions: repaired, not
// repaired.

const model = new ScriptedModel();
const LIMITS = { maxSteps: 3, timeoutMs: 5000, maxOutputTokens: 1000 };
const asker: Request = {
  userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  now: new Date('2026-11-28T10:00:00+09:00'),
  capabilities: ['answer'],
  context: NO_CONTEXT,
};

const FEATURE: Feature = {
  instructions: 'test',
  tools: {
    propose: defineTool({
      description: 'Proposes.',
      input: z.object({
        title: z.string(),
        capacity: z.number().int().optional(),
        placeId: z.uuid().optional(),
      }),
      run: () => Promise.resolve({ result: 'proposed' }),
    }),
  },
};

let warned: string[];

beforeEach(() => {
  warned = [];
  vi.spyOn(Logger.prototype, 'warn').mockImplementation((message: unknown) => {
    warned.push(String(message));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function called(input: object): Promise<string[]> {
  model.script({ tool: 'propose', input }, { text: '…' });
  await runFeature(model.model, FEATURE, asker, [{ role: 'user', text: '민수랑 보드게임 4명' }], LIMITS);
  return warned.filter((line) => line.startsWith("The model's propose call was refused"));
}

describe('A tool call refused for its input', () => {
  it('leaves a line with the tool, the field, what it expected, and the repair, and no value', async () => {
    const lines = await called({ title: '민수랑 보드게임', capacity: '4', placeId: null });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('capacity invalid_type (expected number)');
    expect(lines[0]).toContain('made again with null left out: placeId; read as a number: capacity');
    expect(lines[0]).not.toContain('민수');
    expect(lines[0]).not.toContain('"4"');
  });

  it('says it was not repaired when nothing in it can be read otherwise', async () => {
    const lines = await called({ title: '민수랑 보드게임', placeId: 'not an id' });

    expect(lines[0]).toContain('placeId invalid_format');
    expect(lines[0]).toContain('not made again');
    expect(lines[0]).not.toContain('not an id');
  });
});
