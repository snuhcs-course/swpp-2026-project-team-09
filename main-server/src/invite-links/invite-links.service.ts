/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  BadRequestException,
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../common/prisma.service.js';
import { Settings } from '../common/settings.js';
import { toUserSummaryDto } from '../friends/dto/friends.dto.js';
import { FriendsService } from '../friends/friends.service.js';
import { InviteLink } from '../generated/prisma/client.js';
import { CreatedInviteLinkDto, InviteLinkDto, InviteLinkStatus } from './dto/invite-links.dto.js';

const LIFETIME_MS = 24 * 60 * 60 * 1000;

// 32 random bytes cannot be guessed, so a fast hash is enough to keep the stored copy useless to a reader.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

type Unusable = Extract<InviteLinkStatus, 'own' | 'used' | 'expired'>;

// What keeps the User from accepting the link, read from the link alone. Being the sender's Friend is asked apart.
function unusable(link: InviteLink, userId: string): Unusable | null {
  if (link.senderId === userId) {
    return 'own';
  }
  if (link.usedAt !== null) {
    return 'used';
  }
  if (link.expiresAt.getTime() <= Date.now()) {
    return 'expired';
  }
  return null;
}

const refusals: Record<Unusable, () => HttpException> = {
  own: () =>
    new BadRequestException({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      code: 'OWN_INVITE_LINK',
      message: 'This is your own Invite Link.',
    }),
  used: () =>
    new ConflictException({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      code: 'INVITE_LINK_USED',
      message: 'This Invite Link has been used.',
    }),
  expired: () =>
    new GoneException({
      statusCode: HttpStatus.GONE,
      error: 'Gone',
      code: 'INVITE_LINK_EXPIRED',
      message: 'This Invite Link has expired.',
    }),
};

@Injectable()
export class InviteLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly friends: FriendsService,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  async create(senderId: string): Promise<CreatedInviteLinkDto> {
    const token = randomBytes(32).toString('base64url');
    const { expiresAt } = await this.prisma.inviteLink.create({
      data: { senderId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + LIFETIME_MS) },
    });
    return {
      url: `${this.settings.get('PUBLIC_URL', { infer: true })}/invite/${token}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async lookUp(userId: string, token: string): Promise<InviteLinkDto> {
    const link = await this.linkOf(token);
    const status =
      unusable(link, userId) ?? ((await this.friends.areFriends(link.senderId, userId)) ? 'friend' : 'usable');
    return { sender: toUserSummaryDto(link.sender), status };
  }

  async accept(userId: string, token: string): Promise<void> {
    const link = await this.linkOf(token);
    const status = unusable(link, userId);
    if (status !== null) {
      throw refusals[status]();
    }
    await this.friends.befriend(link.senderId, userId, async (tx) => {
      // Another User may have accepted it since it was read.
      const { count } = await tx.inviteLink.updateMany({
        where: { id: link.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (count === 0) {
        throw refusals.used();
      }
    });
  }

  private async linkOf(token: string): Promise<InviteLink & { sender: { name: string; department: string } }> {
    const link = await this.prisma.inviteLink.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { sender: { select: { name: true, department: true } } },
    });
    if (link === null) {
      throw new NotFoundException({
        statusCode: HttpStatus.NOT_FOUND,
        error: 'Not Found',
        code: 'INVITE_LINK_NOT_FOUND',
        message: 'Nobody made this Invite Link.',
      });
    }
    return link;
  }
}
