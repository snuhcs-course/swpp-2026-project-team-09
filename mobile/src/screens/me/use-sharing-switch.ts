import { useState } from 'react';
import { useToast } from '@/design-system';
import { useMasterSwitch } from '@/features/sharing/use-master-switch';
import { openLocationSettings, usePosition } from '@/position';

const NEEDS_PERMISSION = '위치 권한을 허용해야 공유할 수 있어요';

export interface SharingSwitch {
  on: boolean;
  change: (on: boolean) => void;
  // The explanation before the location prompt, as on the map, and its two answers. `blocked`: it leads to the phone's
  // settings instead.
  explaining: boolean;
  blocked: boolean;
  allow: () => void;
  later: () => void;
}

// The switch "친구와 위치 공유". It is turned on only with the location permission, which the map's explanation and
// the system's prompt ask for first; without it the switch stays off.
export function useSharingSwitch(): SharingSwitch {
  const { on, turn } = useMasterSwitch();
  const { permission, ask } = usePosition();
  const showToast = useToast();
  const [explaining, setExplaining] = useState(false);
  const blocked = permission === 'blocked';
  return {
    on,
    change: (next) => {
      if (next && permission !== 'granted') {
        setExplaining(true);
      } else {
        turn(next);
      }
    },
    explaining,
    blocked,
    allow: () => {
      setExplaining(false);
      if (blocked) {
        void openLocationSettings();
        return;
      }
      void ask().then((answer) => {
        if (answer === 'granted') {
          turn(true);
        } else {
          showToast(NEEDS_PERMISSION);
        }
      });
    },
    later: () => {
      setExplaining(false);
      showToast(NEEDS_PERMISSION);
    },
  };
}
