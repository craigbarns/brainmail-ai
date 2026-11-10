import type { Metadata } from 'next';
import Link from 'next/link';
import { SEO_PAGES } from '@/lib/seoPages';

export const metadata: Metadata = {
  title: 'Solutions de gestion du courrier par IA',
  description: 'BRAINMAIL aide les auto-entrepreneurs, dirigeants multi-sociétés, SCI et cabinets comptables à centraliser les courriers et suivre les échéances avec une IA.',
  alternates: { canonical: '/solutions' },
  openGraph: {
    title: 'Solutions de gestion du courrier par IA | BRAINMAIL',
    description: 'Découvrez comment BRAINMAIL simplifie le courrier et le suivi des échéances pour chaque métier.',
    url: 'https://www.brainmail.ai/solutions',
    type: 'website',
  },
};

export default function SolutionsPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="brand">BRAINMAIL<span className="brand-ai">.ai</span></Link>
      <p className="overline" style={{ marginTop: 28 }}>Solutions par métier</p>
      <h1>Gestion du courrier par IA : une solution pour chaque activité</h1>
      <p className="lead">
        BRAINMAIL est un logiciel de gestion du courrier papier et des emails pour les
        professionnels. Il lit les documents, présente les échéances avec leur citation
        et prépare des brouillons de réponse soumis à votre validation.
      </p>
      <section>
        <h2>Choisissez votre activité</h2>
        <ul>
          {SEO_PAGES.map((page) => (
            <li key={page.slug} style={{ marginBottom: 18 }}>
              <Link href={`/solutions/${page.slug}`}>{page.title}</Link>
              <p>{page.description}</p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Comment fonctionne BRAINMAIL ?</h2>
        <p>
          Depuis l'ordinateur, ouvrez un scan par QR code sur votre téléphone
          ou importez un PDF. BRAINMAIL organise le courrier par société,
          extrait les informations utiles et vous laisse confirmer les
          échéances avant l'envoi des rappels.
        </p>
      </section>
      <nav className="legal-nav" aria-label="Pages du site">
        <Link href="/">Accueil</Link>
        <Link href="/#tarifs">Tarifs</Link>
        <Link href="/legal/confidentialite">Confidentialité</Link>
      </nav>
    </main>
  );
}
