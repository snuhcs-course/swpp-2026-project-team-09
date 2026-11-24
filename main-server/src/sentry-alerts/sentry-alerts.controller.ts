/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { type Request } from 'express';
import { Public } from '../common/public.decorator.js';
import { CrashAlertsService } from './crash-alerts.service.js';

// Open without an access token, since Sentry has none of ours: the signature of each request stands for it
// (README.md: Crash alerts from Sentry).
@Public()
@Controller('sentry/alerts')
export class SentryAlertsController {
  constructor(private readonly alerts: CrashAlertsService) {}

  // The body arrives as the bytes Sentry signed (src/common/json-body-limit.ts). Answered 200 once the signature
  // holds, whatever becomes of the post, so that Sentry does not send the alert again.
  @Post()
  @HttpCode(HttpStatus.OK)
  take(
    @Req() request: Request,
    @Headers('sentry-hook-signature') signature: string | undefined,
    @Headers('sentry-hook-resource') resource: string | undefined,
  ): void {
    if (!this.alerts.enabled) {
      throw new NotFoundException();
    }
    const body: unknown = request.body;
    const bytes = Buffer.isBuffer(body) ? body : Buffer.alloc(0);
    if (!this.alerts.signedBySentry(bytes, signature)) {
      throw new UnauthorizedException();
    }
    this.alerts.take(resource, bytes);
  }
}
