import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

// The User an access token names. AccessTokenGuard puts it on the request.
export interface SignedInUser {
  readonly id: string;
}

export interface SignedInRequest extends Request {
  user: SignedInUser;
}

// The signed-in User, as a handler parameter: `me(@CurrentUser() user: SignedInUser)`.
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: Readonly<ExecutionContext>): SignedInUser =>
    context.switchToHttp().getRequest<SignedInRequest>().user,
);
