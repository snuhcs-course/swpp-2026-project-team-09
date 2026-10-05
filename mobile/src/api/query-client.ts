import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './errors';

// A question that got no answer, or a failure of the main server's own, is asked once more before a screen is told.
// A refusal, such as 403 ONBOARDING_REQUIRED, would be refused again and is told at once.
function retry(failures: number, error: Error): boolean {
  const refused = error instanceof ApiError && error.status >= 400 && error.status < 500;
  return !refused && failures < 1;
}

// One per start of the app.
export function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry } } });
}
