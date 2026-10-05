import type { ReactElement } from 'react';
import { signIn } from '@/auth/sign-in';
import { Button } from '@/design-system';
import { Placeholder } from '@/screens/placeholder';
import { useOwnPlace, useSession } from '@/session/session';

// The sign-in screen's place. Ticket 04 builds the screen.
export default function SignInScreen(): ReactElement {
  const { enter } = useSession();
  const pressed = async (): Promise<void> => {
    const result = await signIn();
    if (result.outcome === 'signed-in') {
      enter(result.onboarding);
    }
  };
  return (
    useOwnPlace('signed-out') ?? (
      <Placeholder name="로그인">
        <Button
          onPress={() => {
            void pressed();
          }}
        >
          로그인 (임시)
        </Button>
      </Placeholder>
    )
  );
}
