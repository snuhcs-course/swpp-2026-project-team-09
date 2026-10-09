// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { act } from '@testing-library/react';

type Identity = NonNullable<Window['google']>['accounts']['id'];
type Options = Parameters<Identity['initialize']>[0];

// Stands in for Google Identity Services, whose script the sign-in page would otherwise load.
export function fakeGoogle(): { options: () => Options; choose: (idToken: string) => void } {
  let options: Options | undefined;
  window.google = {
    accounts: {
      id: {
        initialize: (given): void => {
          options = given;
        },
        renderButton: (parent): void => {
          const button = document.createElement('button');
          button.textContent = 'Sign in with Google';
          parent.append(button);
        },
      },
    },
  };
  const initialized = (): Options => {
    if (options === undefined) {
      throw new Error('Google Identity Services was not initialized.');
    }
    return options;
  };
  return {
    options: initialized,
    choose: (idToken) => {
      act(() => {
        initialized().callback({ credential: idToken });
      });
    },
  };
}
