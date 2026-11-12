import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
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
  metadataBase: new URL('https://www.brainmail.ai'),
  title: {
    default: 'BRAINMAIL — Logiciel de gestion du courrier par IA',
    template: '%s | BRAINMAIL',
  },
  description:
    'Logiciel de gestion du courrier par IA : scan mobile, lecture de documents, suivi des échéances, emails et réponses à valider pour les professionnels.',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    siteName: 'BRAINMAIL.ai',
    title: 'BRAINMAIL — Logiciel de gestion du courrier par IA',
    description:
      'Centralisez les courriers papier et emails de vos sociétés, identifiez les échéances et validez les réponses proposées par IA.',
    url: 'https://www.brainmail.ai',
  },
  twitter: { card: 'summary_large_image', title: 'BRAINMAIL — Gestion du courrier par IA' },
  // Indexable by default; the private areas are handled per route and in
  // robots.ts (/app, /api, /scan, /login stay out of search engines).
  robots: { index: true, follow: true },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${serif.variable} ${sans.variable}`}>
      <body>
        {children}
        {/* Google Tag Manager (conteneur GTM-WL2LLRKF) : mesure d'audience.
            Charger après l'hydratation pour ne pas ralentir le rendu. */}
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','GTM-WL2LLRKF');`}
        </Script>
      </body>
    </html>
  );
}
