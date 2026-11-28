/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { runFeature } from '../src/assistant/adapter.js';
import { NO_CONTEXT } from '../src/assistant/dto/answer.dto.js';
import { defineTool, type Feature, type Request } from '../src/assistant/feature.js';
import { ScriptedModel } from './scripted-model.js';

// A tool's input with a null the model gave a field (P05 ticket 82): the model copies the conditions on screen as they
// are, an unset one as null, and a tool whose field takes no null refused the call each time it was made. Partitions: a
// null on a field that takes none, on one that takes null, and a value of the wrong type, which is still refused.

const model = new ScriptedModel();
const LIMITS = { maxSteps: 3, timeoutMs: 5000, maxOutputTokens: 1000 };
const asker: Request = {
  userId: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
  now: new Date(),
  capabilities: ['answer'],
  context: NO_CONTEXT,
};

const received: unknown[] = [];

const FEATURE: Feature = {
  instructions: 'test',
  tools: {
    plan: defineTool({
      description: 'Plans.',
      input: z.object({
        date: z.iso.date(),
        from: z.string().optional(),
        placeId: z.uuid().optional(),
        board: z.string().nullable().optional(),
      }),
      run: (input) => {
        received.push(input);
        return Promise.resolve({ result: 'planned' });
      },
    }),
  },
};

beforeEach(() => {
  received.length = 0;
});

async function called(input: object): Promise<unknown[]> {
  model.script({ tool: 'plan', input }, { text: '…' });
  await runFeature(model.model, FEATURE, asker, [{ role: 'user', text: '6천원 이하로' }], LIMITS);
  return received;
}

describe('A null the model gives a field', () => {
  it('is read as left out on a field that takes none', async () => {
    expect(await called({ date: '2026-11-30', from: null, placeId: null })).toEqual([{ date: '2026-11-30' }]);
  });

  it('stays on a field that takes null', async () => {
    expect(await called({ date: '2026-11-30', board: null })).toEqual([{ date: '2026-11-30', board: null }]);
  });

  it('leaves the rest of the input checked: a value of the wrong type is still refused', async () => {
    expect(await called({ date: '2026-11-30', from: null, placeId: 'not an id' })).toEqual([]);
    expect(JSON.stringify(model.toolResults())).toContain('placeId');
  });
});
