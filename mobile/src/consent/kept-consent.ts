/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useEffect, useState } from 'react';
import type { Consent } from '@/api/types';
import { type Kept, keep, readKept } from '@/storage/kept';

// The version of the legal documents the app shows. Raised together with the main server's `CONSENT_VERSION`
// (`main-server/src/users/consent.ts`), in one pull request: a User whose account holds a lower one is asked again.
export const CONSENT_VERSION = 1;

// No consent: an account that agreed to none, an answer without the field, and the phone after a sign-out.
export const NO_CONSENT: Consent = { version: null, usage: null };

// Whether the consent screen asks: the copy holds no version, or one lower than the app's.
export function consentAsked(consent: Consent): boolean {
  return consent.version === null || consent.version < CONSENT_VERSION;
}

type Listener = (consent: Consent) => void;

const listeners = new Set<Listener>();

// Writes the phone's copy of the account's consent, with `more` in the same write, and tells whoever shows it. Every
// write of the copy goes through here: the sign-in, the Lobby, the consent's answer, the switch's answer, a sign-out
// and a Session's end.
export async function keepConsent(consent: Consent, more: Partial<Kept> = {}): Promise<void> {
  await keep({ ...more, consent });
  for (const listener of listeners) {
    listener(consent);
  }
}

// The phone's copy as it is now and after each write, or null until it is read.
export function useKeptConsent(): Consent | null {
  const [consent, setConsent] = useState<Consent | null>(null);
  useEffect(() => {
    let written = false;
    const listener: Listener = (kept) => {
      written = true;
      setConsent(kept);
    };
    listeners.add(listener);
    void readKept().then(
      (kept) => {
        // A write that came first holds.
        if (!written) {
          setConsent(kept.consent);
        }
      },
      () => null,
    );
    return (): void => {
      listeners.delete(listener);
    };
  }, []);
  return consent;
}
