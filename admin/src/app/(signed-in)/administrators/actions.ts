/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

'use server';

import { refresh } from 'next/cache';

import { mainServer, MainServerError } from '@/main-server';
import { asAdministrator } from '@/session';

const PATH = '/administrators';

export async function registerAdministrator(_message: string | null, form: FormData): Promise<string | null> {
  const email = form.get('email');
  const address = typeof email === 'string' ? email : '';
  try {
    await asAdministrator(PATH, (token) => mainServer.registerAdministrator(token, address));
  } catch (error) {
    if (error instanceof MainServerError && error.status === 400) {
      return `The main server did not accept ${address} as an email address.`;
    }
    throw error;
  }
  refresh();
  return null;
}

export async function removeAdministrator(_message: string | null, form: FormData): Promise<string | null> {
  const id = form.get('id');
  let message: string | null = null;
  try {
    await asAdministrator(PATH, (token) => mainServer.removeAdministrator(token, typeof id === 'string' ? id : ''));
  } catch (error) {
    if (error instanceof MainServerError && error.status === 409) {
      message = 'The last Administrator cannot be removed.';
    } else if (error instanceof MainServerError && error.status === 404) {
      message = 'This Administrator had already been removed.';
    } else {
      throw error;
    }
  }
  refresh();
  return message;
}
