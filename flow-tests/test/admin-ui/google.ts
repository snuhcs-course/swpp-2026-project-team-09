/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { BrowserContext } from 'playwright';
import { administratorIdToken } from '../people.js';

// The script the sign-in page loads (admin/src/app/sign-in/google-sign-in.tsx).
export const GOOGLE_SCRIPT = 'https://accounts.google.com/gsi/client';

// Google Identity Services as the sign-in page uses it: `initialize` keeps the callback, and `renderButton` draws a
// button that hands it the ID token, as Google's does once a person has chosen an account.
function standIn(idToken: string): string {
  return `(() => {
  let callback;
  window.google = {
    accounts: {
      id: {
        initialize: (options) => {
          callback = options.callback;
        },
        renderButton: (parent) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = 'Sign in with Google';
          button.addEventListener('click', () => {
            callback({ credential: ${JSON.stringify(idToken)} });
          });
          parent.append(button);
        },
      },
    },
  };
})();
`;
}

// Answers Google's script with the stand-in, whose button signs the Administrator in.
export async function standInForGoogle(context: BrowserContext): Promise<void> {
  await context.route(GOOGLE_SCRIPT, (route) =>
    route.fulfill({ contentType: 'text/javascript', body: standIn(administratorIdToken()) }),
  );
}
