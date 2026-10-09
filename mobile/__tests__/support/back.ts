// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { act } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

type BackListener = Parameters<typeof BackHandler.addEventListener>[1];

// Android's back button, which the test presses: the listeners the app added, the latest first, until one takes the
// press. Call it before the app starts, so that the navigation's own listener is among them. Gives whether the app
// took the press; when it did not, Android leaves the app.
export function holdBackButton(): () => Promise<boolean> {
  const listeners: BackListener[] = [];
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_type, listener) => {
    listeners.push(listener);
    return {
      remove: (): void => {
        listeners.splice(listeners.indexOf(listener), 1);
      },
    };
  });
  return async () => {
    let taken = false;
    await act(() => {
      taken = listeners.toReversed().some((listener) => listener({ type: 'hardwareBackPress', timeStamp: 0 }) === true);
    });
    return taken;
  };
}
