/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useSyncExternalStore } from 'react';
import { listenToSending, sendingNow } from './sentry';

// Whether the phone sends error reports, for the switch "오류 보고 보내기" in 내 정보, which changes it with
// `setSending`. On until the phone's choice is read, as it is on a phone that kept none.
export function useSending(): boolean {
  return useSyncExternalStore(listenToSending, sendingNow);
}
