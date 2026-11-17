/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createContext, type ReactElement, type ReactNode, use } from 'react';
import type { PlacePoint } from '@/api/assistant-types';
import type { ChatSheetControl } from '../chat-sheet';

// What an events Plan's and a party's Plan's buttons do beyond a recalculation: words sent to the Assistant as typed,
// and the route guidance a Lookup's "길 안내" starts, which closes the answer once it started.
export interface RowFourActions {
  ask: (words: string) => void;
  guide: (to: PlacePoint) => void;
}

function nothing(): void {
  // Outside the answer frame no button asks or guides.
}

const Actions = createContext<RowFourActions>({ ask: nothing, guide: nothing });

export function useRowFourActions(): RowFourActions {
  return use(Actions);
}

export function RowFourProvider({
  control,
  children,
}: {
  control: ChatSheetControl;
  children: ReactNode;
}): ReactElement {
  const actions: RowFourActions = { ask: control.chat.send, guide: control.lookup.guide };
  return <Actions value={actions}>{children}</Actions>;
}
