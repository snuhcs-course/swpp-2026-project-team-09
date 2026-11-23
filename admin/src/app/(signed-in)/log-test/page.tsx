/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';

import { asAdministrator } from '@/session';

import { LogTestButtons } from './log-test-buttons';

export default async function LogTestPage(): Promise<ReactElement> {
  // The page reads nothing from the main server, but a person without a session still goes to sign in first.
  await asAdministrator('/log-test', () => Promise.resolve());
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1>Log test</h1>
        <p className="text-sm text-zinc-600">
          Each button writes one test line at its level in the main server&apos;s log, naming you by your Administrator
          ID. It changes nothing else.
        </p>
      </header>
      <LogTestButtons />
    </div>
  );
}
