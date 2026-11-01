/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Source } from '../../generated/prisma/client.js';

export interface CollectionStatusDto {
  source: Source;
  lastSucceededAt: string | null;
  lastFailedAt: string | null;
  lastFailureReason: string | null;
  lastSkippedPosts: number | null;
}
