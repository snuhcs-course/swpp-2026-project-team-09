/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { healthAnswer } from '../health-answer';

// Shorter than the readiness probe's timeout, so that a hung main server reads as down.
const ANSWER_TIMEOUT_MS = 2000;

async function mainServerIsLive(): Promise<boolean> {
  try {
    const response = await fetch(new URL('/health/live', process.env.MAIN_SERVER_URL), {
      cache: 'no-store',
      signal: AbortSignal.timeout(ANSWER_TIMEOUT_MS),
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Every page reads from the main server, so the site is ready only while it answers.
export async function GET(): Promise<Response> {
  return healthAnswer({ mainServer: { status: (await mainServerIsLive()) ? 'up' : 'down' } });
}
