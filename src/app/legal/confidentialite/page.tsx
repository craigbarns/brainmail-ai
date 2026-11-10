import { LegalShell } from '@/components/legal';

export const metadata = { title: 'Politique de confidentialité — BRAINMAIL.ai' };
export default function Page() {
  return (
    <LegalShell title="Politique de confidentialité (RGPD)" updated="10 novembre 2026">
      <h2>1. Qui traite vos données</h2>
      <p>
        WeMade SASU (Marseille, SIREN 832 419 428) est responsable du traitement des données du
        service BRAINMAIL.ai. Contact pour toute question ou demande RGPD :
        gregory@brainmail.ai.
      </p>
      <h2>2. Quelles données, pour quoi</h2>
      <p>
        Nous traitons : les documents que vous confiez (photos de courriers, PDF, emails),
        leur transcription et leur analyse (résumés, catégories, échéances, brouillons),
        l&apos;essentiel des données du compte (email, sociétés, préférences) et les
        métadonnées techniques nécessaires à la sécurité (journalisation des accès). Ces
        traitements reposent sur l&apos;exécution du contrat ; la journalisation repose sur
        notre intérêt légitime à protéger le service.
      </p>
      <h2>3. Où vos données se trouvent</h2>
      <p>
        Hébergement et stockage en Europe. L&apos;analyse des documents est confiée à{' '}
        <strong>un seul sous-traitant d&apos;intelligence artificielle : Mistral (France)</strong>,
        en appel direct à son API européenne — aucun intermédiaire, aucun autre fournisseur
        d&apos;IA ne reçoit vos textes. Le modèle reçoit l&apos;instruction de traiter vos
        documents comme des données non fiables.
      </p>
      <h2>4. Sous-traitants</h2>
      <p>
        Mistral AI (France) — OCR et analyse des documents ; Railway — hébergement de
        l&apos;application et de la base (région Europe) ; Resend — envoi des emails de
        notification et réception de l&apos;adresse dédiée (région européenne). Aucun autre
        service ne reçoit le contenu de vos courriers. Aucun transfert hors Union européenne du
        contenu des documents n&apos;est effectué par nos soins ; le cas échéant, les
        sous-traitants documentés ci-dessus fournissent des garanties contractuelles
        appropriées.
      </p>
      <h2>5. Personne dans la boucle</h2>
      <p>
        Aucun courrier, aucune réponse ne quitte le service sans votre validation explicite.
        Nous n&apos;exploitons pas vos documents pour entraîner des modèles, et la mémoire
        contextuelle facultative ne reçoit pas vos documents.
      </p>
      <h2>6. Durées de conservation</h2>
      <p>
        Vos documents sont conservés tant que votre abonnement est actif, puis supprimés à
        l&apos;expiration du délai légal de conservation après la clôture du compte. Les
        captures et sessions temporaires expirent automatiquement. Vous pouvez demander la
        suppression immédiate d&apos;un document ou de votre compte à tout moment.
      </p>
      <h2>7. Vos droits</h2>
      <p>
        Accès, rectification, effacement, limitation, portabilité et opposition : écrivez à
        gregory@brainmail.ai, réponse sous un mois. Vous pouvez également saisir la CNIL
        (cnil.fr) si vous estimez vos droits bafoués.
      </p>
      <h2>8. Sécurité</h2>
      <p>
        Chiffrement des fichiers au repos (AES-256-GCM avec clés dédiées par espace), transport
        chiffré, adresses de réception tournantes et révocables, contrôle d&apos;origine des
        requêtes, limitation du nombre d&apos;essais de connexion, relecture humaine
        obligatoire avant toute action.
      </p>
      <h2>9. Cookies</h2>
      <p>
        Le service n&apos;utilise qu&apos;un cookie de session strictement nécessaire à la
        connexion, exempté de consentement. Aucun traceur publicitaire, aucune mesure
        d&apos;audience tierce.
      </p>
    </LegalShell>
  );
}
