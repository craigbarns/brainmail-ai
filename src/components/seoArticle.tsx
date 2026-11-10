import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import type { SeoPage } from '@/lib/seoPages';

const APP = process.env.NEXT_PUBLIC_APP_URL || 'https://app.brainmail.ai';

// Rendu d'une page SEO persona : contenu visible + JSON-LD @graph
// (SoftwareApplication, BreadcrumbList, FAQPage) pour les moteurs
// classiques et génératifs. Le balisage reflète exactement le contenu
// visible — FAQ, sections et prix y figurent tels quels.
export function SeoArticle({ page }: { page: SeoPage }) {
  const url = `https://www.brainmail.ai/solutions/${page.slug}`;
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: 'https://www.brainmail.ai/' },
          { '@type': 'ListItem', position: 2, name: 'Solutions', item: 'https://www.brainmail.ai/#tarifs' },
          { '@type': 'ListItem', position: 3, name: page.h1 },
        ],
      },
      {
        '@type': 'SoftwareApplication',
        name: 'BRAINMAIL.ai',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: 'https://www.brainmail.ai',
        description:
          'BRAINMAIL centralise le courrier papier et les emails de vos sociétés, extrait les échéances avec leur citation et prépare les réponses à valider.',
        offers: [
          { '@type': 'Offer', name: 'Solo', price: '29', priceCurrency: 'EUR', description: '1 société, 50 courriers par mois' },
          { '@type': 'Offer', name: 'Pro', price: '59', priceCurrency: 'EUR', description: '3 sociétés, 200 courriers par mois' },
          { '@type': 'Offer', name: 'Cabinet', price: '149', priceCurrency: 'EUR', description: '10 sociétés, 1 000 courriers par mois' },
        ],
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
    <main className="legal-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />
      <Link href="/" className="brand">
        <span className="brand-icon">
          <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} />
        </span>
        BRAINMAIL<span className="brand-ai">.ai</span>
      </Link>
      <p className="overline" style={{ marginTop: 28 }}>
        {page.eyebrow}
      </p>
      <h1>{page.h1}</h1>
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
            <ul>
              {s.points.map((pt) => (
                <li key={pt} style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 6 }}>
                  <Check size={15} color="var(--green)" style={{ flexShrink: 0, transform: 'translateY(2px)' }} />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <section>
        <h2>Questions fréquentes</h2>
        {page.faqs.map((f) => (
          <div key={f.q} style={{ marginBottom: 18 }}>
            <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>{f.q}</p>
            <p>{f.a}</p>
          </div>
        ))}
      </section>
      <section>
        <h2>Voir aussi</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {page.related.map((r) => (
            <li key={r.slug} style={{ marginBottom: 8 }}>
              <Link href={`/solutions/${r.slug}`} style={{ color: 'var(--green)' }}>
                → {r.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <div style={{ marginTop: 36, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link href={`${APP}/login?register=1`} className="button">
          Créer mon espace <ArrowRight size={16} />
        </Link>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          29 € HT/mois pour commencer · sans engagement · code PILOTE : 3 mois offerts
        </span>
      </div>
      <nav className="legal-nav" aria-label="Pages du site">
        <Link href="/">Accueil</Link>
        <Link href="/#tarifs">Tarifs</Link>
        <Link href="/legal/confidentialite">Confidentialité</Link>
        <Link href="/legal/cgv">CGV</Link>
      </nav>
    </main>
  );
}
