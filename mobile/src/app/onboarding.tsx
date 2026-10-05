import type { ReactElement } from 'react';
import { apiClient } from '@/api/client';
import { signOut } from '@/auth/sign-in';
import { Button } from '@/design-system';
import { Placeholder } from '@/screens/placeholder';
import { useOwnPlace, useSession } from '@/session/session';

// Onboarding's place. Ticket 05 builds the screen; until then the way on saves the suggestion as it is.
export default function OnboardingScreen(): ReactElement {
  const { suggestion, finishOnboarding, leave } = useSession();
  const save = async (): Promise<void> => {
    await apiClient.completeOnboarding({
      name: suggestion?.name ?? '이름 없음',
      department: suggestion?.department ?? '컴퓨터공학부',
      admissionYear: null,
      hashtags: [],
      courseLevel: 'undergraduate',
      gender: null,
    });
    finishOnboarding();
  };
  const out = async (): Promise<void> => {
    await signOut();
    leave();
  };
  return (
    useOwnPlace('onboarding') ?? (
      <Placeholder name="온보딩">
        <Button
          onPress={() => {
            void save();
          }}
        >
          저장 (임시)
        </Button>
        <Button
          onPress={() => {
            void out();
          }}
          variant="secondary"
        >
          로그아웃
        </Button>
      </Placeholder>
    )
  );
}
