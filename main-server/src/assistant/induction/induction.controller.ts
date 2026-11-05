/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { z } from 'zod';
import { WorkerOnly } from '../../common/worker-only.decorator.js';
import { type InductionReport, InductionService } from './induction.service.js';

const runSchema = z.object({ wait: z.boolean().default(false) });

type Run = z.infer<typeof runSchema>;

// `POST /assistant/induction` with the worker token (P07 ticket 07): one induction run on this server. The worker's
// schedule sends `{}` once a night and gets `{ "started": true }` at once; `{ "wait": true }` answers with the run's
// report once it is over, for the tests and for a person running it by hand.
@Controller('assistant')
export class InductionController {
  private readonly logger = new Logger(InductionController.name);

  constructor(private readonly induction: InductionService) {}

  @Post('induction')
  @WorkerOnly()
  @HttpCode(HttpStatus.OK)
  run(@Body({ schema: runSchema }) { wait }: Run): Promise<InductionReport | { started: true }> {
    const running = this.induction.run();
    if (wait) {
      return running;
    }
    running.catch((error: unknown) => {
      this.logger.warn(`The induction failed: ${error instanceof Error ? error.message : String(error)}`);
    });
    return Promise.resolve({ started: true });
  }
}
