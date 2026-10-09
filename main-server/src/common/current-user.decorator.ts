/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-09-30  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

// The User and the session an access token names. AccessTokenGuard puts them on the request.
export interface SignedInUser {
  readonly id: string;
  readonly sessionId: string;
}

export interface SignedInRequest extends Request {
  user: SignedInUser;
}

// The signed-in User, as a handler parameter: `me(@CurrentUser() user: SignedInUser)`.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SignedInUser =>
    context.switchToHttp().getRequest<SignedInRequest>().user,
);
