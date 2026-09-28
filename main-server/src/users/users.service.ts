import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { User } from '../generated/prisma/client.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // A User is identified by the Google subject identifier. The email address follows the one Google sends.
  findOrCreate(googleSubject: string, email: string): Promise<User> {
    return this.prisma.user.upsert({ where: { googleSubject }, create: { googleSubject, email }, update: { email } });
  }

  findById(id: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { id } });
  }
}
