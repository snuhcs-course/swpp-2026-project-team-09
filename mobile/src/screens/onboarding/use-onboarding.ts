/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useRef, useState } from 'react';
import { apiClient } from '@/api/client';
import { signOut } from '@/auth/sign-in';
import { useToast } from '@/design-system';
import { useSession } from '@/session/session';
import { startFirstRun } from '@/storage/first-run';
import { startTabTour } from '@/storage/tab-tour';
import { answersOf, type Form } from './form';

const NOT_SAVED = '저장하지 못했어요. 다시 시도해 주세요';

// What the two buttons at the foot do. One at a time: while one is at work, neither takes a press.
export function useOnboarding(): { working: boolean; save: (form: Form) => void; out: () => void } {
  const { finishOnboarding, leave } = useSession();
  const showToast = useToast();
  const [working, setWorking] = useState(false);
  // The state reaches the buttons with the next drawing; a second press before it is stopped here.
  const busy = useRef(false);
  const begin = (): boolean => {
    if (busy.current) {
      return false;
    }
    busy.current = true;
    setWorking(true);
    return true;
  };
  const save = (form: Form): void => {
    if (!begin()) {
      return;
    }
    apiClient.completeOnboarding(answersOf(form)).then(
      async () => {
        // The first run's cards, and after them the tour of the tabs, are shown only to a User who finished Onboarding
        // on this phone.
        await startFirstRun().catch(() => null);
        await startTabTour().catch(() => null);
        finishOnboarding();
      },
      () => {
        // The form stays as it is, for the User to try again.
        showToast(NOT_SAVED);
        busy.current = false;
        setWorking(false);
      },
    );
  };
  const out = (): void => {
    if (!begin()) {
      return;
    }
    void signOut()
      .catch(() => null)
      .then(leave);
  };
  return { working, save, out };
}
