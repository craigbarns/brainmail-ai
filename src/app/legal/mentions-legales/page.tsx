import { LegalShell } from '@/components/legal';

export const metadata = { title: 'Mentions légales — BRAINMAIL.ai' };
export default function Page() {
  return (
    <LegalShell title="Mentions légales" updated="10 novembre 2026">
      <h2>Éditeur</h2>
      <p>
        BRAINMAIL.ai est édité par <strong>WeMade SASU</strong>, société par actions simplifiée à
        associé unique immatriculée au RCS de Marseille sous le numéro <strong>832 419 428</strong>,
        dont le siège social est situé à Marseille, France. Numéro de TVA intracommunautaire :
        FR86832419428. Email de contact : gregory@brainmail.ai.
      </p>
      <h2>Directeur de la publication</h2>
      <p>Gérant de la société WeMade SASU.</p>
      <h2>Hébergement</h2>
      <p>
        L&apos;application et ses données sont hébergées par Railway (infrastructure cloud,
        région Europe) ; les fichiers sont conservés dans un stockage objet situé en Europe.
      </p>
      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble du service (logiciel, interface, textes, graphismes) est protégé par le
        droit de la propriété intellectuelle et demeure la propriété de WeMade SASU. Toute
        reproduction non autorisée est interdite.
      </p>
      <h2>Signalement</h2>
      <p>
        Toute anomalie ou contestation peut être signalée à gregory@brainmail.ai. Nous nous
        engageons à répondre sous 72 heures ouvrées.
      </p>
    </LegalShell>
  );
}
