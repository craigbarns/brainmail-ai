import Link from 'next/link';
import { connection } from 'next/server';
import {
  ArrowUpRight,
  ScanLine,
  CalendarCheck2,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Mail,
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
            Un courrier arrive. Vous le scannez.
            <br />
            BRAINMAIL vous aide à comprendre, classer et préparer la suite.
          </p>
          <Link href={`${app}/login?register=1`} className="button">
            Créer mon espace <ArrowRight size={18} />
          </Link>
          <p className="subtle">Un espace privé pour chacune de vos sociétés.</p>
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
      <section className="features">
        {[
          [
            ScanLine,
            'Du papier à votre espace',
            'Photographiez plusieurs pages ou importez un PDF.',
          ],
          [
            CalendarCheck2,
            'Les prochaines étapes, visibles',
            'Retrouvez les échéances et confirmez vos rappels.',
          ],
          [
            ShieldCheck,
            'Chaque société à sa place',
            'Des documents privés et des espaces bien séparés.',
          ],
        ].map(([Icon, title, desc]) => {
          const I = Icon as typeof Mail;
          return (
            <article key={title as string}>
              <I size={23} />
              <h3>{title as string}</h3>
              <p>{desc as string}</p>
            </article>
          );
        })}
      </section>
      <footer>
        BRAINMAIL.ai <span>Votre courrier mérite moins de votre temps.</span>
      </footer>
    </main>
  );
}
