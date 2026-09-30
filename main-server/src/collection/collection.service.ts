import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CollectionSource, Prisma } from '../generated/prisma/client.js';

// Each source's collection status. A success and a failure are kept apart, so the last failure stays visible after a
// later success.
@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  // Call it in the transaction that stores what the collection read.
  async recordSuccess(tx: Prisma.TransactionClient, source: CollectionSource, collectedAt: Date): Promise<void> {
    await tx.collectionStatus.upsert({
      where: { source },
      create: { source, lastSucceededAt: collectedAt },
      update: { lastSucceededAt: collectedAt },
    });
  }

  // Leaves every record the source stored before as it is.
  async recordFailure(source: CollectionSource, failedAt: Date, reason: string): Promise<void> {
    await this.prisma.collectionStatus.upsert({
      where: { source },
      create: { source, lastFailedAt: failedAt, lastFailureReason: reason },
      update: { lastFailedAt: failedAt, lastFailureReason: reason },
    });
  }
}
