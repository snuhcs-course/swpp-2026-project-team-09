// AI-generated with Claude Opus 5.5, 2026-10-05 to 2026-10-09, prompted by AhnJinYoung and Jaehyun0320, reviewed by fyoon46 in #74
import { useCallback, useRef, useState } from 'react';
import type { GoogleAccountPrompt } from '@/auth/google';
import { signIn } from '@/auth/sign-in';
import { useSession } from '@/session/session';
import { readKept } from '@/storage/kept';

// What the sign-in screen shows: its default state, the check of the account, or why the sign-in was refused.
export type SignInPhase = 'default' | 'checking' | 'not-snu-account' | 'failed';

async function ending(way: GoogleAccountPrompt): Promise<Awaited<ReturnType<typeof signIn>>> {
  try {
    return await signIn(way);
  } catch {
    return { outcome: 'failed' };
  }
}

// One sign-in at a time, whichever way Google is asked. A sign-in that succeeds tells the Session, and the flow leads
// the User on; until then the screen keeps showing the check.
export function useSignIn(): { phase: SignInPhase; start: (way: GoogleAccountPrompt) => void } {
  const { enter } = useSession();
  const [phase, setPhase] = useState<SignInPhase>('default');
  const checking = useRef(false);
  const start = useCallback(
    (way: GoogleAccountPrompt) => {
      if (checking.current) {
        return;
      }
      checking.current = true;
      setPhase('checking');
      void ending(way).then(async (result) => {
        if (result.outcome === 'signed-in') {
          const { consented } = await readKept();
          enter(result.onboarding, consented);
          return;
        }
        checking.current = false;
        setPhase(result.outcome === 'cancelled' ? 'default' : result.outcome);
      });
    },
    [enter],
  );
  return { phase, start };
}
