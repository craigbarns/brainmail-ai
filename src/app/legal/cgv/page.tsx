import { LegalShell } from '@/components/legal';

export const metadata = { title: 'Conditions générales de vente — BRAINMAIL.ai' };
export default function Page() {
  return (
    <LegalShell title="Conditions générales de vente" updated="10 novembre 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes conditions régissent la fourniture du service BRAINMAIL.ai : réception,
        lecture assistée par IA, classement et suivi des courriers et emails administratifs
        d&apos;une entreprise, avec préparation de réponses soumises à validation humaine. Le
        service ne réalise aucune action irréversible sans validation explicite de
        l&apos;utilisateur.
      </p>
      <h2>2. Prix</h2>
      <p>
        Les abonnements sont proposés en euros, hors taxes : Solo 29 €/mois, Pro 59 €/mois,
        Cabinet 149 €/mois (10 sociétés incluses, 15 € par société supplémentaire au-delà de
        dix). La TVA française (20 %) est ajoutée au paiement ; pour les entreprises assujetties
        d&apos;un autre État de l&apos;Union européenne disposant d&apos;un numéro de TVA
        intracommunautaire valide, la TVA est autoliquidée conformément à la réglementation
        applicable.
      </p>
      <h2>3. Abonnement, durée, résiliation</h2>
      <p>
        L&apos;abonnement court par mois civil glissant, sans engagement de durée. Il est
        reconduit tacitement. Vous pouvez résilier à tout moment depuis le portail client Stripe :
        le service reste actif jusqu&apos;à la fin de la période payée, sans réconciliation
        automatique. Les frais d&apos;un mois entamé ne sont pas remboursables, sauf demande
        particulière que nous examinons avec bienveillance.
      </p>
      <h2>4. Paiement</h2>
      <p>
        Le paiement est opéré par Stripe. Nous n&apos;avons jamais connaissance de vos données
        bancaires. Un défaut de paiement suspend le service après rappel.
      </p>
      <h2>5. Engagements de WeMade</h2>
      <p>
        Nous traitons vos documents comme des données confidentielles, chiffrées, hébergées en
        Europe, avec un seul sous-traitant d&apos;intelligence artificielle (Mistral, France).
        L&apos;IA ne remplace pas votre jugement : les échéances extraites sont citées dans le
        document source et restent à confirmer. Le service est fourni en continu, dans la limite
        d&apos;une obligation de moyens ; une interruption est signalée et les données sont
        préservées.
      </p>
      <h2>6. Vos engagements</h2>
      <p>
        Vous utilisez le service pour les documents dont vous avez légitimement connaissance. Vous
        ne cherchez pas à contourner les quotas, à automatiser l&apos;extraction en masse ni à
        revendre le service sans accord écrit.
      </p>
      <h2>7. Responsabilité</h2>
      <p>
        Le service est un outil d&apos;assistance : la validation finale d&apos;une échéance ou
        d&apos;une réponse vous appartient. WeMade ne saurait être tenue responsable des
        conséquences d&apos;une action validée par vos soins ni des dommages indirects. En tout
        état de cause, notre responsabilité est plafonnée au montant des douze derniers mois
        d&apos;abonnement.
      </p>
      <h2>8. Droit de rétractation</h2>
      <p>
        Pour tout client non professionnel, un droit de rétractation de quatorze jours s&apos;applique
        à la souscription initiale, sauf si vous demandez l&apos;exécution immédiate du service en
        reconnaissant perdre ce droit.
      </p>
      <h2>9. Droit applicable</h2>
      <p>
        Les présentes conditions sont régies par le droit français. En cas de litige, une solution
        amiable sera recherchée avant toute action ; à défaut, les tribunaux français sont
        compétents. Médiateur de la consommation disponible sur demande.
      </p>
    </LegalShell>
  );
}
