import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'BRAINMAIL · Votre courrier, l’esprit libre',
  description:
    'Scannez, comprenez et organisez votre courrier. Un espace sécurisé pour chaque société.',
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
