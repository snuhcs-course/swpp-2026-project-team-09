'use client';

import { type ReactElement, useActionState } from 'react';

import type { Administrator } from '@/main-server';

import { removeAdministrator } from './actions';

interface RemoveFormProps {
  id: string;
  email: string;
  action: (form: FormData) => void;
  pending: boolean;
}

function RemoveForm({ id, email, action, pending }: RemoveFormProps): ReactElement {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Remove ${email}? They will no longer be able to sign in.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="button button-danger">
        Remove
      </button>
    </form>
  );
}

export function AdministratorList({ administrators }: { administrators: Administrator[] }): ReactElement {
  const [message, removeAction, pending] = useActionState(removeAdministrator, null);

  return (
    <section className="space-y-3">
      {message !== null && !pending && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {message}
        </p>
      )}
      <div className="card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Email address</th>
              <th>Signed in</th>
              <th>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {administrators.map(({ id, email, signedIn }) => (
              <tr key={id}>
                <td className="font-medium">{email}</td>
                <td className={signedIn ? 'text-zinc-700' : 'text-zinc-500'}>
                  {signedIn ? 'Signed in' : 'Not yet signed in'}
                </td>
                <td className="text-right">
                  <RemoveForm id={id} email={email} action={removeAction} pending={pending} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
