/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import type { ReactElement } from 'react';

import type { PublicationRoute } from '@/main-server';

export const PUBLICATION_ROUTES: Record<PublicationRoute, string> = {
  administrator: 'Administrator',
  rule: 'Rule',
  judgement: 'Judgement',
};

// A post's Judgement is tried at most this many times, as the main server's JUDGEMENT_TRIES says.
export const JUDGEMENT_TRIES = 2;

export function NeedsAdministratorMark(): ReactElement {
  return (
    <span className="ml-2 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
      Needs an Administrator
    </span>
  );
}
