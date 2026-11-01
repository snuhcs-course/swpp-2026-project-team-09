/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type CompleteQuestDto, completeQuestSchema, TutorialDto } from './dto/tutorial.dto.js';
import { TutorialService } from './tutorial.service.js';

// The signed-in User's 새내기 튜토리얼. The routes name no User, so they never reach another User's progress. Every
// POST is safe to repeat, so none takes an Idempotency-Key, and each answers as GET /tutorial does.
@Controller('tutorial')
export class TutorialController {
  constructor(private readonly tutorial: TutorialService) {}

  @Get()
  read(@CurrentUser() user: SignedInUser): Promise<TutorialDto> {
    return this.tutorial.read(user.id);
  }

  // 진행하기 in 내 정보.
  @Post('enable')
  @HttpCode(HttpStatus.OK)
  enable(@CurrentUser() user: SignedInUser): Promise<TutorialDto> {
    return this.tutorial.enable(user.id);
  }

  // 튜토리얼 그만하기, and 끄기 in 내 정보.
  @Post('stop')
  @HttpCode(HttpStatus.OK)
  stop(@CurrentUser() user: SignedInUser): Promise<TutorialDto> {
    return this.tutorial.stop(user.id);
  }

  // The ✕ of the 내 정보 row while the tutorial is off.
  @Post('hide-row')
  @HttpCode(HttpStatus.OK)
  hideRow(@CurrentUser() user: SignedInUser): Promise<TutorialDto> {
    return this.tutorial.hideRow(user.id);
  }

  @Post('quests/:key/start')
  @HttpCode(HttpStatus.OK)
  start(@CurrentUser() user: SignedInUser, @Param('key') key: string): Promise<TutorialDto> {
    return this.tutorial.start(user.id, key);
  }

  @Post('quests/:key/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @CurrentUser() user: SignedInUser,
    @Param('key') key: string,
    @Body({ schema: completeQuestSchema }) { by }: CompleteQuestDto,
  ): Promise<TutorialDto> {
    return this.tutorial.complete(user.id, key, by);
  }
}
