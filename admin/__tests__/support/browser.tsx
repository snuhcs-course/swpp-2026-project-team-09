import { act, cleanup, render } from '@testing-library/react';
import { Component, type ReactElement, type ReactNode } from 'react';

import { NotFound } from './not-found';
import { Redirect } from './redirect';

// Stands in for what Next.js does around a page in these tests: the request's cookies, redirect(), notFound() and
// refresh().

export const browser: { cookies: Map<string, string>; location: string | undefined; notFound: boolean } = {
  cookies: new Map(),
  location: undefined,
  notFound: false,
};

interface Named {
  name: string;
  value?: string;
}

export const cookieStore = {
  get: (name: string): Named | undefined => {
    const value = browser.cookies.get(name);
    return value === undefined ? undefined : { name, value };
  },
  set: (cookie: string | Named, value?: string): void => {
    if (typeof cookie === 'string') {
      browser.cookies.set(cookie, value ?? '');
    } else {
      browser.cookies.set(cookie.name, cookie.value ?? '');
    }
  },
  delete: (cookie: string | Named): void => {
    browser.cookies.delete(typeof cookie === 'string' ? cookie : cookie.name);
  },
};

let reload: (() => Promise<void>) | undefined;

export function refreshPage(): void {
  setTimeout(() => void reload?.(), 0);
}

export function resetBrowser(): void {
  cleanup();
  browser.cookies.clear();
  browser.location = undefined;
  browser.notFound = false;
  reload = undefined;
  window.google = undefined;
}

class Navigation extends Component<{ children: ReactNode }, { error?: Error }> {
  override state: { error?: Error } = {};

  static getDerivedStateFromError(error: unknown): { error: Error } {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  override render(): ReactNode {
    if (this.state.error === undefined) {
      return this.props.children;
    }
    if (this.state.error instanceof Redirect) {
      browser.location = this.state.error.location;
      return null;
    }
    throw this.state.error;
  }
}

async function load(page: () => Promise<ReactElement>): Promise<ReactElement | null> {
  try {
    return await page();
  } catch (error) {
    if (error instanceof Redirect) {
      browser.location = error.location;
      return null;
    }
    if (error instanceof NotFound) {
      browser.notFound = true;
      return null;
    }
    throw error;
  }
}

// Renders a page as Next.js would on a request, and again whenever a Server Action calls refresh().
export async function openPage(page: () => Promise<ReactElement>): Promise<void> {
  const view = render(<Navigation>{await load(page)}</Navigation>, {
    onCaughtError: () => {
      // A redirect caught by Navigation is how a Server Action ends here, not a failure to report.
    },
  });
  reload = async (): Promise<void> => {
    const element = await load(page);
    act(() => {
      view.rerender(<Navigation>{element}</Navigation>);
    });
  };
}
