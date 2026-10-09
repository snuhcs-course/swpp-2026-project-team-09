/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

// AdministratorGuard puts it on the request.
export interface SignedInAdministrator {
  readonly id: string;
}

export interface SignedInAdministratorRequest extends Request {
  administrator: SignedInAdministrator;
}

export const CurrentAdministrator = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SignedInAdministrator =>
    context.switchToHttp().getRequest<SignedInAdministratorRequest>().administrator,
);
