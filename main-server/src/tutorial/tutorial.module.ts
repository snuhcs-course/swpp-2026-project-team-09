/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { readTutorialContent, TUTORIAL_FILE, TUTORIAL_FILE_PATH } from './tutorial-content.js';
import { TutorialController } from './tutorial.controller.js';
import { TUTORIAL_CONTENT, TutorialService } from './tutorial.service.js';

// The content is read once, when the server starts; a bad file stops the start. A test gives another file by
// overriding TUTORIAL_FILE_PATH.
@Module({
  imports: [UsersModule],
  controllers: [TutorialController],
  providers: [
    { provide: TUTORIAL_FILE_PATH, useValue: TUTORIAL_FILE },
    { provide: TUTORIAL_CONTENT, useFactory: readTutorialContent, inject: [TUTORIAL_FILE_PATH] },
    TutorialService,
  ],
  exports: [TutorialService],
})
export class TutorialModule {}
