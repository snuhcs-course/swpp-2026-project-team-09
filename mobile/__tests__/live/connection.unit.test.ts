/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type * as FakeSocketModule from '../support/fake-socket';
import { sockets } from '../support/fake-socket';
import type { Position } from '@/api/types';
import { type LiveHandlers, openLiveConnection } from '@/live/connection';

jest.mock('socket.io-client', () => jest.requireActual<typeof FakeSocketModule>('../support/fake-socket'));

function ignore(): void {
  // The connection's other events are not this test's.
}

function handlers(onSignal: LiveHandlers['onSignal'], onPosition: LiveHandlers['onPosition'] = ignore): LiveHandlers {
  return {
    accessToken: () => 'token',
    renew: () => Promise.resolve(true),
    onConnect: ignore,
    onSessionEnded: ignore,
    onPosition,
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

const POSITION = { userId: 'u1', latitude: 37.4598, longitude: 126.9519, measuredAt: '2026-11-15T14:03:27+09:00' };

// The handler given the `position` signal with this payload.
function received(payload: object): jest.Mock<undefined, [Position]> {
  const onPosition = jest.fn<undefined, [Position]>();
  const close = openLiveConnection('ws://socket', handlers(ignore, onPosition));
  sockets[0]?.send('position', payload);
  close();
  return onPosition;
}

describe('a position over the connection', () => {
  it('passes on the level and the Place it carries', () => {
    const atBuilding = { ...POSITION, level: 'building', placeId: 'p62' };

    expect(received(atBuilding)).toHaveBeenCalledWith(atBuilding);
  });

  it('passes on one without a level or a Place', () => {
    expect(received(POSITION)).toHaveBeenCalledWith(POSITION);
  });

  it.each([
    ['a level that is none', { level: 'college' }],
    ['a level the server never sends', { level: 'timetable' }],
    ['a Place that is no id', { level: 'building', placeId: 62 }],
  ])('drops one with %s', (_case, changes) => {
    expect(received({ ...POSITION, ...changes })).not.toHaveBeenCalled();
  });
});
