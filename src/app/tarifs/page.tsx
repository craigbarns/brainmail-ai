import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tarifs — logiciel de gestion du courrier par IA | BRAINMAIL',
  description:
    'Solo 29 € HT/mois (1 société), Pro 59 € HT (3 sociétés), Cabinet 149 € HT (10 sociétés). Essai sans carte bancaire, sans engagement, résiliation en un clic.',
  alternates: { canonical: '/tarifs' },
};

const PLANS = [
  {
    name: 'Solo',
    price: '29',
    who: 'Artisans, indépendants, professions libérales.',
    items: ['1 société', '50 courriers par mois', 'Scan, analyse, échéances', 'Rappels email'],
  },
  {
    name: 'Pro',
    price: '59',
    who: 'TPE avec plusieurs activités ou sociétés.',
    items: ['3 sociétés', '200 courriers par mois', 'Réception email incluse', 'Rappels email'],
  },
  {
    name: 'Cabinet',
    price: '149',
    who: 'Experts-comptables, gestionnaires, syndics.',
    items: [
      '10 sociétés, +15 € chacune',
      '1 000 courriers par mois',
      'Support prioritaire',
      'Onboarding accompagné',
    ],
  },
];

const FAQS = [
  {
    q: 'Y a-t-il un essai gratuit ?',
    a: 'Oui : 20 courriers à essayer, sans carte bancaire, en 2 minutes. Sans engagement — vous ne payez qu’en choisissant un palier.',
  },
  {
    q: 'Puis-je changer de palier plus tard ?',
    a: 'Oui, à tout moment depuis le portail client : monter de palier débloque immédiatement les quotas, descendre s’applique à la fin du mois en cours.',
  },
  {
    q: 'Que se passe-t-il si je dépasse mon quota de courriers ?',
    a: 'Le service vous invite à monter de palier — rien n’est perdu, aucun courrier n’est ignoré silencieusement. Le palier Cabinet couvre 1 000 courriers par mois.',
  },
  {
    q: 'Comment se passe la résiliation ?',
    a: 'En un clic depuis le portail client (carte, factures, résiliation). Le service reste actif jusqu’à la fin de la période payée.',
  },
  {
    q: 'La TVA est-elle incluse ?',
    a: 'Les prix sont HT. La TVA française (20 %) s’ajoute au paiement ; pour les entreprises assujetties d’un autre État de l’UE avec un numéro de TVA valide, la TVA est autoliquidée.',
  },
];

export default function TarifsPage() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.brainmail.ai/' },
          { '@type': 'ListItem', position: 2, name: 'Tarifs' },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        name: 'BRAINMAIL.ai',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: 'https://www.brainmail.ai',
        description:
          'BRAINMAIL centralise le courrier papier et les emails de vos sociétés, extrait les échéances avec leur citation dans le document, et vous rappelle avant chaque date limite.',
        offers: PLANS.map((p) => ({
          '@type': 'Offer',
          name: p.name,
          price: p.price,
          priceCurrency: 'EUR',
          description: p.who,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };
  return (
    <main className="legal-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <Link href="/" className="brand">
        <span className="brand-icon">
          <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
        </span>
        BRAINMAIL<span className="brand-ai">.ai</span>
      </Link>
      <h1>Tarifs BRAINMAIL</h1>
      <p className="lead">
        Un prix par palier, sans surprise. Essayez d’abord 20 courriers, sans carte bancaire.
      </p>
      <div className="pricing-grid">
        {PLANS.map((p) => (
          <article key={p.name} className={p.name === 'Pro' ? 'price-card best' : 'price-card'}>
            {p.name === 'Pro' && <span className="best-tag">Recommandé</span>}
            <h3>{p.name}</h3>
            <p className="price">
              {p.price} €<small>HT / mois</small>
            </p>
            <p className="who">{p.who}</p>
            <ul>
              {p.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ul>
            <Link
              href="https://app.brainmail.ai/login?register=1"
              className={p.name === 'Pro' ? 'button full-width' : 'button secondary full-width'}
            >
              Créer mon espace
            </Link>
          </article>
        ))}
      </div>
      <p className="pricing-note">
        Prix HT ; TVA française 20 % ajoutée au paiement, autoliquidée pour les entreprises de
        l’UE avec un numéro de TVA valide. Annuel : 2 mois offerts. Pilote fondateur : 3 mois
        offerts contre votre retour d’expérience — code PILOTE au paiement.
      </p>
      <section>
        <h2>Questions fréquentes sur les tarifs</h2>
        {FAQS.map((f) => (
          <div key={f.q} style={{ marginBottom: 18 }}>
            <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{f.q}</p>
            <p>{f.a}</p>
          </div>
        ))}
      </section>
      <div style={{ marginTop: 36 }}>
        <Link href="https://app.brainmail.ai/login?register=1" className="button">
          Créer mon espace <ArrowRight size={16} />
        </Link>
      </div>
      <nav className="legal-nav" aria-label="Pages du site">
        <Link href="/">Accueil</Link>
        <Link href="/comment-ca-marche">Comment ça marche</Link>
        <Link href="/legal/mentions-legales">Mentions légales</Link>
        <Link href="/legal/cgv">CGV</Link>
        <Link href="/legal/confidentialite">Confidentialité</Link>
      </nav>
    </main>
  );
}
