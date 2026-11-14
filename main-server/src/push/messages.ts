/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { type WaitingDto } from '../quests/dto/waiting.dto.js';

// The closed list of pushed kinds. Each says what its row in the app's "알림" says, and opens `/main?card=<kind>:<id>`.
// It never carries anyone's position, route or arrival time.
export interface PushMessage {
  title: string;
  body: string;
  url: string;
}

export function invitationMessage(waiting: WaitingDto): PushMessage {
  return {
    title: `${waiting.quest.leader.name}님의 파티 초대`,
    body: waiting.quest.title,
    url: `/main?card=invitation:${waiting.id}`,
  };
}
