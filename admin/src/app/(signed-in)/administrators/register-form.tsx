/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

'use client';

import { type ReactElement, useActionState, useState } from 'react';

import { registerAdministrator } from './actions';

export function RegisterForm(): ReactElement {
  const [refusal, registerAction, pending] = useActionState(registerAdministrator, null);
  const [invalid, setInvalid] = useState(false);
  const message = invalid ? 'Enter an email address, such as name@example.com.' : refusal;

  return (
    <form
      action={registerAction}
      noValidate
      onSubmit={(event) => {
        const valid = event.currentTarget.checkValidity();
        setInvalid(!valid);
        if (!valid) {
          event.preventDefault();
        }
      }}
      className="card space-y-3 p-4"
    >
      <h2>Register an Administrator</h2>
      <label className="block text-sm font-medium text-zinc-700" htmlFor="email">
        Email address
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="name@example.com"
          className="input w-full max-w-sm"
        />
        <button type="submit" disabled={pending} className="button button-primary">
          Register
        </button>
      </div>
      {message !== null && !pending && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}
