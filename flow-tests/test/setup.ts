/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { closeSockets } from './people.js';
import { emptyState } from './stack.js';

beforeEach(async () => {
  await emptyState();
});

afterEach(() => {
  closeSockets();
});
