/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Settings } from '../common/settings.js';
import { UsersModule } from '../users/users.module.js';
import {
  readTutorialContent,
  servedContent,
  TUTORIAL_FILE,
  TUTORIAL_FILE_PATH,
  type TutorialContent,
} from './tutorial-content.js';
import { TutorialController } from './tutorial.controller.js';
import { TUTORIAL_CONTENT, TutorialService } from './tutorial.service.js';

// The content is read once, when the server starts; a bad file stops the start. A test gives another file by
// overriding TUTORIAL_FILE_PATH. Unless LIBRARY_BOOKING_ENABLED and TUTORIAL_KWANJEONG_CHECK are both on, the 관정 quest
// is served as a button quest.
@Module({
  imports: [UsersModule],
  controllers: [TutorialController],
  providers: [
    { provide: TUTORIAL_FILE_PATH, useValue: TUTORIAL_FILE },
    {
      provide: TUTORIAL_CONTENT,
      inject: [TUTORIAL_FILE_PATH, ConfigService],
      useFactory: async (file: string, settings: ConfigService<Settings, true>): Promise<TutorialContent> =>
        servedContent(await readTutorialContent(file), {
          libraryBooking: settings.get('LIBRARY_BOOKING_ENABLED', { infer: true }),
          kwanjeongCheck: settings.get('TUTORIAL_KWANJEONG_CHECK', { infer: true }),
        }),
    },
    TutorialService,
  ],
  exports: [TutorialService],
})
export class TutorialModule {}
