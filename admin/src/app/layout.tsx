/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'SNU Now Admin',
};

export default function RootLayout({ children }: LayoutProps<'/'>): ReactElement {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
