import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

// The Administrator an Administrator's access token names. AdministratorGuard puts it on the request.
export interface SignedInAdministrator {
  readonly id: string;
}

export interface SignedInAdministratorRequest extends Request {
  administrator: SignedInAdministrator;
}

// The signed-in Administrator, as a handler parameter on an administrative route:
// `signOut(@CurrentAdministrator() administrator: SignedInAdministrator)`.
export const CurrentAdministrator = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SignedInAdministrator =>
    context.switchToHttp().getRequest<SignedInAdministratorRequest>().administrator,
);
