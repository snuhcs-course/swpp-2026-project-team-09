import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { CollectionSource, Prisma } from '../generated/prisma/client.js';

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

  async recordFailure(source: CollectionSource, failedAt: Date, reason: string): Promise<void> {
    await this.prisma.collectionStatus.upsert({
      where: { source },
      create: { source, lastFailedAt: failedAt, lastFailureReason: reason },
      update: { lastFailedAt: failedAt, lastFailureReason: reason },
    });
  }
}
