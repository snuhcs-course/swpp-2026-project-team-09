/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { MenuLineKind } from '../generated/prisma/client.js';

// The lines of a meal's cell that are not notes. A Restaurant is open for a meal when it has any (ADR 0011).
export function servedLines<Line extends { kind: MenuLineKind | null }>(cell: readonly Line[]): Line[] {
  return cell.filter(({ kind }) => kind !== MenuLineKind.note);
}
