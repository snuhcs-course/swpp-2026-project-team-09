import { ConflictException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { MatchingRequest, Prisma } from '../generated/prisma/client.js';
import { type AskDto, MatchingRequestDto, toMatchingRequestDto } from './dto/matching-request.dto.js';

const requestNotFound = (): NotFoundException =>
  new NotFoundException({
    statusCode: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    code: 'MATCHING_REQUEST_NOT_FOUND',
    message: 'The User has made no request for Matching on this Global Event.',
  });

@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  // The unique index on the waiting requests refuses a second one, also when two arrive at the same moment.
  async ask(userId: string, { globalEventId, size, hashtags }: AskDto): Promise<MatchingRequestDto> {
    try {
      const request = await this.prisma.matchingRequest.create({ data: { userId, globalEventId, size, hashtags } });
      return toMatchingRequestDto(request);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          error: 'Conflict',
          code: 'MATCHING_REQUEST_WAITING',
          message: "The User's request for Matching on this Global Event is waiting already.",
        });
      }
      throw error;
    }
  }

  async withdraw(userId: string, globalEventId: string): Promise<void> {
    const { count } = await this.prisma.matchingRequest.updateMany({
      where: { userId, globalEventId, state: 'waiting' },
      data: { state: 'withdrawn' },
    });
    if (count === 0) {
      await this.latest(userId, globalEventId);
      throw new ConflictException({
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        code: 'MATCHING_REQUEST_NOT_WAITING',
        message: 'Only a waiting request can be withdrawn.',
      });
    }
  }

  async read(userId: string, globalEventId: string): Promise<MatchingRequestDto> {
    return toMatchingRequestDto(await this.latest(userId, globalEventId));
  }

  async listOpen(userId: string): Promise<MatchingRequestDto[]> {
    const requests = await this.prisma.matchingRequest.findMany({
      where: { userId, state: 'waiting' },
      orderBy: { arrivedAt: 'asc' },
    });
    return requests.map((request) => toMatchingRequestDto(request));
  }

  // A User asks again once a request no longer waits, so the latest is the one that counts.
  private async latest(userId: string, globalEventId: string): Promise<MatchingRequest> {
    const request = await this.prisma.matchingRequest.findFirst({
      where: { userId, globalEventId },
      orderBy: { arrivedAt: 'desc' },
    });
    if (request === null) {
      throw requestNotFound();
    }
    return request;
  }
}
