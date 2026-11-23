/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { fireEvent, screen, within } from '@testing-library/react';

import { browser } from './support/browser';
import { fakeMainServer } from './support/fake-main-server';
import { openLogTest, signInAs } from './support/pages';

const SENT = 'Sent. warn and error go to the Slack channel, info stays in the server logs.';

beforeEach(() => {
  fakeMainServer.hasAdministrators('kim@snu.ac.kr');
});

describe('the Log test page', () => {
  it('shows a button for each level', async () => {
    signInAs('kim@snu.ac.kr');
    await openLogTest();

    expect(
      screen
        .getAllByRole('button')
        .map((button) => button.textContent)
        .filter((text) => text !== 'Menu' && text !== 'Sign out'),
    ).toEqual(['info', 'warn', 'error']);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('is the last entry of the menu', async () => {
    signInAs('kim@snu.ac.kr');
    await openLogTest();

    const links = within(screen.getByRole('navigation', { name: 'Sections' })).getAllByRole('link');
    expect(links.at(-1)).toHaveTextContent('Log test');
    expect(links.at(-1)).toHaveAttribute('href', '/log-test');
  });

  it('sends a person without a session to sign in', async () => {
    await openLogTest();

    expect(browser.location).toBe('/sign-in?next=%2Flog-test');
  });
});

describe('a press', () => {
  it("on warn sends warn with the Administrator's token, and says it was sent and where each level goes", async () => {
    const token = signInAs('kim@snu.ac.kr');
    await openLogTest();

    fireEvent.click(screen.getByRole('button', { name: 'warn' }));

    expect(await screen.findByRole('status')).toHaveTextContent(SENT);
    expect(fakeMainServer.requests).toContain('POST /admin/log-test');
    expect(fakeMainServer.testLines).toEqual([{ token, level: 'warn' }]);
  });

  it.each(['info', 'error'])('on %s sends %s', async (level) => {
    const token = signInAs('kim@snu.ac.kr');
    await openLogTest();

    fireEvent.click(screen.getByRole('button', { name: level }));

    expect(await screen.findByRole('status')).toHaveTextContent(SENT);
    expect(fakeMainServer.testLines).toEqual([{ token, level }]);
  });

  it("refused shows the main server's message, and no Sent line", async () => {
    // As when the admin site is Released before the main server that has the route.
    fakeMainServer.refusesTestLines(404, 'Cannot POST /admin/log-test');
    signInAs('kim@snu.ac.kr');
    await openLogTest();

    fireEvent.click(screen.getByRole('button', { name: 'error' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot POST /admin/log-test');
    expect(screen.queryByText(SENT)).toBeNull();
  });

  it('after the session ended sends the person to sign in and back to this page', async () => {
    const token = signInAs('kim@snu.ac.kr');
    await openLogTest();
    // As when the Administrator signed out in another browser.
    await fakeMainServer.signOut(token);

    fireEvent.click(screen.getByRole('button', { name: 'warn' }));

    await vi.waitFor(() => {
      expect(browser.location).toBe('/sign-in?next=%2Flog-test');
    });
    expect(fakeMainServer.testLines).toEqual([]);
  });
});
