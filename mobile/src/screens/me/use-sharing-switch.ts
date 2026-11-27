/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { useRef, useState } from 'react';
import { useToast } from '@/design-system';
import { useFriendChanges } from '@/features/friends/use-friend-changes';
import { type MasterSwitch, useMasterSwitch } from '@/features/sharing/use-master-switch';
import { openLocationSettings, usePosition } from '@/position';
import type { OffAnswer } from '../friends/off-question';
import { NOT_CHANGED } from '../friends/use-levels';

const NEEDS_PERMISSION = '위치 권한을 허용해야 공유할 수 있어요';

export interface SharingSwitch {
  on: boolean;
  // `then` runs once the switch is on, after the explanation and the prompt where they come first.
  change: (on: boolean, then?: () => void) => void;
  // The explanation before the location prompt, as on the map, and its two answers. `blocked`: it leads to the phone's
  // settings instead.
  explaining: boolean;
  blocked: boolean;
  allow: () => void;
  later: () => void;
  // The question before the switch is turned off the first time, and its answer.
  askingOff: boolean;
  answerOff: (answer: OffAnswer) => void;
}

// The question before the Master Switch is turned off the first time. "건물까지만" lowers every Friend at the exact
// position to the building and leaves the switch on; every answer is recorded.
function useOffQuestion({ turn, markOffAsked }: MasterSwitch): Pick<SharingSwitch, 'askingOff' | 'answerOff'> & {
  askOff: () => void;
} {
  const changes = useFriendChanges();
  const showToast = useToast();
  const [askingOff, setAskingOff] = useState(false);
  return {
    askingOff,
    askOff: () => {
      setAskingOff(true);
    },
    answerOff: (answer) => {
      setAskingOff(false);
      markOffAsked();
      if (answer === 'off') {
        void turn(false, '껐어요 · 친구에게 알림은 가지 않아요');
      } else if (answer === 'building') {
        changes.lowerLevels('building').then(
          () => {
            showToast('모든 친구에게 지금 있는 건물까지만 보여요');
          },
          () => {
            showToast(NOT_CHANGED);
          },
        );
      }
    },
  };
}

type TurnOn = (then: (() => void) | null) => void;

// The explanation before the location prompt, and the prompt, before the switch is turned on. What waits for the
// switch runs once it is on, and is dropped with a refusal.
function useExplanation(turnOn: TurnOn): Pick<SharingSwitch, 'explaining' | 'blocked' | 'allow' | 'later'> & {
  explain: (then: (() => void) | null) => void;
} {
  const { permission, ask } = usePosition();
  const showToast = useToast();
  const [explaining, setExplaining] = useState(false);
  const after = useRef<(() => void) | null>(null);
  const blocked = permission === 'blocked';
  return {
    explaining,
    blocked,
    explain: (then) => {
      after.current = then;
      setExplaining(true);
    },
    allow: () => {
      setExplaining(false);
      const then = after.current;
      after.current = null;
      if (blocked) {
        void openLocationSettings();
        return;
      }
      void ask().then((answer) => {
        if (answer === 'granted') {
          turnOn(then);
        } else {
          showToast(NEEDS_PERMISSION);
        }
      });
    },
    later: () => {
      setExplaining(false);
      after.current = null;
      showToast(NEEDS_PERMISSION);
    },
  };
}

// The switch "위치 공유". It is turned on only with the location permission, which the map's explanation and
// the system's prompt ask for first; without it the switch stays off. It is turned off at once once the app has asked.
export function useSharingSwitch(): SharingSwitch {
  const master = useMasterSwitch();
  const { on, turn, offAsked } = master;
  const { askOff, ...question } = useOffQuestion(master);
  const granted = usePosition().permission === 'granted';
  const turnOn: TurnOn = (then) => {
    void turn(true).then((taken) => {
      if (taken) {
        then?.();
      }
    });
  };
  const { explain, ...explanation } = useExplanation(turnOn);
  return {
    on,
    change: (next, then) => {
      if (next && !granted) {
        explain(then ?? null);
      } else if (!next && !offAsked) {
        askOff();
      } else if (next) {
        turnOn(then ?? null);
      } else {
        void turn(false);
      }
    },
    ...explanation,
    ...question,
  };
}
