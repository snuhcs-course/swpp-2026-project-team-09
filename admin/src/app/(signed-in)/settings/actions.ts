/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

'use server';

import { refresh } from 'next/cache';

import { mainServer, MainServerError } from '@/main-server';
import { asAdministrator } from '@/session';

const PATH = '/settings';

// Saves one setting. A refused value answers the main server's reason, for the row to show.
export async function saveSetting(_message: string | null, form: FormData): Promise<string | null> {
  const name = form.get('name');
  const value = form.get('value');
  try {
    await asAdministrator(PATH, (token) =>
      mainServer.saveSetting(token, typeof name === 'string' ? name : '', typeof value === 'string' ? value : ''),
    );
  } catch (error) {
    if (error instanceof MainServerError && error.status === 400) {
      const { message } = error.refusal;
      const reason = Array.isArray(message) ? message.join(' ') : message;
      return reason === undefined || reason === '' ? 'The main server did not accept this value.' : reason;
    }
    throw error;
  }
  refresh();
  return null;
}
