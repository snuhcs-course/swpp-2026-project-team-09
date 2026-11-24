/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RequestLoggingInterceptor } from './request-logging.interceptor.js';

// Registers the logging interceptor globally. Imported after IdempotencyModule, so that the idempotency interceptor
// stays outermost (app.module.ts) and this one runs inside it.
@Module({ providers: [{ provide: APP_INTERCEPTOR, useClass: RequestLoggingInterceptor }] })
export class RequestLoggingModule {}
