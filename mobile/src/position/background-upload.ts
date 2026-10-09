/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { AppState } from 'react-native';
import { apiClient } from '@/api/client';
import { loadTokens } from '@/auth/tokens';
import { keep, readKept } from '@/storage/kept';
import { stopBackground } from './background';
import { afterUpload, beforeUpload, newestUpload } from './background-rules';
import type { Measured } from './phone';

// One run of the background task, with the positions the phone told since the last. It reads what the phone keeps
// before each upload, since it may run in a start of the app without its screens; there the tokens are read first,
// so that the client can send them and renew them.
export async function uploadInBackground(batch: readonly Measured[]): Promise<void> {
  const [kept] = await Promise.all([readKept(), loadTokens()]);
  const step = beforeUpload({
    signedIn: kept.signedIn,
    switchOn: kept.masterSwitch,
    chosen: kept.backgroundChosen,
    inFront: AppState.currentState === 'active',
  });
  if (step === 'stop') {
    await stopBackground();
    return;
  }
  const upload = newestUpload(batch);
  if (step === 'skip' || upload === null) {
    return;
  }
  let error: unknown = null;
  try {
    await apiClient.uploadPosition(upload);
  } catch (thrown) {
    error = thrown;
  }
  const next = afterUpload(error);
  if (next === 'switch-off') {
    await keep({ masterSwitch: false });
  }
  if (next !== 'go-on') {
    await stopBackground();
  }
}
