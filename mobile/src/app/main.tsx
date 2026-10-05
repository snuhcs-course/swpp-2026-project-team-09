import type { ReactElement } from 'react';
import { signOut } from '@/auth/sign-in';
import { Button } from '@/design-system';
import { Placeholder } from '@/screens/placeholder';
import { useOwnPlace, useSession } from '@/session/session';

// The main screen's place. Ticket 08 builds the screen.
export default function MainScreen(): ReactElement {
  const { leave } = useSession();
  const out = async (): Promise<void> => {
    await signOut();
    leave();
  };
  return (
    useOwnPlace('ready') ?? (
      <Placeholder name="메인">
        <Button
          onPress={() => {
            void out();
          }}
          variant="secondary"
        >
          로그아웃 (임시)
        </Button>
      </Placeholder>
    )
  );
}
