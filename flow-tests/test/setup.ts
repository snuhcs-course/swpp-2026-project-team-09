// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { closeSockets } from './people.js';
import { emptyState } from './stack.js';

beforeEach(async () => {
  await emptyState();
});

afterEach(() => {
  closeSockets();
});
