/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { pass } from './app';
import type { FakeServer } from './fake-server';
import { openMain } from './main';
import { fakePostHog, type FakeClient } from './posthog';
import { LOBBY } from './server';
import { forgetRecorded, USAGE_TOKEN } from './usage-actions';

// For the integration tests: the app opened at an address over the fake main server, for a signed-in User whose
// account chose usage data (`usage`) or not, as the phone's copy and the Lobby say it. Call it after the routes'
// answers are set, since it answers the Lobby again. Gives the User and the client, with what opening sent forgotten,
// or null for a User who chose no while the layer made no client yet.
export async function openWithUsage(
  server: FakeServer,
  address: string | null,
  usage = true,
): Promise<{ user: Awaited<ReturnType<typeof openMain>>; client: FakeClient | null }> {
  process.env.EXPO_PUBLIC_POSTHOG_TOKEN = USAGE_TOKEN;
  const consent = { version: 1, usage };
  server.on('POST /lobby', { status: 200, body: { ...LOBBY, consent } });
  const user = await openMain({ consent, mockAccountConsent: consent });
  if (address !== null) {
    await act(() => {
      router.navigate(address);
    });
    await pass(500);
  }
  const client = fakePostHog().clients.at(-1) ?? null;
  if (client !== null) {
    forgetRecorded(client);
  }
  return { user, client };
}
