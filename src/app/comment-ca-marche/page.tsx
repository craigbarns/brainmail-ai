import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail } from 'lucide-react';
import { SiteFooterNav } from '@/components/seoArticle';
import { SITE, PLAN_OFFERS, PUBLISHED, UPDATED, isoDate, frDate } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Comment fonctionne BRAINMAIL : du courrier papier à l’échéance confirmée',
  description:
    'Scan par QR code, lecture par Mistral, échéances citées dans le document, rappels par email, brouillon de réponse à valider : le parcours complet d’un courrier dans BRAINMAIL, étape par étape.',
  alternates: { canonical: '/comment-ca-marche' },
  openGraph: {
    title: 'Comment fonctionne BRAINMAIL',
    description:
      'Le parcours complet d’un courrier : scan, lecture, échéance prouvée, rappel, réponse à valider.',
    url: `${SITE.url}/comment-ca-marche`,
    type: 'article',
  },
};
// Each step answers one question a buyer or an assistant asks about the product.
const STEPS = [
  {
    name: 'Scanner le courrier depuis un téléphone',
    text: 'Depuis l’ordinateur, un QR code temporaire s’affiche. Le téléphone le vise et photographie chaque page du courrier, dans l’ordre. Aucune application à installer : la capture se fait dans le navigateur. Un PDF déjà numérisé s’importe directement, et chaque espace dispose aussi d’une adresse email de réception.',
  },
  {
    name: 'Lire le document',
    text: 'Les pages sont lues par Mistral OCR, en appel direct à l’API européenne de Mistral. Le texte extrait est conservé avec le courrier, et les photos sont réencodées sans métadonnées de localisation.',
  },
  {
    name: 'Comprendre et classer',
    text: 'Un modèle Mistral résume le courrier, identifie l’expéditeur, propose une catégorie (facture, administratif, assurance, banque, juridique) et les actions à mener. Le contenu du courrier est traité comme une donnée non fiable : ses éventuelles instructions ne sont jamais exécutées.',
  },
  {
    name: 'Prouver chaque échéance',
    text: 'Une date n’est retenue que si l’IA cite la phrase exacte du document qui la contient, et BRAINMAIL vérifie que cette phrase existe et porte bien cette date. Un délai relatif (« sous 30 jours ») ou une date ambiguë ne donne pas d’échéance : c’est à l’utilisateur de la fixer.',
  },
  {
    name: 'Confirmer, puis être rappelé',
    text: 'Chaque échéance proposée reste « à vérifier » jusqu’à ce qu’un humain la confirme. Une fois confirmée, un rappel part par email la veille et le jour même. Les échéances de toutes les sociétés d’un compte se retrouvent dans un calendrier.',
  },
  {
    name: 'Répondre, à votre main',
    text: 'Un brouillon de réponse est préparé pour les courriers qui en appellent une. Il se relit, se modifie et se copie. BRAINMAIL n’envoie jamais de réponse et ne paie jamais rien à votre place.',
  },
];
export default function HowItWorks() {
  const url = `${SITE.url}/comment-ca-marche`;
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'HowTo',
        '@id': `${url}#howto`,
        name: 'Comment fonctionne BRAINMAIL',
        description: metadata.description,
        inLanguage: 'fr-FR',
        datePublished: isoDate(PUBLISHED),
        dateModified: isoDate(UPDATED),
        totalTime: 'PT2M',
        step: STEPS.map((s, i) => ({
          '@type': 'HowToStep',
          position: i + 1,
          name: s.name,
          text: s.text,
          url: `${url}#etape-${i + 1}`,
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE.url}/` },
          { '@type': 'ListItem', position: 2, name: 'Comment ça marche', item: url },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE.url}/#software`,
        name: SITE.name,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: SITE.url,
        description: SITE.description,
        offers: PLAN_OFFERS,
      },
    ],
  };
  return (
    <main className="article-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
      />
      <header className="article-nav">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Mail />
          </span>
          BRAINMAIL<span className="brand-ai">.ai</span>
        </Link>
        <Link href={`${SITE.app}/login?register=1`} className="button small">
          Créer mon espace
        </Link>
      </header>
      <nav className="crumbs" aria-label="Fil d’Ariane">
        <Link href="/">Accueil</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Comment ça marche</span>
      </nav>
      <article>
        <p className="overline">Le produit, étape par étape</p>
        <h1>Comment fonctionne BRAINMAIL</h1>
        <p className="article-meta">
          Par l’équipe BRAINMAIL · Mis à jour le{' '}
          <time dateTime={isoDate(UPDATED)}>{frDate(UPDATED)}</time> · Lecture : 3 min
        </p>
        <aside className="article-summary" aria-label="En résumé">
          <strong>En résumé</strong>
          <p>
            Un courrier est photographié au téléphone, lu par Mistral, résumé et classé. Chaque
            échéance est prouvée par une phrase du document, confirmée par vous, puis rappelée par
            email. Un brouillon de réponse est préparé, jamais envoyé.
          </p>
        </aside>
        <ol className="howto-steps">
          {STEPS.map((s, i) => (
            <li key={s.name} id={`etape-${i + 1}`}>
              <span className="howto-n" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h2>{s.name}</h2>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <section>
          <h2>Ce que BRAINMAIL ne fait pas</h2>
          <p>
            Il ne paie pas les factures, n’envoie aucune réponse, ne signe rien et ne remplace ni un
            expert-comptable ni un juriste. Il lit, organise, prouve et rappelle ; vous décidez.
          </p>
        </section>
        <section>
          <h2>Où vont les données</h2>
          <p>
            Les fichiers sont chiffrés en AES-256-GCM et stockés en Europe. La lecture et l’analyse
            sont confiées à un seul sous-traitant d’IA, Mistral, en appel direct à son API
            européenne. Un courrier supprimé l’est définitivement, fichiers compris.
          </p>
        </section>
        <section className="article-cta">
          <h2>Essayer avec un vrai courrier</h2>
          <p>Deux minutes, sans carte bancaire. Code PILOTE : 3 mois offerts.</p>
          <Link href={`${SITE.app}/login?register=1`} className="button large">
            Créer mon espace <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
      </article>
      <SiteFooterNav />
    </main>
  );
}
