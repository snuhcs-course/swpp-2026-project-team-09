import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { SignalWatcher } from './friends.js';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;
let watcher: SignalWatcher;

beforeAll(async () => {
  [app, watcher] = await Promise.all([startApp(settings), SignalWatcher.start()]);
});

afterAll(async () => {
  await watcher.stop();
  await app.close();
});

// What a feature module calls. Imported after startApp, so that it is the same class AppModule registers.
async function signals(): Promise<import('../src/common/signals.service.js').SignalsService> {
  const { SignalsService } = await import('../src/common/signals.service.js');
  return app.get(SignalsService);
}

describe('A signal', () => {
  it('goes on Redis as one event with the Users it names, its name and what it carries', async () => {
    const userIds = [randomUUID(), randomUUID()];
    const name = `test-${randomUUID()}`;

    (await signals()).send(userIds, name, { carried: 1 });

    await vi.waitFor(() => {
      expect(watcher.all()).toContainEqual({ userIds, name, payload: { carried: 1 } });
    });
  });

  it('for every connection names no Users', async () => {
    const name = `test-${randomUUID()}`;

    (await signals()).send('everyone', name);

    await vi.waitFor(() => {
      expect(watcher.all().filter((signal) => signal.name === name)).toEqual([{ name }]);
    });
  });

  it('for no User is not sent', async () => {
    const name = `test-${randomUUID()}`;
    const last = `test-${randomUUID()}`;

    (await signals()).send([], name);
    (await signals()).send('everyone', last);

    await vi.waitFor(() => {
      expect(watcher.all().map((signal) => signal.name)).toContain(last);
    });
    expect(watcher.all().map((signal) => signal.name)).not.toContain(name);
  });
});
