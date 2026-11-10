import Link from 'next/link';
import { connection } from 'next/server';
import {
  ArrowRight,
  Mail,
  Smartphone,
  FileText,
  ScanText,
  CalendarClock,
  Building2,
  Inbox,
  Lock,
  UserCheck,
  MapPin,
  Trash2,
  PenLine,
  Check,
} from 'lucide-react';
const STEPS = [
  [
    'Scannez, en 30 secondes',
    'Un QR code affiché à l’écran, votre téléphone photographie chaque page — ou glissez un PDF. Multipages, jusqu’à 50 Mo.',
  ],
  [
    'L’IA fait le tri',
    'Lecture puis analyse : titre, expéditeur, catégorie, résumé — et chaque échéance doit être citée noir sur blanc dans le document.',
  ],
  [
    'Vous décidez',
    'Confirmez les actions à suivre, relisez et validez le brouillon de réponse. Rien ne part sans vous.',
  ],
];
const FEATURES = [
  [
    Smartphone,
    'Scanner multipage',
    'Un QR code, votre téléphone, chaque page photographiée dans l’ordre — de n’importe où.',
  ],
  [
    FileText,
    'Import PDF',
    'Vos documents déjà numérisés suivent le même chemin : un PDF, un courrier.',
  ],
  [
    ScanText,
    'Lecture et analyse par Mistral',
    'Lecture et analyse en appel direct à l’API de Mistral (Europe) — aucun intermédiaire, vos textes ne passent que par eux.',
  ],
  [
    CalendarClock,
    'Échéances sourcées',
    'Une date n’est retenue que si elle est citée dans le document. Les rappels email arrivent avant.',
  ],
  [
    PenLine,
    'Brouillons sous votre plume',
    'Une réponse est préparée, jamais envoyée. Vous la relisez, l’ajustez, la validez.',
  ],
  [
    Building2,
    'Chaque société à sa place',
    'Plusieurs espaces isolés sur un compte : artisan, SCI, cabinet — et bientôt vos clients.',
  ],
  [
    Inbox,
    'Réception email',
    'Une adresse dédiée par espace : les emails entrants suivent le même traitement que le papier.',
  ],
  [
    Trash2,
    'Effacement réel',
    'Supprimez un courrier : documents et fichiers chiffrés partent. Le droit à l’oubli, tout court.',
  ],
] as const;
const TRUST = [
  [
    Lock,
    'Chiffré au repos',
    'AES-256-GCM, chaque fichier lié à son espace. Aucun lien public, téléchargement authentifié.',
  ],
  [
    MapPin,
    'En Europe',
    'Hébergement européen, lecture et analyse en direct sur l’API de Mistral (Europe). Un seul sous-traitant IA, aucun intermédiaire.',
  ],
  [
    UserCheck,
    'Humain au centre',
    'Aucun envoi automatique, aucune action déclenchée par l’IA. Chaque échéance est confirmée par vous.',
  ],
  [
    Trash2,
    'Effacement RGPD',
    'Suppression définitive d’un courrier et de ses fichiers chiffrés, à tout moment.',
  ],
] as const;
const PLANS = [
  {
    name: 'Solo',
    price: '29',
    who: 'Artisans, indépendants, professions libérales.',
    items: ['1 société', '50 courriers par mois', 'Scan, analyse, échéances', 'Rappels email'],
    best: false,
  },
  {
    name: 'Pro',
    price: '59',
    who: 'TPE avec plusieurs activités ou sociétés.',
    items: ['3 sociétés', '200 courriers par mois', 'Réception email incluse', 'Rappels email'],
    best: true,
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
    best: false,
  },
];
// Lignes du registre montrées dans l'aperçu : données d'exemple, fictives.
const PREVIEW = [
  ['Avis d’échéance — cotisations T4', 'URSSAF', 'Administratif', '15 déc.', 'soon', 'À vérifier'],
  ['Facture d’acompte n° 6', 'Menuiserie Carlier', 'Facture', '30 nov.', '', 'Confirmée'],
  [
    'Appel de cotisation multirisque',
    'Mutuelle des Artisans',
    'Assurance',
    '5 janv.',
    '',
    'Confirmée',
  ],
  ['Relevé de compte courant', 'Banque du Midi', 'Banque', '', '', ''],
];
// FAQ de la landing : visible ET balisée (même contenu, même ordre).
const LANDING_FAQS = [
  {
    q: 'Comment BRAINMAIL traite-t-il mes courriers papier ?',
    a: 'Vous scannez chaque courrier depuis votre téléphone grâce à un QR code temporaire : les pages arrivent dans votre espace, l’IA les lit, les classe et en extrait les échéances. Aucune application à installer.',
  },
  {
    q: 'D’où viennent les échéances affichées ? Sont-elles fiables ?',
    a: 'Chaque échéance est sourcée : l’IA doit citer la phrase exacte du document qui contient la date, et la citation est vérifiée automatiquement. Une date ambiguë ou non justifiée n’est pas proposée — vous confirmez toujours avant l’action.',
  },
  {
    q: 'L’IA peut-elle répondre ou payer à ma place ?',
    a: 'Non. BRAINMAIL prépare des brouillons de réponse et des actions, mais rien ne part et rien n’est payé sans votre validation explicite. Le service est conçu pour ne jamais effectuer d’action irréversible seul.',
  },
  {
    q: 'Où sont stockées mes données, et qui les analyse ?',
    a: 'Les fichiers sont chiffrés en AES-256-GCM et stockés en Europe. L’analyse est confiée à un seul sous-traitant d’IA : Mistral, une entreprise française, en appel direct à son API européenne — aucun intermédiaire.',
  },
  {
    q: 'Je reçois aussi des courriers par email. Ça marche ?',
    a: 'Oui : chaque espace dispose d’une adresse email dédiée pour vos expéditeurs numériques. Les pièces jointes sont traitées comme des documents, et l’adresse peut être tournée en un clic si elle fuit.',
  },
  {
    q: 'Combien ça coûte, et puis-je arrêter quand je veux ?',
    a: 'Solo 29 € HT/mois (1 société), Pro 59 € HT/mois (3 sociétés), Cabinet 149 € HT/mois (10 sociétés). Sans engagement : vous résiliez en un clic depuis le portail client, et le service reste actif jusqu’à la fin du mois payé.',
  },
];

export default async function Home() {
  // APP_URL exists only at runtime on Railway, not during the Docker build:
  // render per request so the links target the application domain.
  await connection();
  const app = process.env.APP_URL || '';
  const signup = `${app}/login?register=1`;
  return (
    <main className="lp">
      <header className="lp-nav">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Mail />
          </span>
          BRAINMAIL<span className="brand-ai">.ai</span>
        </Link>
        <nav className="lp-links" aria-label="Sections de la page">
          <a href="#parcours">Parcours</a>
          <a href="#produit">Aperçu</a>
          <a href="#confiance">Confiance</a>
          <a href="#tarifs">Tarifs</a>
        </nav>
        <div className="lp-nav-cta">
          <Link href={`${app}/login`} className="lp-login">
            Se connecter
          </Link>
          <Link href={signup} className="button small">
            Créer mon espace
          </Link>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <p className="overline">Assistant courrier pour dirigeants et cabinets</p>
          <h1>
            Aucun courrier oublié. <em>Aucune échéance perdue.</em>
          </h1>
          <p className="lp-lede">
            BRAINMAIL lit vos courriers et vos emails, repère ce qui doit être fait et prépare vos
            réponses — pour toutes vos sociétés, au même endroit.
          </p>
          <div className="lp-cta-row">
            <Link href={signup} className="button large">
              Créer mon espace <ArrowRight size={18} />
            </Link>
            <a href="#parcours" className="button ghost large">
              Voir le parcours
            </a>
          </div>
          <ul className="lp-assurances">
            <li>
              <Check size={15} /> Sans carte bancaire
            </li>
            <li>
              <Check size={15} /> Données chiffrées, IA européenne
            </li>
            <li>
              <Check size={15} /> Vous validez tout
            </li>
          </ul>
        </div>
        {/* Le geste du produit, montré : la phrase qui prouve l'échéance est surlignée. */}
        <div className="lp-hero-visual" aria-hidden="true">
          <div className="letter">
            <div className="letter-head">
              <span>Avis d’échéance</span>
              <span>Réf. T4-2026 · 12 nov. 2026</span>
            </div>
            <p className="letter-title">Cotisations sociales du 4ᵉ trimestre 2026</p>
            <p>Madame, Monsieur,</p>
            <p>
              Le montant de vos cotisations s’élève à <strong>2 340,00 €</strong>. Ce montant est{' '}
              <mark>à régler au plus tard le 15 décembre 2026</mark> par télépaiement, depuis votre
              espace en ligne.
            </p>
            <p className="letter-faded">
              Tout retard de paiement entraîne une majoration de 5 %. Un délai peut être demandé
              avant la date d’échéance.
            </p>
            <div className="letter-lines">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="extract">
            <div className="date-block soon">
              <b>15</b>
              <span>déc.</span>
            </div>
            <div className="extract-body">
              <p className="extract-label">Échéance repérée</p>
              <p className="extract-title">Régler les cotisations · 2 340,00 €</p>
              <p className="extract-quote">« à régler au plus tard le 15 décembre 2026 »</p>
              <span className="extract-confirm">
                <Check size={14} /> Confirmer
              </span>
            </div>
          </div>
          <p className="lp-visual-note">Courrier d’exemple</p>
        </div>
      </section>

      <section id="parcours" className="lp-section">
        <header className="lp-section-head">
          <p className="overline">Le parcours</p>
          <h2>De la pile de courrier à l’esprit clair.</h2>
        </header>
        <ol className="lp-steps">
          {STEPS.map(([title, text], i) => (
            <li key={title}>
              <span className="lp-step-n">{i + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="produit" className="lp-section">
        <header className="lp-section-head">
          <p className="overline">L’application</p>
          <h2>Un écran pour tout savoir, rien à deviner.</h2>
          <p className="lp-section-lede">
            Chaque courrier devient une ligne de registre : qui écrit, quoi faire, pour quand. La
            preuve est toujours à côté de la date.
          </p>
        </header>
        <div className="lp-preview" aria-hidden="true">
          <div className="lp-preview-bar">
            <i />
            <i />
            <i />
            <span>app.brainmail.ai</span>
          </div>
          <div className="lp-preview-body">
            <div className="lp-preview-list">
              <div className="lp-preview-head">
                <span>Courrier</span>
                <span>Catégorie</span>
                <span>Échéance</span>
                <span>État</span>
              </div>
              {PREVIEW.map(([title, sender, category, due, tone, state]) => (
                <div className="lp-preview-row" key={title}>
                  <span>
                    <strong>{title}</strong>
                    <small>{sender}</small>
                  </span>
                  <span>{category}</span>
                  <span>{due ? <b className={`due-chip ${tone}`}>{due}</b> : '—'}</span>
                  <span>
                    {state ? (
                      <b className={`chip ${state === 'Confirmée' ? 'ok' : 'warn'}`}>{state}</b>
                    ) : (
                      <b className="chip">Classé</b>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <aside className="lp-preview-side">
              <p className="overline">À vérifier</p>
              <strong>Régler les cotisations du 4ᵉ trimestre</strong>
              <blockquote>
                <mark>« à régler au plus tard le 15 décembre 2026 »</mark>
              </blockquote>
              <span className="extract-confirm">
                <Check size={14} /> Confirmer l’action
              </span>
            </aside>
          </div>
        </div>
      </section>

      <section id="fonctions" className="lp-section">
        <header className="lp-section-head">
          <p className="overline">Fonctionnalités</p>
          <h2>Pensé pour les professionnels occupés.</h2>
        </header>
        <div className="lp-features">
          {FEATURES.map(([Icon, title, text]) => (
            <article key={title}>
              <Icon size={22} strokeWidth={1.7} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="confiance" className="lp-trust">
        <div className="lp-trust-inner">
          <header className="lp-section-head">
            <p className="overline">Vos données</p>
            <h2>
              Le courrier est sensible. <em>Le traitement aussi.</em>
            </h2>
          </header>
          <div className="lp-trust-grid">
            {TRUST.map(([Icon, title, text]) => (
              <div key={title}>
                <Icon size={20} strokeWidth={1.7} />
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tarifs" className="lp-section">
        <header className="lp-section-head">
          <p className="overline">Tarifs</p>
          <h2>Moins cher qu’une semaine de secrétariat.</h2>
        </header>
        <div className="pricing-grid">
          {PLANS.map((p) => (
            <article key={p.name} className={p.best ? 'price-card best' : 'price-card'}>
              {p.best && <span className="best-tag">Recommandé</span>}
              <h3>{p.name}</h3>
              <p className="price">
                {p.price} €<small>HT / mois</small>
              </p>
              <p className="who">{p.who}</p>
              <ul>
                {p.items.map((it) => (
                  <li key={it}>
                    <Check size={16} /> {it}
                  </li>
                ))}
              </ul>
              <Link
                href={signup}
                className={p.best ? 'button full-width' : 'button secondary full-width'}
              >
                Créer mon espace
              </Link>
            </article>
          ))}
        </div>
        <p className="pricing-note">
          Prix HT ; TVA française 20 % ajoutée au paiement, autoliquidée pour les entreprises de
          l&apos;UE avec un numéro de TVA valide. Annuel : 2 mois offerts. Pilote fondateur : 3
          mois offerts contre votre retour d’expérience — parlez-en à votre contact BRAINMAIL.
        </p>
      </section>

      <section className="lp-final">
        <h2>
          Votre pile de courrier attend. <em>Elle n’attendra pas longtemps.</em>
        </h2>
        <Link href={signup} className="button large">
          Créer mon espace <ArrowRight size={18} />
        </Link>
      </section>

      <section id="faq" className="lp-section" aria-label="Questions fréquentes">
        <header className="lp-section-head">
          <p className="overline">Questions fréquentes</p>
          <h2>
            Les questions que <em>tout le monde pose.</em>
          </h2>
        </header>
        <div className="faq-list">
          {LANDING_FAQS.map((f) => (
            <div key={f.q} className="faq-item">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                name: 'WeMade SASU',
                url: 'https://www.brainmail.ai',
                email: 'gregory@brainmail.ai',
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: 'Marseille',
                  addressCountry: 'FR',
                },
              },
              {
                '@type': 'WebSite',
                name: 'BRAINMAIL.ai',
                url: 'https://www.brainmail.ai',
                inLanguage: 'fr-FR',
              },
              {
                '@type': 'SoftwareApplication',
                name: 'BRAINMAIL.ai',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                url: 'https://www.brainmail.ai',
                description:
                  'BRAINMAIL centralise le courrier papier et les emails de vos sociétés, extrait les échéances avec leur citation dans le document, et prépare les réponses à valider.',
                offers: [
                  { '@type': 'Offer', name: 'Solo', price: '29', priceCurrency: 'EUR', description: '1 société, 50 courriers par mois' },
                  { '@type': 'Offer', name: 'Pro', price: '59', priceCurrency: 'EUR', description: '3 sociétés, 200 courriers par mois' },
                  { '@type': 'Offer', name: 'Cabinet', price: '149', priceCurrency: 'EUR', description: '10 sociétés, 1 000 courriers par mois' },
                ],
              },
              {
                '@type': 'FAQPage',
                mainEntity: LANDING_FAQS.map((f) => ({
                  '@type': 'Question',
                  name: f.q,
                  acceptedAnswer: { '@type': 'Answer', text: f.a },
                })),
              },
            ],
          }),
        }}
      />

      <footer className="lp-footer">
        <div>
          <span className="brand">
            <span className="brand-icon">
              <Mail />
            </span>
            BRAINMAIL<span className="brand-ai">.ai</span>
          </span>
          <p className="muted">Votre courrier mérite moins de votre temps.</p>
        </div>
        <nav aria-label="Pied de page">
          <a href="#parcours">Parcours</a>
          <a href="#fonctions">Fonctionnalités</a>
          <a href="#confiance">Confiance</a>
          <a href="#tarifs">Tarifs</a>
          <Link href="/legal/mentions-legales">Mentions légales</Link>
          <Link href="/legal/cgv">CGV</Link>
          <Link href="/legal/confidentialite">Confidentialité</Link>
          <Link href={`${app}/login`}>Connexion</Link>
        </nav>
        <p className="lp-legal">
          © {new Date().getFullYear()} WeMade SASU — Marseille, France. SIREN 832 419 428. Prix
          HT ; TVA française 20 % ajoutée au paiement.
        </p>
      </footer>
    </main>
  );
}
