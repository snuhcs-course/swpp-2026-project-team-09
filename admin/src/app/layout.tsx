import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'SNU Now Admin',
};

export default function RootLayout({ children }: LayoutProps<'/'>): ReactElement {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
