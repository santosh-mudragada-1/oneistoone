import type { Metadata, Viewport } from 'next';
import { Archivo, Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/* The wordmark is set in Inter and nothing else uses it — keeping it on its
   own face is what stops the logo drifting with the display type. */
const inter = Inter({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-inter',
});

/* Archivo carries a real wdth axis (62–125), so condensed and expanded
   settings are genuine widths rather than scaled distortions. */
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-archivo',
});

const instrument = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-instrument',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://1-1.studio'),
  title: '1:1 — Creative Studio',
  description:
    'A creative studio working at actual size. Brand, product, digital, motion and experimental design.',
  openGraph: {
    title: '1:1 — Creative Studio',
    description: 'A creative studio working at actual size.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable} ${instrument.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
