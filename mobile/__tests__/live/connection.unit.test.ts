/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as FakeSocketModule from '../support/fake-socket';
import { sockets } from '../support/fake-socket';
import { type LiveHandlers, openLiveConnection } from '@/live/connection';

jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('../support/fake-socket'));

function ignore(): void {
  // The connection's other events are not this test's.
}

function handlers(onSignal: LiveHandlers['onSignal']): LiveHandlers {
  return {
    accessToken: () => 'token',
    renew: () => Promise.resolve(true),
    onConnect: ignore,
    onSessionEnded: ignore,
    onPosition: ignore,
    onPositionRemoved: ignore,
    onShuttleVehicles: ignore,
    onSignal,
  };
}

beforeEach(() => {
  sockets.length = 0;
});

describe('a signal over the connection', () => {
  it('is passed on with its payload as it arrived', () => {
    const onSignal = jest.fn<undefined, [string, unknown]>();
    const close = openLiveConnection('ws://socket', handlers(onSignal));
    const payload = { questId: 'q1', userId: 'u1' };

    sockets[0]?.send('invitation-accepted', payload);

    expect(onSignal).toHaveBeenCalledWith('invitation-accepted', payload);
    close();
  });

  it('is passed on with no payload when it carries none', () => {
    const onSignal = jest.fn<undefined, [string, unknown]>();
    const close = openLiveConnection('ws://socket', handlers(onSignal));

    sockets[0]?.send('quests-changed');

    expect(onSignal).toHaveBeenCalledWith('quests-changed', undefined);
    close();
  });
});
