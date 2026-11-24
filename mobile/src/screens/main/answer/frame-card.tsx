/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import type { FrameCardProps } from './frame-card-parts';
import { OpenCard } from './open-card';

export { CONTENT_TOP, contentMaxOf } from './frame-card-parts';

// The frame's card, attached to the bottom of the screen: one sheet in every form (P04 ticket 57). An answer that docks
// passes its dock, which the sheet holds over its open content and shows at its lowest step, so that raising and
// lowering move the same card and nothing is swapped at the end of the motion.
export function FrameCard(props: FrameCardProps): ReactElement {
  return <OpenCard {...props} />;
}
