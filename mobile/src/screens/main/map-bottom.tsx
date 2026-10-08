import type { ReactElement } from 'react';
import { space } from '@/design-system';
import type { CardView } from '@/features/map/adapter';
import { BottomControls } from './bottom-controls';
import { LayerControls, type LayerStack } from './layers';
import { CARD, LAYERS_BUTTON, type Room } from './layout';
import { ShuttleNotice } from './shuttle-notice';

// How much higher the 편의기능 button stands above the shuttle's notice, 8 above its top; 0 without it.
function liftOver(noticeHeight: number | null): number {
  return noticeHeight === null ? 0 : CARD.bottom + noticeHeight + space[2] - LAYERS_BUTTON.bottom;
}

// What the open card and the shuttle's notice take. A 식당's card sits at the top: the lists give way to it, and what
// is at the bottom stays. The notice, the shuttle's service hours, gives way to any open card; what a card at the
// bottom hides gives way to the notice too, and the 편의기능 button stands above it.
export interface Taken {
  topCard: boolean;
  bottomCard: boolean;
  notice: string | null;
}

export function takenBy(selected: CardView | null, serviceHours: string | null): Taken {
  const topCard = selected?.kind === 'dining';
  return { topCard, bottomCard: selected !== null && !topCard, notice: selected === null ? serviceHours : null };
}

interface MapBottomProps {
  taken: Taken;
  onNoticeHeight: (height: number) => void;
  onMenus: () => void;
  room: Room;
  stack: LayerStack;
}

// What is at the bottom of the map: the shuttle's notice, the row of buttons and the 편의기능 button. A card at the
// bottom hides the row and the button; the notice hides the row, and the button stands above it.
export function MapBottom({ taken, onMenus, onNoticeHeight, room, stack }: MapBottomProps): ReactElement {
  const { bottomCard, notice } = taken;
  return (
    <>
      {notice === null ? null : <ShuttleNotice onHeight={onNoticeHeight} serviceHours={notice} />}
      <BottomControls cardOpen={bottomCard || notice !== null} room={room} />
      {bottomCard ? null : (
        <LayerControls lift={notice === null ? 0 : liftOver(room.cardHeight)} onMenus={onMenus} stack={stack} />
      )}
    </>
  );
}
