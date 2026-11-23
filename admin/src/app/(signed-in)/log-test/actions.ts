/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

'use server';

import { mainServer, MainServerError } from '@/main-server';
import { asAdministrator } from '@/session';

export type LogTestAnswer = { sent: true } | { sent: false; refusal: string } | null;

// Sends the pressed button's level. A refusal answers the main server's message, for the page to show.
export async function writeTestLine(_last: LogTestAnswer, form: FormData): Promise<LogTestAnswer> {
  const level = form.get('level');
  try {
    await asAdministrator('/log-test', (token) =>
      mainServer.writeTestLine(token, typeof level === 'string' ? level : ''),
    );
  } catch (error) {
    if (error instanceof MainServerError) {
      const { message } = error.refusal;
      const reason = Array.isArray(message) ? message.join(' ') : message;
      return { sent: false, refusal: reason === undefined || reason === '' ? error.message : reason };
    }
    throw error;
  }
  return { sent: true };
}
