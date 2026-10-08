import { Source } from '../../generated/prisma/client.js';

export interface CollectionStatusDto {
  source: Source;
  lastSucceededAt: string | null;
  lastFailedAt: string | null;
  lastFailureReason: string | null;
}
