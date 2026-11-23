import { Bodoni_Moda, Cormorant_Garamond, Inter, Space_Grotesk } from 'next/font/google';

/** Intimate voice: letters, memories, emotional lines, italic emphasis. */
export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant-src',
  display: 'swap',
});

/** Editorial monuments: her name, big statements. */
export const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-bodoni-src',
  display: 'swap',
});

/** Technical / creative labels. */
export const grotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk-src',
  display: 'swap',
});

/** UI text. */
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter-src',
  display: 'swap',
});

export const fontVariables = [cormorant.variable, bodoni.variable, grotesk.variable, inter.variable].join(' ');
