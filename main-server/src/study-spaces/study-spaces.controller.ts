/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Controller, Get } from '@nestjs/common';
import { CurrentUser, type SignedInUser } from '../common/current-user.decorator.js';
import { type StudyBuildingDto } from './dto/study-spaces.dto.js';
import { StudySpacesService } from './study-spaces.service.js';

// The 공부공간 layer: every building with its Study Spaces, each marked usable or not for the signed-in User.
@Controller('study-spaces')
export class StudySpacesController {
  constructor(private readonly studySpaces: StudySpacesService) {}

  @Get()
  list(@CurrentUser() user: SignedInUser): Promise<StudyBuildingDto[]> {
    return this.studySpaces.listFor(user.id);
  }
}
