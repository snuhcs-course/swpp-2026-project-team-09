/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { lobbyQuery } from '@/api/queries';
import type { Lobby } from '@/api/types';
import { Dialog } from '@/design-system';
import { keep, readKept } from '@/storage/kept';
import {
  askBackgroundPermission,
  backgroundAvailable,
  readBackgroundPermission,
  startBackground,
  stopBackground,
} from './background';
import { stoppedWhileClosed } from './background-rules';
import type { PhonePermission } from './phone';

export interface BackgroundSharing {
  // Android in a development build. Elsewhere the rest stays off.
  available: boolean;
  // The User chose it on this phone and the background permission is granted.
  on: boolean;
  permission: PhonePermission;
  choose: (on: boolean) => void;
  // Shows the system's prompt and gives its answer.
  ask: () => Promise<PhonePermission>;
}

const OFF: BackgroundSharing = {
  available: false,
  on: false,
  permission: 'unasked',
  choose: () => {
    // Nothing to choose where it is not available.
  },
  ask: () => Promise.resolve('refused'),
};

const BackgroundContext = createContext<BackgroundSharing>(OFF);

interface Known {
  chosen: boolean;
  permission: PhonePermission;
}

// Whether this start of the app has checked that background sharing stopped while the app was closed.
let checked = false;

function masterSwitchOf(lobby: Lobby): boolean {
  return lobby.masterSwitch;
}

// What the phone keeps of the choice and says of the permission, read once and the permission again each time the app
// returns to the front, from the phone's settings for example. Null where background sharing is not available.
function useKnown(): [Known | null, (change: Partial<Known>) => void, boolean, () => void] {
  const [known, setKnown] = useState<Known | null>(null);
  const [stopped, setStopped] = useState(false);
  useEffect(() => {
    let shown = true;
    const read = async (): Promise<void> => {
      if (!(await backgroundAvailable())) {
        return;
      }
      const [kept, permission] = await Promise.all([readKept(), readBackgroundPermission()]);
      if (shown) {
        setStopped(stoppedWhileClosed(kept.backgroundRunning, !checked));
        checked = true;
        setKnown({ chosen: kept.backgroundChosen, permission });
      }
    };
    void read();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void readBackgroundPermission().then((permission) => {
          setKnown((now) => now && { ...now, permission });
        });
      }
    });
    return (): void => {
      shown = false;
      listener.remove();
    };
  }, []);
  const change = useCallback((next: Partial<Known>) => {
    setKnown((now) => now && { ...now, ...next });
  }, []);
  const close = useCallback(() => {
    setStopped(false);
  }, []);
  return [known, change, stopped, close];
}

// Starts and stops the background sending of the signed-in User, beside `PositionSending`: it runs while the Master
// Switch is on, the User chose it and the background permission is granted. It keeps the Master Switch on the phone
// for the task. It also tells, once after a new start of the app, that background sharing had stopped.
export function BackgroundSharingProvider({ children }: { children: ReactNode }): ReactElement {
  const switchOn = useQuery({ ...lobbyQuery, select: masterSwitchOf }).data;
  const [known, change, stopped, closeStopped] = useKnown();
  const ready = known !== null && switchOn !== undefined;
  const running = ready && switchOn && known.chosen && known.permission === 'granted';
  useEffect(() => {
    if (ready) {
      void keep({ masterSwitch: switchOn }).then(running ? startBackground : (): Promise<void> => stopBackground());
    }
  }, [ready, switchOn, running]);
  const value = useMemo((): BackgroundSharing => {
    if (known === null) {
      return OFF;
    }
    return {
      available: true,
      on: known.chosen && known.permission === 'granted',
      permission: known.permission,
      choose: (chosen) => {
        change({ chosen });
        void keep({ backgroundChosen: chosen });
      },
      ask: async () => {
        const permission = await askBackgroundPermission();
        change({ permission });
        return permission;
      },
    };
  }, [known, change]);
  return (
    <BackgroundContext value={value}>
      {children}
      <Dialog
        body="앱을 완전히 닫으면 공유가 멈춰요. 백그라운드로 보내 두기만 하면 계속 공유돼요."
        confirmLabel="확인"
        onCancel={closeStopped}
        onConfirm={closeStopped}
        title="백그라운드 위치 공유가 멈췄어요"
        visible={stopped}
      />
    </BackgroundContext>
  );
}

export function useBackgroundSharing(): BackgroundSharing {
  return use(BackgroundContext);
}
