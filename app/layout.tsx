import type { Metadata, Viewport } from 'next';
import { fontVariables } from './fonts';
import { site } from '@/data/site';
import { Providers } from '@/engine/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: site.neutralTitle,
  description: site.description,
  openGraph: { title: site.neutralTitle, description: site.description },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
