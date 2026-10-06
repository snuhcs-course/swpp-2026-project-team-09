import { screen, within } from '@testing-library/react';

import SignedInLayout from '@/app/(signed-in)/layout';
import AdministratorsPage from '@/app/(signed-in)/administrators/page';
import EventPage from '@/app/(signed-in)/events/[id]/page';
import EventsPage from '@/app/(signed-in)/page';
import SignInPage from '@/app/sign-in/page';
import { EMAIL_COOKIE, SESSION_COOKIE } from '@/session';

import { browser, openPage } from './browser';
import { fakeMainServer } from './fake-main-server';

export async function openAdministrators(): Promise<void> {
  // Both are async Server Components, which React in jsdom cannot render, so each is called as Next.js would.
  await openPage(async () => SignedInLayout({ children: await AdministratorsPage() }));
}

export async function openEvents(): Promise<void> {
  await openPage(async () => SignedInLayout({ children: await EventsPage() }));
}

export async function openEvent(id: string): Promise<void> {
  await openPage(async () =>
    SignedInLayout({
      children: await EventPage({ params: Promise.resolve({ id }), searchParams: Promise.resolve({}) }),
    }),
  );
}

export async function openSignIn(location: string): Promise<void> {
  const searchParams = Promise.resolve(Object.fromEntries(new URL(location, 'http://admin.test').searchParams));
  await openPage(() => SignInPage({ params: Promise.resolve({}), searchParams }));
}

export function signInAs(email: string): string {
  const token = fakeMainServer.signedInAs(email);
  browser.cookies.set(SESSION_COOKIE, token);
  browser.cookies.set(EMAIL_COOKIE, email);
  return token;
}

// Each row of the table named `name`, as the text of its cells.
export function rowsOf(name: string): (string | null)[][] {
  return within(screen.getByRole('table', { name }))
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    );
}

// Each Administrator in the table as [email address, whether signed in].
export function listed(): (string | null)[][] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) =>
      within(row)
        .getAllByRole('cell')
        .slice(0, 2)
        .map((cell) => cell.textContent),
    );
}

export function removeButtonOf(email: string): HTMLElement {
  const row = screen.getByRole('row', { name: (name) => name.startsWith(`${email} `) });
  return within(row).getByRole('button', { name: 'Remove' });
}
