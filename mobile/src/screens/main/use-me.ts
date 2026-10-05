import { useState } from 'react';
import type { LatLng } from '@/api/types';
import { useToast } from '@/design-system';
import { CAMPUS_BOUNDS, isInside, type MapAvatar, useMarkerImages } from '@/map';
import { POSITION_EVERY_MS, type PositionPermission, usePosition } from '@/position';
import type { MainMap } from './use-main-map';

// The identifier of the User's own Avatar on the map. A press on it opens nothing.
export const ME_AVATAR_ID = 'me';

export const OFF_CAMPUS = '캠퍼스 밖에 있어요';

export interface Me {
  permission: PositionPermission;
  // The User's position while it is inside the campus rectangle. Null off campus, without the permission and until
  // the first position comes. A route starts from here.
  position: LatLng | null;
  // For `<Map>`: the User's own Avatar, or nothing.
  avatars: readonly MapAvatar[];
  // "내 위치로 이동".
  goToMe: () => void;
  // The explanation before the system's location prompt, and its two answers.
  explaining: boolean;
  allow: () => void;
  later: () => void;
}

// The explanation is shown when the screen opens to a User who was never asked, and again each time it is asked for.
function useExplanation(permission: PositionPermission): {
  explaining: boolean;
  explain: () => void;
  close: () => void;
} {
  const [answered, setAnswered] = useState(false);
  const [again, setAgain] = useState(false);
  return {
    explaining: again || (permission === 'unasked' && !answered),
    explain: (): void => {
      setAgain(true);
    },
    close: (): void => {
      setAnswered(true);
      setAgain(false);
    },
  };
}

// The User on the main screen's map: their Avatar while they are on campus, and the button that brings the map to
// them. The Avatar is at three quarters of its size while the whole campus is in view.
export function useMe(map: MainMap): Me {
  const { permission, position: phone, ask } = usePosition();
  const { explaining, explain, close } = useExplanation(permission);
  const showToast = useToast();
  const [image] = useMarkerImages([{ kind: 'me', small: map.detail === 'overview' }]);
  const position = phone !== null && isInside(phone, CAMPUS_BOUNDS) ? phone : null;
  const goToMe = (): void => {
    if (permission === 'unasked' || permission === 'refused') {
      explain();
    } else if (position !== null) {
      map.goTo(position, 'close', true);
    } else if (phone !== null) {
      showToast(OFF_CAMPUS);
      map.showCampus();
    }
  };
  return {
    permission,
    position,
    avatars:
      position === null || image === undefined
        ? []
        : [{ id: ME_AVATAR_ID, name: '내 위치', position, image, glideMs: POSITION_EVERY_MS, order: 1 }],
    goToMe,
    explaining,
    allow: (): void => {
      close();
      void ask();
    },
    later: close,
  };
}
