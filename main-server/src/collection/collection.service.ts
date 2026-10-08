import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma, Source } from '../generated/prisma/client.js';
import { CollectionStatusDto } from './dto/collection-status.dto.js';

@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  // Call it in the transaction that stores what the Collection read, or with PrismaService once Redis holds it.
  async recordSuccess(tx: Prisma.TransactionClient, source: Source, collectedAt: Date): Promise<void> {
    await tx.collectionStatus.upsert({
      where: { source },
      create: { source, lastSucceededAt: collectedAt },
      update: { lastSucceededAt: collectedAt },
    });
  }

  // On its own, or in the transaction that stores what a Collection read before it stopped.
  async recordFailure(
    source: Source,
    failedAt: Date,
    reason: string,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<void> {
    await tx.collectionStatus.upsert({
      where: { source },
      create: { source, lastFailedAt: failedAt, lastFailureReason: reason },
      update: { lastFailedAt: failedAt, lastFailureReason: reason },
    });
  }

  // One for every Source, in the order of the enum, including those never collected.
  async statuses(): Promise<CollectionStatusDto[]> {
    const stored = new Map(
      (await this.prisma.collectionStatus.findMany()).map((status) => [status.source, status] as const),
    );
    return Object.values(Source).map((source) => {
      const status = stored.get(source);
      return {
        source,
        lastSucceededAt: status?.lastSucceededAt?.toISOString() ?? null,
        lastFailedAt: status?.lastFailedAt?.toISOString() ?? null,
        lastFailureReason: status?.lastFailureReason ?? null,
      };
    });
  }
}
