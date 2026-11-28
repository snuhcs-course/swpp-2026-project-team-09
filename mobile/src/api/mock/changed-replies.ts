/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AssistantReply, RequestContext } from '@/api/assistant-types';
import { cancelReplyTo } from './data/cancel-quest';
import { outOfReachReplyTo } from './data/out-of-reach';
import { partyChangeReplyTo } from './data/party-change';
import { pickReplyTo } from './data/pick';
import { skippedReplyTo } from './data/skipped-classes';

// The mock's replies to words that change what is on screen: a meal asked for a day out of reach, a Quest cancelled, a
// 파티 changed, a Place or a time picked, a Class left out.
export const changedReplyTo = (last: string, context: RequestContext): AssistantReply | null =>
  outOfReachReplyTo(last, context) ??
  cancelReplyTo(last) ??
  partyChangeReplyTo(last) ??
  pickReplyTo(last) ??
  skippedReplyTo(last);
