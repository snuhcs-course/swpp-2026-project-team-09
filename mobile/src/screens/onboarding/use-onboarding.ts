import { useState } from 'react';
import { apiClient } from '@/api/client';
import { signOut } from '@/auth/sign-in';
import { useToast } from '@/design-system';
import { useSession } from '@/session/session';
import { answersOf, type Form } from './form';

const NOT_SAVED = '저장하지 못했어요. 다시 시도해 주세요';

// What the two buttons at the foot do. One at a time: while one is at work, neither takes a press.
export function useOnboarding(): { working: boolean; save: (form: Form) => void; out: () => void } {
  const { finishOnboarding, leave } = useSession();
  const showToast = useToast();
  const [working, setWorking] = useState(false);
  const save = (form: Form): void => {
    setWorking(true);
    apiClient.completeOnboarding(answersOf(form)).then(finishOnboarding, () => {
      // The form stays as it is, for the User to try again.
      showToast(NOT_SAVED);
      setWorking(false);
    });
  };
  const out = (): void => {
    setWorking(true);
    void signOut()
      .catch(() => null)
      .then(leave);
  };
  return { working, save, out };
}
