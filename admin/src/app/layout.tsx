// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-09-29 to 2026-10-08, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #15
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
