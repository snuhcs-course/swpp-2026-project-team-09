/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../common/prisma.service.js';
import { type KeptKind, keptQuestsOf } from '../../quests/kept-quests.js';
import { defineTool, type Tool } from '../feature.js';
import { clearDrawn } from '../presented.js';
import { clockOf } from '../free-time/free-time.js';
import { koreaDate, koreaTime } from '../korea-time.js';
import { othersText } from '../others-text.js';

// Cancelling a Quest by words (P05 ticket 31, rows C1 to C14): the model names it by its ref, and the reply carries one
// button, which the app sends as `DELETE /quests/:questId`, the room's 나가기. A Quest nobody else holds is deleted with
// it, its invitations too; one others hold is left to them, the earliest of them leading it when the User led it.
// Nothing is cancelled until the User presses the button.

// The days the User's Quests are looked for in, today first: as far as findDay and the line ahead reach.
const DAYS = 8;

const NAME = { select: { name: true } } as const;

export interface CancelTarget {
  questId: string;
  kind: KeptKind;
  title: string;
  start: Date;
  end: Date | null;
  // The User holds it, rather than only being invited to it.
  holds: boolean;
  mine: boolean;
  // The other Holders in the order they joined, and the Friends whose invitation waits, by name.
  others: string[];
  invited: string[];
}

export type CancelFound =
  { kind: 'none' } | { kind: 'several'; refs: string[] } | { kind: 'found'; target: CancelTarget };

// The User's Quest a ref names, among those of today and the week ahead they hold or were invited to.
@Injectable()
export class QuestCancelService {
  constructor(private readonly prisma: PrismaService) {}

  async find(userId: string, ref: string, now: Date): Promise<CancelFound> {
    const kept = await keptQuestsOf(this.prisma, userId, { date: koreaDate(now), now, days: DAYS });
    const named = ref.toLowerCase();
    const matches = kept.filter(({ questId }) => questId.startsWith(named));
    const [match] = matches;
    if (match === undefined) {
      return { kind: 'none' };
    }
    if (matches.length > 1) {
      return { kind: 'several', refs: matches.map(({ questId }) => questId) };
    }
    const quest = await this.prisma.quest.findUniqueOrThrow({
      where: { id: match.questId },
      include: {
        holders: { include: { user: NAME }, orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }] },
        invitations: { include: { user: NAME }, orderBy: [{ sentAt: 'asc' }, { id: 'asc' }] },
      },
    });
    const holds = quest.holders.some((holder) => holder.userId === userId);
    return {
      kind: 'found',
      target: {
        questId: quest.id,
        kind: match.kind,
        title: quest.title,
        start: match.start,
        end: match.end,
        holds,
        mine: match.mine,
        others: quest.holders.filter((holder) => holder.userId !== userId).map(({ user }) => user.name),
        // Only a Holder sees who else is invited, as the Quest's members show them (PR 422).
        invited: holds ? quest.invitations.map(({ user }) => user.name) : [],
      },
    };
  }
}

const NONE = 'No Quest of the User has that ref today or in the week ahead. Say nothing of that is set.';
const SEVERAL = 'More than one Quest has that ref. Call findDay to show them and ask which one.';
const INVITED =
  'The User was only invited to this Quest and holds nothing to cancel. Say they decline it on its invitation card (초대는 초대 카드에서 거절해요).';
const OVER = 'This Quest is over: nothing is cancelled. Say 이미 끝난 일정이에요.';
const SEAT =
  'This is a seat kept with a library booking: cancel the booking with the library tools (proposeLibraryCancel), not here.';
const IN_ROOM =
  'This app shows no cancel button. Say the User cancels it in its room with 나가기 (파티 방에서 나가기로 취소해요).';
const ONE_AT_A_TIME =
  'A cancel button for another Quest is already under this reply, and one reply cancels one Quest: this one is not shown. Say which one the button cancels, and that the User asks again for the next.';
const SHOWN =
  'A button is shown under your reply; nothing is cancelled until the User presses it. In one sentence name the Quest by its day, time and title and ask whether to cancel it. With leaves, others keep it: say so, and that nextLeader then leads it, such as "나가면 민수가 리더가 되고 약속은 남아요. 나갈까요?". With invitationsGo, say those invitations go too. When started, say it has started. Never say it was cancelled, and call no other tool after this one.';

// A Quest's day and time as the model names it, such as "11/24 18:00".
const whenOf = (start: Date): string => `${koreaDate(start).slice(5).replace('-', '/')} ${clockOf(start)}`;

function shownAnswer(target: CancelTarget, now: Date): object {
  const leaves = target.others.length > 0;
  const nextLeader = leaves && target.mine ? target.others[0] : undefined;
  return {
    result: 'cancel-shown',
    ref: target.questId,
    kind: target.kind,
    title: othersText('quest.title', target.title),
    start: whenOf(target.start),
    started: target.start <= now,
    button: leaves ? '나가기' : '취소하기',
    leaves,
    ...(nextLeader === undefined ? {} : { nextLeader: othersText('friend.name', nextLeader) }),
    ...(leaves || target.invited.length === 0
      ? {}
      : { invitationsGo: target.invited.map((name) => othersText('friend.name', name)) }),
    reason: SHOWN,
  };
}

// What stops a cancel, said to the model, or null when its button is shown.
function stopped(target: CancelTarget, now: Date, drawsButton: boolean): object | null {
  if (!target.holds) {
    return { result: 'invited', reason: INVITED };
  }
  if (target.kind === 'seat') {
    return { result: 'seat', reason: SEAT };
  }
  // One with no end is over only once its day is: findDay reads it no further.
  if (target.end !== null && target.end <= now) {
    return { result: 'over', reason: OVER };
  }
  return drawsButton ? null : { result: 'in-room', reason: IN_ROOM };
}

export function proposeCancel(cancels: Pick<QuestCancelService, 'find'>): Tool {
  return defineTool({
    description:
      "Shows the User one button to cancel one of their Quests, named by its ref as findDay or [Ahead: …] gives it: 취소하기 when nobody else holds it, which deletes it, or 나가기 when others do, who keep it. Nothing is cancelled until the User presses it. One reply cancels one Quest. Answers 'cancel-shown' with what pressing does, or why it is not cancelled here: 'invited', 'over', 'seat', 'in-room', 'several', 'none', or 'one-at-a-time' when a button for another is already shown.",
    input: z.object({
      ref: z.string().min(8).max(36).describe('The Quest to cancel, by its ref as findDay or [Ahead: …] gives it.'),
    }),
    run: async ({ ref }, { userId, now, capabilities, presented }) => {
      const found = await cancels.find(userId, ref, now);
      if (found.kind === 'none') {
        return { result: 'none', reason: NONE };
      }
      if (found.kind === 'several') {
        return { result: 'several', refs: found.refs, reason: SEVERAL };
      }
      const { target } = found;
      const stop = stopped(target, now, capabilities.has('quest-cancel'));
      if (stop !== null) {
        return stop;
      }
      // One button per reply, so that a press never cancels another Quest than the one the reply names.
      if ((presented.offers ?? []).some(({ kind }) => kind === 'leave-quest')) {
        return { result: 'one-at-a-time', reason: ONE_AT_A_TIME };
      }
      // The button stays only in a reply that draws nothing else.
      clearDrawn(presented);
      const label = target.others.length > 0 ? '나가기' : '취소하기';
      const button = { kind: 'leave-quest', label, title: target.title, startsAt: koreaTime(target.start) } as const;
      presented.offers = [...(presented.offers ?? []), { ...button, questId: target.questId }];
      return shownAnswer(target, now);
    },
  });
}

// The rules of cancelling a Quest by words, a fragment of the chat's system prompt for an app that draws answers.
export const CANCEL_RULES = `A Quest of the User's is cancelled by a button: the model never cancels one itself.

- When the User asks to cancel or leave one of their Quests (저녁 약속 취소해 줘, 민수랑 약속 빠질래, 그 파티 안 갈래), find it in [Ahead: …] or with findDay, and call proposeCancel with its ref, then answer as it says. When several Quests fit and the User meant one, show them with findDay and ask which. One reply cancels one Quest: asked for two or more, show the first and say the User asks again for the next.
- A Class is not cancelled here: say so. A library booking is cancelled with the library tools.`;
