/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MainServer } from '../common/main-server.js';

// 04:00, when nobody is asking the Assistant.
const INDUCTION_TIME = '0 0 4 * * *';

// Starts the main server's nightly induction of matching rules (P07 ticket 07, the main server's README: Assistant):
// one request, which reaches one main server however many run, and which that server answers at once and works on.
@Injectable()
export class InductionTrigger {
  private readonly logger = new Logger(InductionTrigger.name);

  constructor(private readonly mainServer: MainServer) {}

  @Cron(INDUCTION_TIME, { timeZone: 'Asia/Seoul' })
  async start(): Promise<boolean> {
    try {
      await this.mainServer.send('/assistant/induction', {});
      return true;
    } catch (error) {
      this.logger.error(`The induction was not started: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}
