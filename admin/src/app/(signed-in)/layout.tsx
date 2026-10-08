import type { ReactElement, ReactNode } from 'react';

import { signedInEmail } from '@/session';

import { SiteMenu } from './site-menu';

export default async function SignedInLayout({ children }: { children: ReactNode }): Promise<ReactElement> {
  return (
    <div className="min-h-screen md:flex">
      <SiteMenu email={await signedInEmail()} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
