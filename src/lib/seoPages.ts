// Pages SEO par persona : chaque page répond à une requête réelle
// (« comment gérer le courrier de… ») et nourrit aussi les moteurs
// génératifs (ChatGPT, Perplexity, AI Overviews) avec des réponses
// factuelles, datées et vérifiables. Zéro affirmation inventée.

export type SeoFaq = { q: string; a: string };
export type SeoSection = { h2: string; paras: string[]; points?: string[] };
export type SeoPage = {
  slug: string;
  title: string; // <title> ~60 car.
  description: string; // meta description ~155 car.
  h1: string;
  eyebrow: string;
  intro: string[];
  sections: SeoSection[];
  faqs: SeoFaq[];
  related: { slug: string; label: string }[];
};

export const SEO_PAGES: SeoPage[] = [
  {
    slug: 'courrier-auto-entrepreneur',
    title: 'Gérer le courrier de son auto-entreprise ou micro-entreprise',
    description:
      'Factures, URSSAF, impôts, assurances : BRAINMAIL lit vos courriers, extrait les échéances avec la preuve, et vous rappelle avant la date. À partir de 29 € HT/mois.',
    h1: 'Suivez le courrier de votre auto-entreprise sans oublier les échéances',
    eyebrow: 'ARTISANS · INDÉPENDANTS · MICRO-ENTREPRISE',
    intro: [
      'Un auto-entrepreneur reçoit chaque mois des courriers qui comptent : avis URSSAF, appels de cotisations, échéances d’impôts, courriers d’assurances, factures de fournisseurs. Chacun part dans une pile, et la pile gagne.',
      'BRAINMAIL transforme cette pile en une liste claire : chaque courrier est scanné depuis votre téléphone, lu par une IA, et ses dates importantes deviennent des échéances confirmables — avec la phrase du document qui prouve la date.',
    ],
    sections: [
      {
        h2: 'Ce qui vous arrive aujourd’hui',
        paras: [
          'Les courriers officiels ne préviennent pas deux fois. Un avis d’appel URSSAF ignoré devient une majoration. Une attestation d’assurance manquée, un contrat qui ne couvre plus votre chantier. Et le papier s’accumule dans un tiroir que personne n’ouvre.',
          'Le problème n’est pas votre organisation : c’est qu’un courrier papier exige de vous une action à une date que vous ne connaissez pas encore, dans un document que vous n’avez pas relit.',
        ],
      },
      {
        h2: 'Comment BRAINMAIL règle le problème',
        paras: [
          'Vous scannez vos courriers avec votre téléphone via un QR code temporaire, ou vous recevez-les directement sur une adresse email dédiée. L’IA (Mistral, en France) lit chaque document, le classe, et propose les actions : à payer avant telle date, à répondre, à vérifier.',
          'Chaque échéance porte sa citation : la phrase exacte du document où la date figure. Vous confirmez, BRAINMAIL vous rappelle à temps — par email, sur l’horloge du service et non sur celle d’un traitement d’analyse.',
        ],
        points: [
          'Scan mobile multipages sans application à installer',
          'Réception email directe pour vos expéditeurs numériques',
          'Échéances sourcées : la date est prouvée dans le document',
          'Brouillons de réponse préparés, jamais envoyés sans votre validation',
          'Dossiers suivis : de la réception à la clôture, tout au même endroit',
        ],
      },
      {
        h2: 'Ce que ça coûte, ce que ça rapporte',
        paras: [
          'Le palier Solo coûte 29 € HT par mois : une société, 50 courriers par mois, les rappels email inclus. Une majoration URSSAF ou une échéance fiscale oubliée coûte plus cher qu’une année d’abonnement.',
          'Vos documents sont chiffrés (AES-256-GCM), stockés en Europe, et analysés par un seul sous-traitant d’intelligence artificielle : Mistral, une entreprise française. Rien ne part sans votre validation.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Comment gérer le courrier de son auto-entreprise sans secrétariat ?',
        a: 'BRAINMAIL centralise le courrier de votre auto-entreprise : vous scannez chaque document depuis votre téléphone, l’IA en extrait les échéances (URSSAF, impôts, assurances) avec la citation qui prouve la date, et vous recevez des rappels avant chaque échéance. Les réponses sont préparées en brouillon et ne partent qu’après votre validation.',
      },
      {
        q: 'Que se passe-t-il si j’oublie un avis d’appel de cotisations URSSAF ?',
        a: 'Un appel de cotisations non payé à sa date déclenche une majoration puis des pénalités. BRAINMAIL lit l’avis dès son arrivée, en extrait le montant et la date limite, et vous rappelle par email avant l’échéance. La date extraite est toujours justifiée par une citation du document.',
      },
      {
        q: 'Faut-il une application pour scanner mes courriers ?',
        a: 'Non. Vous ouvrez une page web depuis votre téléphone, un QR code temporaire relie vos photos à votre espace, et vous photographiez chaque page du courrier. Les documents multipages sont gérés nativement. Le QR code expire et peut être révoqué.',
      },
      {
        q: 'Mes documents sont-ils conservés en Europe et protégés ?',
        a: 'Oui. Les fichiers sont chiffrés au repos en AES-256-GCM et stockés dans un stockage objet situé en Europe. L’analyse est confiée à Mistral, une entreprise française, en appel direct à son API européenne. Aucun autre fournisseur d’IA ne reçoit vos textes.',
      },
      {
        q: 'Combien coûte BRAINMAIL pour une seule société ?',
        a: 'Le palier Solo coûte 29 € HT par mois pour une société et 50 courriers par mois, avec les rappels email inclus. Sans engagement : vous résiliez à tout moment depuis le portail client. La TVA française de 20 % s’ajoute au paiement.',
      },
    ],
    related: [
      { slug: 'courrier-multi-societes', label: 'Dirigeant avec plusieurs sociétés' },
      { slug: 'courrier-expert-comptable', label: 'Cabinets comptables et experts-comptables' },
    ],
  },
  {
    slug: 'courrier-multi-societes',
    title: 'Gérer le courrier de plusieurs sociétés au même endroit',
    description:
      '3, 5, 10 sociétés : BRAINMAIL centralise les courriers de toutes vos structures, sépare les échéances par société et vous rappelle à temps. À partir de 59 € HT/mois.',
    h1: 'Gérez le courrier de plusieurs sociétés dans un seul outil',
    eyebrow: 'DIRIGEANTS MULTI-SOCIÉTÉS · SCI · HOLDINGS',
    intro: [
      'Quand on dirige plusieurs structures — une holding, une SCI, une société d’exploitation — le courrier se multiplie et se disperse : chaque banque, chaque assurance, chaque administration écrit séparément. Le même avis fiscal, en trois exemplaires différents, à trois dates différentes.',
      'BRAINMAIL donne à chaque société son espace, et vous un seul endroit pour tout : les échéances de toutes vos structures dans un calendrier unique, séparées, sourcées, rappelées.',
    ],
    sections: [
      {
        h2: 'Le vrai risque du multi-sociétés',
        paras: [
          'Ce n’est pas le volume : c’est la confusion. Une échéance de la SCI mélangée à celle de la SARL, un courrier d’assurance lu trop vite pour la mauvaise entité, un avis d’impôts posé « pour plus tard » qui devient une majoration.',
          'Et quand une adresse de courrier change — ou pire, quand un courrier sensible arrive à une ancienne adresse — personne ne vous prévient à temps.',
        ],
      },
      {
        h2: 'Un espace par société, un calendrier pour vous',
        paras: [
          'Chaque société dispose de son propre espace avec son adresse de réception email dédiée et tournante. Vous basculez d’une société à l’autre en un clic, et le calendrier des échéances reste séparé : jamais une date de la SCI dans le dossier de la SARL.',
          'Chaque courrier devient un dossier suivi : reçu, analysé, action préparée, validé par vous, répondu, clôturé. L’historique complet reste consultable — utile au comptable, utile en cas de contrôle.',
        ],
        points: [
          'Palier Pro : 3 sociétés, 200 courriers par mois',
          'Palier Cabinet : 10 sociétés, 1 000 courriers par mois',
          'Adresses de réception tournantes et révocables par société',
          'Calendrier mensuel avec navigation et marqueur du jour',
          'Historique complet par document, exportable vers votre comptable',
        ],
      },
      {
        h2: 'Pourquoi les échéances sourcées changent tout',
        paras: [
          'Une IA qui annonce une date sans preuve, c’est une date dont vous devez tout vérifier. BRAINMAIL exige la citation : l’IA ne peut proposer une échéance que si la phrase du document qui la contient est citée. Une date ambiguë ou incomplète n’est pas proposée.',
          'Résultat : vous confirmez en un regard, et l’erreur la plus classique des assistants IA — inventer une date — est structurellement bloquée.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Comment centraliser le courrier de plusieurs sociétés ?',
        a: 'BRAINMAIL donne un espace à chaque société avec son adresse de réception dédiée. Vous scannez ou recevez chaque courrier dans le bon espace, et vous pilotez toutes les échéances depuis un calendrier unique. Les paliers Pro (3 sociétés) et Cabinet (10 sociétés) couvrent la plupart des montages.',
      },
      {
        q: 'Le courrier d’une SCI peut-il être mélangé à celui de la SARL ?',
        a: 'Non. Chaque société a son propre espace, ses propres documents et son propre calendrier d’échéances. Vous basculez d’un espace à l’autre en un clic, et les adresses de réception sont distinctes et tournantes.',
      },
      {
        q: 'Que se passe-t-il à la date de fin de mes adresses de réception ?',
        a: 'Chaque espace dispose d’une adresse de type bm.…@in.brainmail.ai que vous pouvez faire tourner en un clic depuis l’application. Une adresse compromise ou exposée peut être révoquée sans perdre l’historique des documents.',
      },
      {
        q: 'Puis-je donner accès à mon comptable ?',
        a: 'Le service prévoit des comptes par utilisateur avec des rôles propriétaire et membre. Votre comptable peut consulter les documents et dossiers de l’espace concerné sans disposer de vos identifiants personnels.',
      },
      {
        q: 'Combien coûte le suivi du courrier de trois sociétés ?',
        a: 'Le palier Pro coûte 59 € HT par mois pour 3 sociétés et 200 courriers par mois. Au-delà, le palier Cabinet couvre 10 sociétés pour 149 € HT par mois, puis 15 € HT par société supplémentaire.',
      },
    ],
    related: [
      { slug: 'courrier-sci', label: 'Propriétaires de SCI' },
      { slug: 'courrier-expert-comptable', label: 'Cabinets comptables' },
    ],
  },
  {
    slug: 'courrier-expert-comptable',
    title: 'Le suivi du courrier pour les cabinets et experts-comptables',
    description:
      'Offrez à vos clients un espace où ne rien oublier : BRAINMAIL centralise leurs courriers, source les échéances et vous garde la vue. 149 € HT/mois pour 10 sociétés.',
    h1: 'Suivi du courrier et des échéances clients pour experts-comptables',
    eyebrow: 'EXPERTS-COMPTABLES · GESTIONNAIRES · SYNDICS',
    intro: [
      'Un cabinet gère des dizaines de sociétés clientes, et le courrier reste le point aveugle : l’avis URSSAF qui traîne chez le client, l’assurance relue trop tard, la date de télédéclaration découverte après la date limite.',
      'BRAINMAIL fait de votre cabinet la centrale administrative de vos clients : chaque société dispose d’un espace où son courrier papier et ses emails sont scannés, lus, classés, et où chaque échéance est sourcée et rappelée.',
    ],
    sections: [
      {
        h2: 'Le courrier, l’angle mort de la mission',
        paras: [
          'Vous produisez les comptes et les déclarations, mais une part du risque naît avant vous : dans le courrier que le client reçoit et oublie. Chaque majoration, chaque perte de droit, chaque pénalité de retard est d’abord un courrier mal traité chez le client.',
          'En leur offrant un espace où ne rien oublier, vous réduisez ces incidents — et vous gardez une vue sur les échéances de l’ensemble de votre portefeuille, sans demander de justificatif par email.',
        ],
      },
      {
        h2: 'Le palier Cabinet, pensé pour votre portefeuille',
        paras: [
          '10 sociétés incluses pour 149 € HT par mois, puis 15 € HT par société supplémentaire : le coût marginal d’un client supplémentaire est maîtrisé. 1 000 courriers par mois, support prioritaire, onboarding accompagné.',
          'L’IA prépare les brouillons de réponse — courriers de relance, demandes d’attestation, réponses aux administrations — et rien ne part sans validation : la vôtre ou celle du client. Le cabinet garde le contrôle professionnel du contenu.',
        ],
        points: [
          '10 sociétés incluses, +15 € HT par société au-delà',
          'Échéances citées : le client voit la preuve, vous voyez la confirmation',
          'Brouillons préparés par l’IA, validés avant tout envoi',
          'Historique consultable par document et par dossier suivi',
          'IA et données en Europe : Mistral (France), stockage chiffré AES-256-GCM',
        ],
      },
      {
        h2: 'Une intégration en une réunion',
        paras: [
          'Vous créez les espaces de vos clients, ils scannent leurs courriers depuis leur téléphone ou basculent leurs expéditeurs email sur l’adresse dédiée. Aucune installation, aucune formation : la page de scan est une page web.',
          'Programme pilote fondateur : trois mois offerts pour les premiers cabinets qui nous font leur retour d’expérience. Demandez-le à votre contact BRAINMAIL.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Comment un cabinet peut-il suivre le courrier de ses clients ?',
        a: 'Avec BRAINMAIL, chaque société cliente dispose d’un espace où son courrier est scanné et analysé : échéances extraites avec citation, réponses préparées en brouillon, rappels automatiques. Le cabinet garde une vue sur l’ensemble sans collecter les justificatifs à la main.',
      },
      {
        q: 'L’IA peut-elle envoyer du courrier à la place du client ?',
        a: 'Non, c’est une règle de conception : BRAINMAIL ne réalise aucune action irréversible sans validation humaine. Les réponses sont préparées en brouillon, et le client ou le cabinet les relit, les modifie et les envoie lui-même.',
      },
      {
        q: 'Le service respecte-t-il le RGPD pour les données des clients du cabinet ?',
        a: 'Les documents sont chiffrés au repos en AES-256-GCM, stockés en Europe, et analysés par un seul sous-traitant d’IA : Mistral, en France, en appel direct. Un document peut être supprimé immédiatement, et la suppression emporte celle des fichiers associés.',
      },
      {
        q: 'Combien coûte le palier Cabinet ?',
        a: '149 € HT par mois pour 10 sociétés et 1 000 courriers par mois, puis 15 € HT par société supplémentaire. Support prioritaire et onboarding accompagné inclus. Sans engagement, résiliation en un clic.',
      },
      {
        q: 'Peut-on tester le service avant de l’offrir à ses clients ?',
        a: 'Oui : le programme pilote fondateur offre trois mois sans paiement aux premiers cabinets, contre un retour d’expérience. Créez un espace, choisissez le palier Cabinet et utilisez le code fourni par votre contact BRAINMAIL au paiement.',
      },
    ],
    related: [
      { slug: 'courrier-multi-societes', label: 'Dirigeants multi-sociétés' },
      { slug: 'courrier-auto-entrepreneur', label: 'Artisans et indépendants' },
    ],
  },
  {
    slug: 'courrier-sci',
    title: 'Gérer le courrier d’une SCI : loyers, charges, travaux, impôts',
    description:
      'Avis d’impôts, appels de fonds, courriers de locataires, assurances : BRAINMAIL suit les échéances de votre SCI et vous rappelle à temps. À partir de 29 € HT/mois.',
    h1: 'Le courrier de votre SCI, enfin sous contrôle',
    eyebrow: 'PROPRIÉTAIRES · SCI · INVESTISSEURS IMMOBILIERS',
    intro: [
      'Une SCI génère un courrier régulier et daté : avis d’impôt sur les sociétés ou revenus fonciers, appels de fonds, factures d’artisans, courriers d’assurances, correspondances de locataires ou de l’agence. Chaque document porte une échéance.',
      'BRAINMAIL lit ces documents dès leur arrivée et transforme leurs dates en échéances confirmées et rappelées — avec la citation qui prouve chaque date dans le document lui-même.',
    ],
    sections: [
      {
        h2: 'Les échéances d’une SCI ne pardonnent pas',
        paras: [
          'Un appel de fonds réglé en retard entraîne des intérêts. Une déclaration ratée, une majoration. Une assurance qui a changé ses conditions et que personne n’a relue, un sinistre découvert non couvert. Le papier des SCI se perd dans des boîtes personnelles ou des adresses du domicile.',
          'Beaucoup d’associés de SCI gèrent plusieurs structures : la SCI, l’exploitation, la holding. Le courrier se confond, et les dates se mélangent.',
        ],
      },
      {
        h2: 'Un espace pour la SCI, des échéances pour chaque document',
        paras: [
          'Créez un espace dédié à la SCI. Scannez le courrier depuis votre téléphone ou faites adresser les expéditeurs numériques à l’email dédié de l’espace. L’IA classe chaque document et propose les actions : payer l’appel de fonds avant le 15, régler la taxe foncière avant le 20, répondre au courrier de l’agence.',
          'Chaque échéance est sourcée : l’IA cite la phrase du document. Vous confirmez, le rappel arrive à temps, et le dossier reste suivi jusqu’à la clôture — preuve à l’appui si un litige survient.',
        ],
        points: [
          'Avis d’imposition, appels de fonds, factures : tout classé au même endroit',
          'Échéances confirmées avec la citation du document',
          'Dossiers suivis jusqu’à la clôture, consultables par les associés',
          'Palier Solo (1 société) ou Pro (3 sociétés) selon vos montages',
          'Données chiffrées en Europe, analyse par Mistral (France)',
        ],
      },
      {
        h2: 'Fini le tiroir, place à l’historique',
        paras: [
          'À l’approche d’un contrôle, d’une vente de parts ou d’un litige, vous ne cherchez plus dans un carton : chaque document scanné est conservé, chiffré, et lié à ses actions. L’historique de la SCI devient un registre consultable en quelques secondes.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Comment suivre les échéances d’une SCI sans secrétaire ?',
        a: 'BRAINMAIL analyse le courrier de la SCI dès son arrivée : impôts, appels de fonds, assurances, artisans. Chaque date devient une échéance confirmée et rappelée par email, avec la citation du document qui prouve la date.',
      },
      {
        q: 'Où adresse-t-on le courrier de la SCI ?',
        a: 'Chaque espace BRAINMAIL dispose d’une adresse email dédiée de type bm.…@in.brainmail.ai pour les expéditeurs numériques. Pour le papier, vous scannez chaque courrier depuis votre téléphone : aucun changement d’adresse officielle n’est nécessaire.',
      },
      {
        q: 'Les associés peuvent-ils consulter les documents de la SCI ?',
        a: 'Le service gère des rôles : le propriétaire de l’espace peut donner un accès membre aux associés ou au comptable, qui consultent les documents et dossiers avec leurs propres identifiants.',
      },
      {
        q: 'Que coûte la gestion du courrier d’une SCI ?',
        a: 'Le palier Solo, à 29 € HT par mois, couvre une société et 50 courriers par mois avec les rappels email. Si vous gérez plusieurs structures, le palier Pro à 59 € HT couvre trois sociétés et 200 courriers.',
      },
      {
        q: 'L’IA lit-elle mes documents confidentiels de manière sûre ?',
        a: 'Les documents sont chiffrés au repos (AES-256-GCM) et stockés en Europe. L’analyse est réalisée par Mistral, entreprise française, en appel direct à son API européenne — un seul sous-traitant d’IA, aucun intermédiaire. Aucune donnée n’entraîne de modèle.',
      },
    ],
    related: [
      { slug: 'courrier-multi-societes', label: 'Dirigeants multi-sociétés' },
      { slug: 'courrier-auto-entrepreneur', label: 'Artisans et indépendants' },
    ],
  },
];
