import { closeSockets } from './people.js';
import { emptyState } from './stack.js';

beforeEach(async () => {
  await emptyState();
});

afterEach(() => {
  closeSockets();
});
