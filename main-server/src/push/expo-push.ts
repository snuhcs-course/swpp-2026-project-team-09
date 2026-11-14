/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';

// Injection token of the HTTP call to Expo's push service. The tests replace it with a stand-in.
export const FETCH_EXPO = 'FETCH_EXPO';

export const EXPO_PUSH_SEND = 'https://exp.host/--/api/v2/push/send';

// Expo's `message` and `details` are never read: they hold the whole token.
const ticketSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), id: z.string() }),
  z.object({ status: z.literal('error'), details: z.object({ error: z.string().optional() }).optional() }),
]);

const ticketsAnswerSchema = z.object({ data: z.array(ticketSchema) });

const errorsAnswerSchema = z.object({ errors: z.array(z.object({ code: z.string() })) });

// Nest's Logger methods: `log` is the info level.
export interface PushLog {
  level: 'log' | 'warn' | 'debug';
  text: string;
}

export interface AnswerReading {
  // The ids of the rows whose tokens Expo no longer knows.
  dropped: string[];
  logs: PushLog[];
}

// Keeps a code or a receipt id out of a log line unless it plainly is one, so that no token reaches the log.
function loggable(value: string | undefined): string {
  return value !== undefined && /^[\w.-]{1,100}$/u.test(value) ? value : 'unreadable';
}

// Reads Expo's answer to one request, whose tickets are in the order of `rows`' messages.
export function readAnswer(status: number, body: unknown, rows: readonly { id: string }[]): AnswerReading {
  if (status < 200 || status > 299) {
    const codes = errorsAnswerSchema.safeParse(body).data?.errors.map(({ code }) => loggable(code)) ?? [];
    return {
      dropped: [],
      logs: [{ level: 'warn', text: `Expo's push service answered HTTP ${status} [${codes.join(', ')}]` }],
    };
  }
  const answer = ticketsAnswerSchema.safeParse(body);
  if (!answer.success) {
    return {
      dropped: [],
      logs: [{ level: 'warn', text: `Expo's push service answered HTTP ${status} without tickets` }],
    };
  }
  const reading: AnswerReading = { dropped: [], logs: [] };
  answer.data.data.forEach((ticket, index) => {
    const row = rows[index];
    if (row === undefined) {
      return;
    }
    if (ticket.status === 'ok') {
      reading.logs.push({ level: 'debug', text: `Push token ${row.id} sent, receipt ${loggable(ticket.id)}` });
    } else if (ticket.details?.error === 'DeviceNotRegistered') {
      reading.dropped.push(row.id);
      reading.logs.push({ level: 'log', text: `Push token ${row.id} deleted: DeviceNotRegistered` });
    } else {
      reading.logs.push({ level: 'warn', text: `Push token ${row.id} not sent: ${loggable(ticket.details?.error)}` });
    }
  });
  return reading;
}

// A request that got no answer: a timeout or a network failure. Only the error's name, never its message.
export function requestFailure(error: unknown): PushLog {
  const name = error instanceof Error ? error.name : typeof error;
  return { level: 'warn', text: `Expo's push service gave no answer: ${loggable(name)}` };
}
