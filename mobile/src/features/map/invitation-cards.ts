/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { QuestInvitation } from '@/api/waiting-types';
import { CAMPUS_BOUNDS, centreOf } from '@/map';
import { type CardView, cardId } from './adapter';
import { shortTitle } from './short-name';

// The list of received invitations gives no Place's position, so the campus's centre stands in. No camera goes there:
// the card of an invitation fits the camera to the invitee's own way.
const CAMPUS_CENTRE = centreOf(CAMPUS_BOUNDS);

// One card for each invitation the User received, which the everyday map draws no marker for.
export function invitationCards(invitations: readonly QuestInvitation[]): CardView[] {
  return invitations.map(({ id, quest, invitedBy }) => ({
    id: cardId.invitation(id),
    kind: 'invitation',
    mark: { type: 'place', place: 'party' },
    marker: { name: `파티 초대 · ${quest.title}`, short: shortTitle(quest.title), count: 0, minutesOld: null },
    subLabel: `${invitedBy.name}의 파티 초대`,
    title: quest.title,
    lines: [],
    primary: null,
    secondary: null,
    position: CAMPUS_CENTRE,
  }));
}
