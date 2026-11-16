/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { ForbiddenException, HttpStatus } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';

// A Friend Request by user id, as a 파티's member rows send it, goes only between two Holders of one Quest. A user id
// nobody holds is refused the same way.
export async function checkFellowHolders(
  tx: Prisma.TransactionClient,
  senderId: string,
  receiverId: string,
): Promise<void> {
  const held = await tx.questHolder.count({
    where: { userId: senderId, quest: { holders: { some: { userId: receiverId } } } },
  });
  if (held === 0) {
    throw new ForbiddenException({
      statusCode: HttpStatus.FORBIDDEN,
      error: 'Forbidden',
      code: 'NOT_FELLOW_HOLDER',
      message: 'A Friend Request by user id goes only to a User who holds a Quest with you.',
    });
  }
}
