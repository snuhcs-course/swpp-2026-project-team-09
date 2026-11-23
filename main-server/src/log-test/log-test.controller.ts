/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { AdministratorOnly } from '../common/administrator-only.decorator.js';
import { CurrentAdministrator, type SignedInAdministrator } from '../common/current-administrator.decorator.js';
import { type LogTestDto, logTestSchema } from './dto/log-test.dto.js';

// Lets an Administrator check, from the admin site's Log test page, that warnings and errors reach the Slack channel
// (README.md: Logging) without breaking anything.
@AdministratorOnly()
@Controller('admin/log-test')
export class LogTestController {
  private readonly logger = new Logger(LogTestController.name);

  // Writes one line at the level and changes nothing else, so a repeat needs no Idempotency-Key.
  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  write(
    @Body({ schema: logTestSchema }) { level }: LogTestDto,
    @CurrentAdministrator() { id }: SignedInAdministrator,
  ): void {
    const by = `from the admin site, by Administrator ${id}`;
    switch (level) {
      case 'info':
        this.logger.log(`A test info line ${by}`);
        break;
      case 'warn':
        this.logger.warn(`A test warning ${by}`);
        break;
      case 'error':
        this.logger.error(`A test error ${by}`);
        break;
    }
  }
}
