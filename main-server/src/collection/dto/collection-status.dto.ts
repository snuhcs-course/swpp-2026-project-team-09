// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { Source } from '../../generated/prisma/client.js';

export interface CollectionStatusDto {
  source: Source;
  lastSucceededAt: string | null;
  lastFailedAt: string | null;
  lastFailureReason: string | null;
}
