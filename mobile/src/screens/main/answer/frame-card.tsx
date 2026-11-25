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

// The frame's card, attached to the bottom of the screen: one sheet whose content is laid out once, moved between its
// steps (P04 tickets 57 and 61), so that raising and lowering move the same card and nothing is swapped.
export function FrameCard(props: FrameCardProps): ReactElement {
  return <OpenCard {...props} />;
}
