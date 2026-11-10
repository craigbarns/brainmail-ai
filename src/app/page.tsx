import Link from 'next/link';
import { connection } from 'next/server';
import {
  ArrowUpRight,
  ScanLine,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Mail,
  Smartphone,
  FileText,
  BrainCircuit,
  Clock3,
  Building2,
  Inbox,
  Lock,
  UserCheck,
  MapPin,
  Trash2,
} from 'lucide-react';
export default async function Home() {
  // APP_URL exists only at runtime on Railway, not during the Docker build:
  // render per request so the links target the application domain.
  await connection();
  const app = process.env.APP_URL || '';
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Mail size={22} />
          </span>
          BRAINMAIL<span className="brand-ai">.ai</span>
        </Link>
        <nav className="landing-links">
          <a href="#parcours">Parcours</a>
          <a href="#fonctions">Fonctionnalités</a>
          <a href="#confiance">Confiance</a>
          <a href="#tarifs">Tarifs</a>
        </nav>
        <Link href={`${app}/login`} className="button secondary">
          Se connecter <ArrowUpRight size={16} />
        </Link>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">
            <span className="dot" /> VOTRE NOUVEL ASSISTANT COURRIER
          </p>
          <h1>
            Moins de papiers.
            <br />
            <span>Plus d’esprit libre.</span>
          </h1>
          <p className="hero-copy">
            Un courrier arrive. Vous le scannez. BRAINMAIL lit, classe, extrait
            les échéances et prépare vos réponses — vous gardez la main sur tout.
          </p>
          <Link href={`${app}/login?register=1`} className="button">
            Créer mon espace <ArrowRight size={18} />
          </Link>
          <ul className="hero-badges">
            <li>Sans carte bancaire</li>
            <li>Données chiffrées, IA en France</li>
            <li>Vous validez tout</li>
          </ul>
        </div>
        <div className="hero-visual">
          <div className="floating-label">
            <ShieldCheck size={16} /> Vos documents restent privés
          </div>
          <div className="paper">
            <div className="paper-heading">
              <span className="brand-icon">
                <ScanLine />
              </span>
              <span>
                Un courrier.
                <br />
                <strong>Tout devient plus clair.</strong>
              </span>
            </div>
            <div className="paper-lines">
              <i />
              <i />
              <i />
            </div>
            <div className="example-note">APERÇU DU PARCOURS</div>
            <div className="step-preview">
              <span>01</span>
              <div>
                <strong>Photographiez</strong>
                <p>Un QR code, votre téléphone, c’est tout.</p>
              </div>
            </div>
            <div className="step-preview">
              <span>02</span>
              <div>
                <strong>Comprenez</strong>
                <p>L’essentiel et les actions à vérifier.</p>
              </div>
            </div>
            <div className="step-preview">
              <span>03</span>
              <div>
                <strong>Gardez le contrôle</strong>
                <p>Vous validez les dates et les réponses.</p>
              </div>
            </div>
          </div>
          <div className="floating-note">
            <Sparkles size={20} />
            <div>
              Votre administratif,
              <br />
              <strong>un peu plus léger.</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="parcours" className="land-section">
        <p className="eyebrow">LE PARCOURS</p>
        <h2>
          De la pile de courrier <span>à l’esprit clair.</span>
        </h2>
        <div className="parcours-grid">
          <div className="parcours-step">
            <span className="parcours-num">01</span>
            <h3>Scannez, en 30 secondes</h3>
            <p>
              Un QR code affiché à l’écran, votre téléphone photographie chaque
              page — ou glissez un PDF. Multipages, jusqu’à 50 Mo.
            </p>
          </div>
          <div className="parcours-step">
            <span className="parcours-num">02</span>
            <h3>L’IA fait le tri</h3>
            <p>
              OCR puis analyse : titre, expéditeur, catégorie, résumé — et chaque
              échéance doit être citée noir sur blanc dans le document.
            </p>
          </div>
          <div className="parcours-step">
            <span className="parcours-num">03</span>
            <h3>Vous décidez</h3>
            <p>
              Confirmez les actions à suivre, relisez et validez le brouillon de
              réponse. Rien ne part sans vous.
            </p>
          </div>
        </div>
      </section>

      <section id="produit" className="land-section">
        <p className="eyebrow">L’APPLICATION</p>
        <h2>
          Un écran pour tout savoir, <span>rien à deviner.</span>
        </h2>
        <div className="app-frame" aria-hidden="true">
          <div className="app-frame-bar">
            <i />
            <i />
            <i />
            <span>app.brainmail.ai</span>
          </div>
          <div className="app-frame-body">
            <div className="app-frame-side">
              <span className="brand-icon small">
                <Mail size={16} />
              </span>
              <strong>Courrier</strong>
              <strong className="on">Actions</strong>
              <strong>Archives</strong>
              <strong>Réglages</strong>
            </div>
            <div className="app-frame-list">
              <div className="mail-row">
                <div>
                  <strong>Avis de cotisation URSSAF</strong>
                  <span>URSSAF · Il y a 2 jours</span>
                </div>
                <em className="chip ok">À consulter</em>
              </div>
              <div className="mail-row">
                <div>
                  <strong>Facture d’acompte n°6</strong>
                  <span>Raymond C. · Aujourd’hui</span>
                </div>
                <em className="chip ok">À consulter</em>
              </div>
              <div className="mail-row">
                <div>
                  <strong>Relance assurance habitation</strong>
                  <span>ASSURHABIT · Il y a 3 jours</span>
                </div>
                <em className="chip">Analysé</em>
              </div>
            </div>
            <div className="app-frame-panel">
              <span className="eyebrow">ACTION À VÉRIFIER</span>
              <strong>Payer la cotisation URSSAF</strong>
              <p className="evidence">« A payer avant le 20 janvier 2027. »</p>
              <span className="mini-btn">Confirmer</span>
            </div>
          </div>
        </div>
      </section>

      <section id="fonctions" className="land-section">
        <p className="eyebrow">FONCTIONNALITÉS</p>
        <h2>
          Pensé pour les <span>professionnels occupés.</span>
        </h2>
        <div className="land-grid">
          {[
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
              BrainCircuit,
              'OCR et analyse en France',
              'Lecture par Mistral OCR, analyse par un modèle hébergé en Europe. Vos textes restent là.',
            ],
            [
              Clock3,
              'Échéances sourcées',
              'Une date n’est retenue que si elle est citée dans le document. Les rappels email arrivent avant.',
            ],
            [
              UserCheck,
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
          ].map(([Icon, title, desc]) => {
            const I = Icon as typeof Mail;
            return (
              <article key={title as string}>
                <I size={22} />
                <h3>{title as string}</h3>
                <p>{desc as string}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="confiance" className="trust-band">
        <div className="trust-inner">
          <p className="eyebrow light">VOS DONNÉES</p>
          <h2>
            Le courrier est sensible. <span>Le traitement aussi.</span>
          </h2>
          <div className="trust-grid">
            {[
              [
                Lock,
                'Chiffré au repos',
                'AES-256-GCM, chaque fichier lié à son espace. Aucun lien public, téléchargement authentifié.',
              ],
              [
                MapPin,
                'En Europe',
                'Hébergement en Europe, OCR et analyse Mistral en France. Vos courriers ne partent pas à l’étranger.',
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
            ].map(([Icon, title, desc]) => {
              const I = Icon as typeof Mail;
              return (
                <div key={title as string} className="trust-item">
                  <I size={20} />
                  <h3>{title as string}</h3>
                  <p>{desc as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="tarifs" className="land-section">
        <p className="eyebrow">TARIFS</p>
        <h2>
          Moins cher qu’une <span>semaine de secrétariat.</span>
        </h2>
        <div className="pricing-grid">
          {[
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
          ].map((p) => (
            <article key={p.name} className={p.best ? 'price-card best' : 'price-card'}>
              {p.best && <span className="best-tag">Le plus choisi</span>}
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
              <Link href={`${app}/login?register=1`} className="button full-width">
                Créer mon espace
              </Link>
            </article>
          ))}
        </div>
        <p className="pricing-note">
          Annuel : 2 mois offerts. Pilote fondateur : 3 mois offerts contre votre
          retour d’expérience — parlez-en à votre contact BRAINMAIL.
        </p>
      </section>

      <section className="final-cta">
        <h2>
          Votre pile de courrier attend. <span>Elle n’attendra pas longtemps.</span>
        </h2>
        <Link href={`${app}/login?register=1`} className="button big">
          Créer mon espace <ArrowRight size={18} />
        </Link>
      </section>

      <footer>
        <div className="footer-cols">
          <div>
            <span className="brand">
              <span className="brand-icon">
                <Mail size={20} />
              </span>
              BRAINMAIL<span className="brand-ai">.ai</span>
            </span>
            <p className="muted">Votre courrier mérite moins de votre temps.</p>
          </div>
          <nav>
            <a href="#parcours">Parcours</a>
            <a href="#fonctions">Fonctionnalités</a>
            <a href="#confiance">Confiance</a>
            <a href="#tarifs">Tarifs</a>
            <Link href={`${app}/login`}>Connexion</Link>
          </nav>
        </div>
        <p className="footer-legal">
          © {new Date().getFullYear()} WeMade SASU — Marseille, France.
        </p>
      </footer>
    </main>
  );
}
