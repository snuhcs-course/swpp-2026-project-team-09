/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type PushLog, readAnswer, requestFailure } from '../src/push/expo-push.js';
import { invitationMessage } from '../src/push/messages.js';
import { type WaitingDto } from '../src/quests/dto/waiting.dto.js';
import { savedAnswer } from './walking-route.js';

const TOKEN = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]';

function ticketsAnswer(...tickets: object[]): unknown {
  return { data: tickets };
}

const okTicket = { status: 'ok', id: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX' };

const deviceNotRegisteredTicket = {
  status: 'error',
  message: `"${TOKEN}" is not a registered push notification recipient`,
  details: { error: 'DeviceNotRegistered', expoPushToken: TOKEN },
};

const otherErrorTicket = {
  status: 'error',
  message: `Something else went wrong with ${TOKEN}`,
  details: { error: 'SomethingElse', expoPushToken: TOKEN },
};

const ROWS = [{ id: 'row-1' }, { id: 'row-2' }, { id: 'row-3' }];

// Typed, so that lint lets it into an object.
function textMatching(pattern: RegExp): unknown {
  return expect.stringMatching(pattern);
}

function leaking(logs: readonly PushLog[]): PushLog[] {
  return logs.filter(({ text }) => text.includes('PushToken['));
}

describe('The message of a received invitation', () => {
  it('names the Leader in the title, carries the Quest’s title, and opens the invitation’s card', () => {
    const waiting: WaitingDto = {
      id: 'invitation-1',
      quest: {
        id: 'quest-1',
        title: '저녁 같이',
        globalEvent: null,
        leader: { id: 'leader-1', name: '홍길동', department: '컴퓨터공학부' },
        holderCount: 1,
        capacity: 4,
        joinPolicy: 'closed',
        board: null,
        description: '',
        createdAt: '2026-11-14T03:00:00.000Z',
      },
      sentAt: '2026-11-14T03:01:00.000Z',
    };

    expect(invitationMessage(waiting)).toEqual({
      title: '홍길동님의 파티 초대',
      body: '저녁 같이',
      url: '/main?card=invitation:invitation-1',
    });
  });
});

describe('The tickets of Expo’s answer', () => {
  it('drops the row of each DeviceNotRegistered ticket, in message order', () => {
    const reading = readAnswer(200, ticketsAnswer(okTicket, deviceNotRegisteredTicket, otherErrorTicket), ROWS);

    expect(reading.dropped).toEqual(['row-2']);
  });

  it('drops nothing for an ok ticket and logs its receipt at debug level', () => {
    const reading = readAnswer(200, ticketsAnswer(okTicket), ROWS.slice(0, 1));

    expect(reading).toEqual({
      dropped: [],
      logs: [{ level: 'debug', text: textMatching(/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX/u) }],
    });
  });

  it('logs a DeviceNotRegistered ticket at info level with its row and code', () => {
    const reading = readAnswer(200, ticketsAnswer(deviceNotRegisteredTicket), ROWS.slice(0, 1));

    expect(reading.logs).toEqual([{ level: 'log', text: textMatching(/row-1.*DeviceNotRegistered/u) }]);
  });

  it('keeps the row of another error and logs it as a warning with its code', () => {
    const reading = readAnswer(200, ticketsAnswer(otherErrorTicket), ROWS.slice(0, 1));

    expect(reading).toEqual({
      dropped: [],
      logs: [{ level: 'warn', text: textMatching(/row-1.*SomethingElse/u) }],
    });
  });

  it('as Expo answered a made-up token drops it', () => {
    const reading = readAnswer(200, JSON.parse(savedAnswer('expo-push-device-not-registered')), ROWS.slice(0, 1));

    expect(reading.dropped).toEqual(['row-1']);
  });
});

describe('An answer of Expo’s push service without tickets', () => {
  it('of a refused request drops nothing and logs its status and codes as a warning', () => {
    const body = { errors: [{ code: 'VALIDATION_ERROR', message: `"to" ${TOKEN} is not valid` }] };

    const reading = readAnswer(400, body, ROWS);

    expect(reading).toEqual({
      dropped: [],
      logs: [{ level: 'warn', text: textMatching(/400.*VALIDATION_ERROR/u) }],
    });
  });

  it('that does not parse drops nothing and logs a warning with the status', () => {
    const reading = readAnswer(200, { data: `${TOKEN} is not a ticket` }, ROWS);

    expect(reading).toEqual({ dropped: [], logs: [{ level: 'warn', text: textMatching(/HTTP 200/u) }] });
  });
});

describe('The log lines of a send', () => {
  it('never hold a push token', () => {
    const answers: [number, unknown][] = [
      [200, ticketsAnswer(okTicket, deviceNotRegisteredTicket, otherErrorTicket)],
      [200, JSON.parse(savedAnswer('expo-push-device-not-registered'))],
      [200, ticketsAnswer({ status: 'error', message: TOKEN, details: { error: TOKEN } })],
      [200, ticketsAnswer({ status: 'ok', id: TOKEN })],
      [400, { errors: [{ code: 'VALIDATION_ERROR', message: TOKEN }] }],
      [400, { errors: [{ code: TOKEN, message: TOKEN }] }],
      [200, { data: TOKEN }],
      [502, TOKEN],
    ];

    for (const [status, body] of answers) {
      expect(leaking(readAnswer(status, body, ROWS).logs)).toEqual([]);
    }
    expect(leaking([requestFailure(new TypeError(`fetch failed for ${TOKEN}`))])).toEqual([]);
  });

  it('name a request that failed as a warning', () => {
    const error = new DOMException('The operation timed out.', 'TimeoutError');

    expect(requestFailure(error)).toEqual({ level: 'warn', text: textMatching(/TimeoutError/u) });
  });
});
