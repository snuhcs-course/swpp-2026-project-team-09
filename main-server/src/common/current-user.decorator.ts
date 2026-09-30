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
