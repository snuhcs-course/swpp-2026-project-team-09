'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactElement, useState } from 'react';

import { signOut } from './actions';

// A section of the site is one entry here and one route under (signed-in); its pages live under `href` or `under`.
const SECTIONS = [
  { href: '/', under: '/events', label: 'Events' },
  { href: '/places', under: '/places', label: 'Places' },
  { href: '/users', under: '/users', label: 'Users' },
  { href: '/collection', under: '/collection', label: 'Collection status' },
  { href: '/administrators', under: '/administrators', label: 'Administrators' },
];

function isCurrent(pathname: string | null, { href, under }: (typeof SECTIONS)[number]): boolean {
  return pathname === href || pathname === under || (pathname?.startsWith(`${under}/`) ?? false);
}

function SignedIn({ email }: { email: string | undefined }): ReactElement {
  return (
    <div className="mt-auto space-y-3 border-t border-zinc-200 p-4">
      {email !== undefined && (
        <p className="truncate text-sm text-zinc-600" title={email}>
          {email}
        </p>
      )}
      <form action={signOut}>
        <button type="submit" className="button w-full">
          Sign out
        </button>
      </form>
    </div>
  );
}

// The menu on the left; under the md breakpoint, a top bar whose button opens it.
export function SiteMenu({ email }: { email: string | undefined }): ReactElement {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <aside className="border-b border-zinc-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          SNU Now <span className="text-accent">Admin</span>
        </Link>
        <button
          type="button"
          className="button md:hidden"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => {
            setOpen(!open);
          }}
        >
          Menu
        </button>
      </div>
      <div id="site-menu" className={`${open ? 'flex' : 'hidden'} flex-1 flex-col md:flex`}>
        <nav aria-label="Sections" className="flex flex-col gap-1 px-3 py-2">
          {SECTIONS.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              aria-current={isCurrent(pathname, section) ? 'page' : undefined}
              onClick={() => {
                setOpen(false);
              }}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 aria-[current=page]:bg-accent-soft aria-[current=page]:text-accent-strong"
            >
              {section.label}
            </Link>
          ))}
        </nav>
        <SignedIn email={email} />
      </div>
    </aside>
  );
}
