/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

'use client';

import { type ReactElement, useActionState } from 'react';

import { writeTestLine } from './actions';

const LEVELS = ['info', 'warn', 'error'] as const;

export function LogTestButtons(): ReactElement {
  const [answer, writeAction, pending] = useActionState(writeTestLine, null);

  return (
    <form action={writeAction} className="card space-y-3 p-4">
      <div className="flex flex-wrap gap-2">
        {LEVELS.map((level) => (
          <button key={level} type="submit" name="level" value={level} disabled={pending} className="button">
            {level}
          </button>
        ))}
      </div>
      {answer !== null &&
        !pending &&
        (answer.sent ? (
          <p role="status" className="text-sm text-zinc-700">
            Sent. warn and error go to the Slack channel, info stays in the server logs.
          </p>
        ) : (
          <p role="alert" className="text-sm text-red-700">
            {answer.refusal}
          </p>
        ))}
    </form>
  );
}
