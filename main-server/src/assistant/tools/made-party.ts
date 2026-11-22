/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service.js';
import { type SubQuest } from '../../generated/prisma/client.js';

// A 파티 the User made with 만들기, as proposeQuest reads it to change it in place (P05 ticket 30): gone when it was
// cancelled or the User left it, led by another once the User handed it over, else its step to change, the one a Holder
// added when there is exactly one, and whom a change reaches. Join requesters are not counted: a change in the room does
// not tell them either.
export type MadeParty =
  | { kind: 'gone' }
  | { kind: 'led-by-other'; leaderName: string }
  | {
      kind: 'found';
      title: string;
      step: SubQuest | null;
      stepIds: string[];
      // The other Holders, whom the change tells.
      others: number;
      // The invited Friends who have not answered, whose invitation shows the new time.
      waiting: number;
    };

@Injectable()
export class MadePartyService {
  constructor(private readonly prisma: PrismaService) {}

  async of(userId: string, questId: string): Promise<MadeParty> {
    const quest = await this.prisma.quest.findFirst({
      where: { id: questId, holders: { some: { userId } } },
      include: {
        leader: { select: { name: true } },
        subQuests: { orderBy: { createdAt: 'asc' } },
        holders: { select: { userId: true } },
        invitations: { select: { userId: true } },
      },
    });
    if (quest === null) {
      return { kind: 'gone' };
    }
    if (quest.leaderId !== userId) {
      return { kind: 'led-by-other', leaderName: quest.leader.name };
    }
    const added = quest.subQuests.filter(({ attending }) => !attending);
    return {
      kind: 'found',
      title: quest.title,
      step: added.length === 1 ? (added[0] ?? null) : null,
      stepIds: quest.subQuests.map(({ id }) => id),
      others: quest.holders.length - 1,
      waiting: quest.invitations.length,
    };
  }
}
