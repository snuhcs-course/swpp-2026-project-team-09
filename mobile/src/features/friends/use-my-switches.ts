/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { lobbyQuery, myPartyQuery } from '@/api/queries';
import type { MySwitches } from './seen-of-me';

// The User's own switches once both the Lobby and GET /parties/mine are read; null until then and while either read
// has failed, so that no card says a level it cannot know yet. A failed Party read is not asked again when a card
// opens: a Party never read goes back to waiting while it is asked, and the map's own cards wait with it and close the
// Friend's card.
export function useMySwitches(): MySwitches | null {
  const lobby = useQuery(lobbyQuery).data;
  const party = useQuery({ ...myPartyQuery, retryOnMount: false }).data;
  return lobby === undefined || party === undefined ? null : { masterOn: lobby.masterSwitch, party };
}
