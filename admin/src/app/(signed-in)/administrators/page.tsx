/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';

import { mainServer } from '@/main-server';
import { asAdministrator } from '@/session';

import { AdministratorList } from './administrator-list';
import { RegisterForm } from './register-form';

export default async function AdministratorsPage(): Promise<ReactElement> {
  const administrators = await asAdministrator('/administrators', (token) => mainServer.listAdministrators(token));
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1>Administrators</h1>
        <p className="text-sm text-zinc-600">
          Anyone with a registered Google account can sign in to this site. The last Administrator cannot be removed.
        </p>
      </header>
      <RegisterForm />
      <AdministratorList administrators={administrators} />
    </div>
  );
}
