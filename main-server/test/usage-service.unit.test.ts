/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Logger } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { type Settings } from '../src/common/settings.js';
import { SHUTDOWN_TIMEOUT_MS, UsageService } from '../src/usage/usage.service.js';
import { type UsersService } from '../src/users/users.service.js';
import { PostHogStub, POSTHOG_TOKEN } from './usage.js';

// UsageService with a stand-in client and a stand-in account: no token makes no client; the consent is read for each
// event; a failure of the read or of PostHog is one warning without the token; the application's close flushes.

const USER = '3f2c1b7e-0000-4000-8000-000000000001';

function settingsWith(token: string): ConfigService<Settings, true> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a stand-in with the one method the service calls
  return { get: () => token } as unknown as ConfigService<Settings, true>;
}

// The account's consent as `usageMayBeSent` answers it, one answer for each read, and the Users it was read for.
function usersAnswering(...answers: (boolean | Error)[]): UsersService & { reads: string[] } {
  const reads: string[] = [];
  const users = {
    reads,
    usageMayBeSent: (id: string): Promise<boolean> => {
      reads.push(id);
      const answer = answers.shift() ?? true;
      return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    },
  };
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a stand-in with the one method the service calls
  return users as unknown as UsersService & { reads: string[] };
}

let posthog: PostHogStub;
let warned: string[];

beforeEach(() => {
  posthog = new PostHogStub();
  warned = [];
  vi.spyOn(Logger.prototype, 'warn').mockImplementation((line: unknown) => {
    warned.push(String(line));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Lets the service's read and send, which the caller does not wait for, run: a few turns of the microtask queue.
async function drained(turns = 10): Promise<void> {
  if (turns > 0) {
    await Promise.resolve();
    await drained(turns - 1);
  }
}

function withToken(users: UsersService = usersAnswering()): UsageService {
  return new UsageService(posthog.clients, settingsWith(POSTHOG_TOKEN), users);
}

describe('UsageService without a token', () => {
  it('makes no client, reads no account and sends nothing', async () => {
    const factory = vi.fn(posthog.clients);
    const users = usersAnswering(true);
    const service = new UsageService(factory, settingsWith(''), users);

    service.sent(USER, 'assistant_reply_completed', {});
    await drained();
    await service.onApplicationShutdown();

    expect(factory).not.toHaveBeenCalled();
    expect(users.reads).toEqual([]);
    expect(posthog.events).toEqual([]);
  });
});

describe('UsageService with a token', () => {
  it('sends the event with the User id as distinctId, its properties and source server, once the consent holds', async () => {
    const service = withToken(usersAnswering(true));

    service.sent(USER, 'party_join_completed', { how: 'joined_directly' });
    await drained();

    expect(posthog.tokens).toEqual([POSTHOG_TOKEN]);
    expect(posthog.events).toEqual([
      { distinctId: USER, event: 'party_join_completed', properties: { how: 'joined_directly', source: 'server' } },
    ]);
  });

  it('reads the consent again for each event: what the account says at the time decides', async () => {
    const users = usersAnswering(true, false, true);
    const service = withToken(users);

    service.sent(USER, 'party_creation_completed', { visibility: 'public' });
    await drained();
    service.sent(USER, 'party_creation_completed', { visibility: 'private' });
    await drained();
    service.sent(USER, 'party_creation_completed', { visibility: 'public' });
    await drained();

    expect(users.reads).toEqual([USER, USER, USER]);
    expect(posthog.events.map(({ properties }) => properties.visibility)).toEqual(['public', 'public']);
  });

  it("calls the client's shutdown when the application closes, with a limit of a few seconds", async () => {
    const service = withToken();

    await service.onApplicationShutdown();

    expect(posthog.shutdowns).toEqual([SHUTDOWN_TIMEOUT_MS]);
    expect(SHUTDOWN_TIMEOUT_MS).toBeLessThanOrEqual(5000);
  });
});

describe('UsageService failing', () => {
  it('drops the event when the consent cannot be read, with one warning that names the error type only', async () => {
    const service = withToken(usersAnswering(new Error(`connection to ${POSTHOG_TOKEN} refused`)));

    service.sent(USER, 'assistant_reply_completed', {});
    await drained();

    expect(posthog.events).toEqual([]);
    expect(warned).toEqual([
      `The usage event assistant_reply_completed of User ${USER} was dropped: its consent could not be read (Error)`,
    ]);
  });

  it.each([
    [
      'a capture that rejects',
      (error: Error): void => {
        posthog.throws(error);
      },
    ],
    [
      "a failure posthog-node reports through 'error'",
      (error: Error): void => {
        posthog.reports(error);
      },
    ],
  ])('logs %s once, naming the type and its cause, never the token or the message', async (_case, fail) => {
    const service = withToken(usersAnswering(true));
    const cause = new Error(`timed out for ${POSTHOG_TOKEN}`);
    cause.name = 'AbortError';
    const error = new Error(`Capture batch to ${POSTHOG_TOKEN} did not fully deliver`, { cause });
    error.name = 'CaptureError';
    fail(error);

    service.sent(USER, 'assistant_reply_completed', {});
    await drained();

    expect(warned).toEqual(['A usage event was not sent to PostHog: CaptureError (AbortError)']);
    expect(warned.join('\n')).not.toContain(POSTHOG_TOKEN);
  });
});
