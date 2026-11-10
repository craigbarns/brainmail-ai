import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
// Self-hosted variable fonts (SIL OFL, see ./fonts): no third-party request,
// which the Content-Security-Policy would refuse anyway.
const serif = localFont({
  src: [
    { path: './fonts/newsreader-roman.woff2', weight: '200 800', style: 'normal' },
    { path: './fonts/newsreader-italic.woff2', weight: '200 800', style: 'italic' },
  ],
  variable: '--font-serif',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});
const sans = localFont({
  src: './fonts/hanken-grotesk.woff2',
  weight: '100 900',
  variable: '--font-sans',
  display: 'swap',
  adjustFontFallback: 'Arial',
});
export const metadata: Metadata = {
  title: 'BRAINMAIL · Votre courrier, l’esprit libre',
  description:
    'Scannez, comprenez et organisez votre courrier. Un espace sécurisé pour chaque société.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
