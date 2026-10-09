// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by fyoon46, reviewed by TaeHyun79 in #14
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
