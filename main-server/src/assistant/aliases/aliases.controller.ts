/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, type SignedInUser } from '../../common/current-user.decorator.js';
import { type AliasesDto, type AliasRejection, aliasRejectionSchema } from './aliases.dto.js';
import { AliasesService } from './aliases.service.js';

// The words the User taught the Assistant (P07 ticket 03): 내가 가르친 말 and 아니에요.
@Controller('assistant/aliases')
export class AliasesController {
  constructor(private readonly aliases: AliasesService) {}

  @Get()
  async list(@CurrentUser() user: SignedInUser): Promise<AliasesDto> {
    return { aliases: await this.aliases.listMine(user.id) };
  }

  // A repeat is refused as not found, as the alias is gone.
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@CurrentUser() user: SignedInUser, @Param('id', { schema: z.uuid() }) id: string): Promise<void> {
    return this.aliases.deleteMine(user.id, id);
  }

  // A repeat records the rejection again, which still counts the account once.
  @Post('reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  reject(
    @CurrentUser() user: SignedInUser,
    @Body({ schema: aliasRejectionSchema }) { kind, words, targetId }: AliasRejection,
  ): Promise<void> {
    return this.aliases.reject(user.id, kind, words, targetId);
  }
}
