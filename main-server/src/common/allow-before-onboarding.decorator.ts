// AI-generated with Claude Opus 5.5, 2026-10-01, prompted by fyoon46, reviewed by TaeHyun79 in #18
import { CustomDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

const ALLOW_BEFORE_ONBOARDING = 'allowBeforeOnboarding';

// Opens a User's route, or every route of a controller, to a User who has not finished onboarding.
export const AllowBeforeOnboarding = (): CustomDecorator => SetMetadata(ALLOW_BEFORE_ONBOARDING, true);

export function allowsBeforeOnboarding(reflector: Reflector, context: ExecutionContext): boolean {
  return (
    reflector.getAllAndOverride<boolean | undefined>(ALLOW_BEFORE_ONBOARDING, [
      context.getHandler(),
      context.getClass(),
    ]) === true
  );
}
