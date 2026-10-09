// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #44
import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { SignalsService } from '../common/signals.service.js';
import { FriendsService } from '../friends/friends.service.js';
import { Meetup, MeetupState, Prisma } from '../generated/prisma/client.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { QuestsService } from '../quests/quests.service.js';
import { UsersService } from '../users/users.service.js';
import { MEETUP_INCLUDE, MeetupDto, MeetupsDto, ProposeMeetupDto, toMeetupDto } from './dto/meetups.dto.js';

const meetupNotFound = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'MEETUP_NOT_FOUND',
    message: 'No such Meetup is there for this User to answer.',
  });

@Injectable()
export class MeetupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly friends: FriendsService,
    private readonly quests: QuestsService,
    private readonly signals: SignalsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async propose(proposerId: string, { receiverId, ...content }: ProposeMeetupDto): Promise<MeetupDto> {
    const now = this.clock.now();
    if (new Date(content.startsAt) <= now) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        code: 'MEETUP_START_PASSED',
        message: 'A Meetup starts in the future.',
      });
    }
    const meetup = await this.changeBetween(proposerId, receiverId, async (tx) => {
      if (!(await this.friends.areFriends(proposerId, receiverId, tx))) {
        throw new NotFoundException({
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          code: 'FRIEND_NOT_FOUND',
          message: 'This User is not your Friend.',
        });
      }
      return tx.meetup.create({
        data: {
          proposerId,
          receiverId,
          ...(await this.quests.columnsOf(content, tx)),
          startsAt: new Date(content.startsAt),
        },
        include: MEETUP_INCLUDE,
      });
    });
    return toMeetupDto(meetup, now);
  }

  // The newest first.
  async list(userId: string): Promise<MeetupsDto> {
    const meetups = await this.prisma.meetup.findMany({
      where: { OR: [{ proposerId: userId }, { receiverId: userId }] },
      include: MEETUP_INCLUDE,
      orderBy: [{ proposedAt: 'desc' }, { id: 'asc' }],
    });
    const now = this.clock.now();
    const lists: MeetupsDto = { received: [], sent: [] };
    for (const meetup of meetups) {
      (meetup.proposerId === userId ? lists.sent : lists.received).push(toMeetupDto(meetup, now));
    }
    return lists;
  }

  // Gives both one Quest without a Global Event, with the Meetup's title and one Sub Quest built from it. The proposer,
  // the first Holder, leads it.
  async accept(userId: string, meetupId: string): Promise<void> {
    const meetup = await this.answer({ id: meetupId, receiverId: userId }, MeetupState.accepted, async (tx, stored) => {
      const { title, startsAt, endsAt, placeId, latitude, longitude, placeLabel } = stored;
      await this.quests.createWithSubQuest(
        { title, startsAt, endsAt, placeId, latitude, longitude, placeLabel },
        [stored.proposerId, stored.receiverId],
        tx,
      );
    });
    this.signals.send([meetup.proposerId, meetup.receiverId], 'quests-changed');
  }

  async decline(userId: string, meetupId: string): Promise<void> {
    await this.answer({ id: meetupId, receiverId: userId }, MeetupState.declined);
  }

  async withdraw(userId: string, meetupId: string): Promise<void> {
    await this.answer({ id: meetupId, proposerId: userId }, MeetupState.withdrawn);
  }

  // Moves the proposed Meetup that `where` finds to `state` and makes the change that goes with it. A Meetup whose
  // start has passed is expired and no longer proposed.
  private async answer(
    where: Prisma.MeetupWhereInput,
    state: MeetupState,
    change?: (tx: Prisma.TransactionClient, meetup: Meetup) => Promise<void>,
  ): Promise<Meetup> {
    const meetup = await this.prisma.meetup.findFirst({ where });
    if (meetup === null) {
      throw meetupNotFound();
    }
    await this.changeBetween(meetup.proposerId, meetup.receiverId, async (tx) => {
      const { count } = await tx.meetup.updateMany({
        where: { id: meetup.id, state: MeetupState.proposed, startsAt: { gt: this.clock.now() } },
        data: { state },
      });
      if (count === 0) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          code: 'MEETUP_NOT_PROPOSED',
          message: 'This Meetup was answered, withdrawn or has expired.',
        });
      }
      await change?.(tx, meetup);
    });
    return meetup;
  }

  // As every change between two Users, locks both in the order of their ids first, so that it runs after a friendship
  // between them ends or before. Tells both apps once the change is stored.
  private async changeBetween<T>(
    userId: string,
    otherUserId: string,
    change: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const result = await this.prisma.$transaction(async (tx) => {
      const [first, second] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
      await this.users.lock(first, tx);
      await this.users.lock(second, tx);
      return change(tx);
    });
    this.signals.send([userId, otherUserId], 'meetups-changed');
    return result;
  }
}
