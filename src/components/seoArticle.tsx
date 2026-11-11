import Link from 'next/link';
import { ArrowRight, Check, Mail } from 'lucide-react';
import type { SeoPage } from '@/lib/seoPages';
import { SITE, PLAN_OFFERS, PUBLISHED, UPDATED, isoDate, frDate } from '@/lib/site';

// A solution page: visible content first, then a JSON-LD graph that mirrors it
// exactly (article, breadcrumb, product offers, FAQ). Search engines and
// AI assistants read the same facts, in the same order.
export function SeoArticle({ page }: { page: SeoPage }) {
  const url = `${SITE.url}/solutions/${page.slug}`;
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': `${url}#article`,
        headline: page.h1,
        description: page.description,
        inLanguage: 'fr-FR',
        datePublished: isoDate(PUBLISHED),
        dateModified: isoDate(UPDATED),
        author: { '@id': `${SITE.url}/#organization` },
        publisher: { '@id': `${SITE.url}/#organization` },
        mainEntityOfPage: url,
        image: `${url}/opengraph-image`,
        about: { '@id': `${SITE.url}/#software` },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${SITE.url}/` },
          { '@type': 'ListItem', position: 2, name: 'Solutions', item: `${SITE.url}/solutions` },
          { '@type': 'ListItem', position: 3, name: page.h1, item: url },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE.url}/#software`,
        name: 'BRAINMAIL.ai',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: SITE.url,
        description: SITE.description,
        offers: PLAN_OFFERS,
      },
      {
        '@type': 'FAQPage',
        mainEntity: page.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
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
        <Link href="/solutions">Solutions</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{page.crumb || page.h1}</span>
      </nav>
      <article>
        <p className="overline">{page.eyebrow}</p>
        <h1>{page.h1}</h1>
        <p className="article-meta">
          Par l’équipe BRAINMAIL · Mis à jour le{' '}
          <time dateTime={isoDate(UPDATED)}>{frDate(UPDATED)}</time> · Lecture : 4 min
        </p>
        {/* The summary is what an assistant quotes when it answers in one line. */}
        <aside className="article-summary" aria-label="En résumé">
          <strong>En résumé</strong>
          <p>{page.summary}</p>
        </aside>
        {page.intro.map((p) => (
          <p key={p.slice(0, 24)} className="lead">
            {p}
          </p>
        ))}
        {page.sections.map((s) => (
          <section key={s.h2}>
            <h2>{s.h2}</h2>
            {s.paras.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
            {s.points && (
              <ul className="article-points">
                {s.points.map((pt) => (
                  <li key={pt}>
                    <Check size={16} aria-hidden="true" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <section className="article-cta">
          <h2>Commencer avec BRAINMAIL</h2>
          <p>
            Scannez votre premier courrier en deux minutes. Sans carte bancaire, sans engagement.
            Code <strong>PILOTE</strong> : 3 mois offerts pour les premiers clients.
          </p>
          <Link href={`${SITE.app}/login?register=1`} className="button large">
            Créer mon espace <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>
        <section>
          <h2>Questions fréquentes</h2>
          <div className="faq-list">
            {page.faqs.map((f) => (
              <div key={f.q} className="faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </div>
        </section>
        <section>
          <h2>Voir aussi</h2>
          <ul className="article-related">
            {page.related.map((r) => (
              <li key={r.slug}>
                <Link href={`/solutions/${r.slug}`}>
                  {r.label} <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </li>
            ))}
            <li>
              <Link href="/comment-ca-marche">
                Comment fonctionne BRAINMAIL <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </section>
      </article>
      <SiteFooterNav />
    </main>
  );
}
export function SiteFooterNav() {
  return (
    <nav className="legal-nav" aria-label="Pages du site">
      <Link href="/">Accueil</Link>
      <Link href="/comment-ca-marche">Comment ça marche</Link>
      <Link href="/solutions">Solutions</Link>
      <Link href="/#tarifs">Tarifs</Link>
      <Link href="/legal/confidentialite">Confidentialité</Link>
      <Link href="/legal/cgv">CGV</Link>
      <Link href="/legal/mentions-legales">Mentions légales</Link>
    </nav>
  );
}
