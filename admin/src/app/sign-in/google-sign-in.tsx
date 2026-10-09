// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
'use client';

import { type ReactElement, useActionState, useEffect, useRef } from 'react';

import { signIn } from './actions';

interface GoogleIdentity {
  initialize: (options: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    ux_mode: 'popup';
    auto_select: false;
  }) => void;
  renderButton: (parent: HTMLElement, options: { theme: 'outline'; size: 'large'; text: 'signin_with' }) => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdentity } };
  }
}

function loadGoogle(): Promise<GoogleIdentity> {
  return new Promise((resolve) => {
    if (window.google !== undefined) {
      resolve(window.google.accounts.id);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.addEventListener('load', () => {
      if (window.google !== undefined) {
        resolve(window.google.accounts.id);
      }
    });
    document.head.append(script);
  });
}

// Google's button hands back an ID token, which the form posts to the sign-in Server Action. One Tap would need
// google.accounts.id.prompt(), which is never called.
export function GoogleSignIn({ next }: { next: string }): ReactElement {
  const [message, signInAction, pending] = useActionState(signIn, null);
  const form = useRef<HTMLFormElement>(null);
  const credential = useRef<HTMLInputElement>(null);
  const button = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadGoogle().then((identity) => {
      identity.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
        ux_mode: 'popup',
        auto_select: false,
        callback: (response) => {
          if (credential.current !== null && form.current !== null) {
            credential.current.value = response.credential;
            form.current.requestSubmit();
          }
        },
      });
      if (button.current !== null) {
        identity.renderButton(button.current, { theme: 'outline', size: 'large', text: 'signin_with' });
      }
    });
  }, []);

  return (
    <form ref={form} action={signInAction} className="flex flex-col items-center gap-4">
      <input type="hidden" name="next" value={next} />
      <input ref={credential} type="hidden" name="credential" />
      <div ref={button} />
      {pending && <p className="text-sm text-zinc-600">Signing in…</p>}
      {message !== null && !pending && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}
