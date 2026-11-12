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
  crumb: string; // short label for the breadcrumb
  summary: string; // two sentences an assistant can quote as the answer
  intro: string[];
  sections: SeoSection[];
  faqs: SeoFaq[];
  related: { slug: string; label: string }[];
};

export const SEO_PAGES: SeoPage[] = [

  {
    slug: 'courrier-expatrie',
    title: 'Courrier des expatriés : lire son courrier français de l’étranger',
    description:
      'Impôts, banque, retraite, huissiers : votre courrier français continue d’arriver. BRAINMAIL le lit, en extrait les échéances et vous rappelle — où que vous soyez. Dès 29 € HT/mois.',
    h1: 'Expatrié : votre courrier français, lu et géré depuis l’étranger',
    eyebrow: 'EXPATRIÉS · FRONTALIERS · NOMADES DIGITAUX',
    crumb: 'Expatriés',
    summary:
      'BRAINMAIL fait lire le courrier français des expatriés : scan ou email dédié, échéances sourcées avec citation, brouillons validables à distance. L’adresse physique reste la vôtre ; le contrôle devient numérique.',
    intro: [
      'Partir vivre à l’étranger ne fait pas disparaître le courrier français : les avis d’imposition, les courriers de la banque, les attestations de retraite, les recommandés de l’administration continuent d’arriver à une adresse française. Et quand on est à douze heures de décalage, une échéance ratée coûte cher.',
      'BRAINMAIL devient votre centre de contrôle numérique : le courrier qui arrive en France est scanné ou reçu par email, l’IA en extrait les échéances avec la citation qui prouve la date, et les réponses sont préparées en brouillon — validables depuis n’importe quel fuseau horaire.',
    ],
    sections: [
      {
        h2: 'Ce que les expatriés font aujourd’hui — et ce que ça coûte',
        paras: [
          'Trois solutions dominent, chacune imparfaite : donner l’adresse de ses parents (avec le risque d’oubli et l’effet « boîte aux lettres noire »), payer la réexpédition internationale de La Poste (le papier voyage, s’abîme, et ne couvre pas tout), ou souscrire une domiciliation (un coût fixe qui ne lit rien pour vous).',
          'Dans tous les cas, le problème reste le même : quelque part en France, un document s’accumule, et c’est VOTRE échéance. Aucune de ces solutions ne lit, ne classe et ne rappelle.',
        ],
      },
      {
        h2: 'La méthode BRAINMAIL : l’adresse reste, le contrôle devient numérique',
        paras: [
          'Vous gardez une adresse en France — chez un proche, via une société de domiciliation ou une réexpédition. Ce qui change : chaque document qui y arrive est scanné en quelques secondes (depuis un téléphone, même par un proche) ou reçu directement sur l’adresse email dédiée de votre espace.',
          'L’IA lit le document, le classe, extrait les échéances avec leur citation, prépare les brouillons de réponse et déclenche les rappels par email. Vous validez depuis Singapour, Montréal ou Dubaï : la décision reste la vôtre, l’exécution devient systématique.',
        ],
        points: [
          'Aucune application à installer : une page web, un QR code temporaire',
          'Réception email directe pour les expéditeurs numériques (impots.gouv notifications, banques, assurances)',
          'Échéances sourcées : la date est prouvée par la citation du document',
          'Brouillons de réponse validables à distance — rien ne part sans vous',
          'Données chiffrées AES-256-GCM, stockées en Europe, analyse par Mistral (France)',
        ],
      },
      {
        h2: 'Un dossier par document, un historique pour votre retour',
        paras: [
          'Chaque courrier devient un dossier suivi : reçu, lu, échéance confirmée, réponse envoyée, clôturé. Au moment du retour en France, du bilan annuel avec votre comptable ou d’un contrôle, tout l’historique est consultable et daté — pas de carton perdu, pas de « il paraît que c’est arrivé en mars ».',
        ],
      },
    ],
    faqs: [
      {
        q: 'Comment recevoir son courrier français quand on est expatrié ?',
        a: 'Il faut une adresse physique en France : chez un proche, une société de domiciliation ou une réexpédition La Poste. BRAINMAIL prend ensuite le relais : chaque document qui y arrive est scanné ou reçu par email, lu par l’IA, et ses échéances vous sont rappelées où que vous soyez.',
      },
      {
        q: 'La réexpédition de La Poste suffit-elle à l’étranger ?',
        a: 'La réexpédition internationale fait voyager le papier : lenteur, frais au volume, et un courrier égaré reste égaré. La complémentarité gagnante : faire scanner chaque document à l’arrivée en France et le lire immédiatement dans BRAINMAIL — le papier peut voyager plus tard, ou pas du tout.',
      },
      {
        q: 'Mes parents peuvent-ils scanner mon courrier pour moi ?',
        a: 'Oui : le scan se fait depuis une simple page web avec un QR code temporaire — aucune application à installer. Un proche photographie les pages du courrier, elles arrivent dans votre espace, et vous les lisez depuis l’étranger dans la minute.',
      },
      {
        q: 'Puis-je gérer les courriers de plusieurs pays ou sociétés ?',
        a: 'Chaque espace BRAINMAIL couvre une société ou un usage dédié. Le palier Pro (3 sociétés) et le palier Cabinet (10 sociétés) permettent de séparer par exemple une SCI restée en France et l’activité expatriée, avec des échéances distinctes.',
      },
      {
        q: 'Mes documents sont-ils accessibles si je change de pays ?',
        a: 'Oui, l’accès est un service web : vous vous connectez depuis n’importe quel appareil connecté. Vos documents sont chiffrés et stockés en Europe, et l’analyse est assurée par Mistral (France) — un seul sous-traitant d’IA.',
      },
    ],
    related: [
      { slug: 'reexpedition-courrier', label: 'Réexpédition de courrier : le comparatif' },
      { slug: 'courrier-multi-societes', label: 'Dirigeants multi-sociétés' },
    ],
  },
  {
    slug: 'reexpedition-courrier',
    title: 'Réexpédition de courrier à l’étranger : comparatif des solutions',
    description:
      'La Poste, adresse d’un proche, domiciliation, scan numérique : ce que vaut chaque solution pour gérer son courrier français depuis l’étranger — et comment les combiner.',
    h1: 'Réexpédition du courrier à l’étranger : ce que chaque solution vaut vraiment',
    eyebrow: 'COMPARATIF · EXPATRIÉS · MOBILITÉ INTERNATIONALE',
    crumb: 'Réexpédition',
    summary:
      'Comparatif honnête des solutions de réexpédition de courrier à l’étranger (La Poste, proche, domiciliation) et du complément numérique : scan à la source, échéances rappelées, réponses préparées.',
    intro: [
      'Avant de partir vivre à l’étranger, la question du courrier arrive vite : que deviennent les avis d’imposition, les courriers de la banque, les recommandés ? Les solutions existent, mais aucune ne fait tout — et les comparer honnêtement évite les mauvaises surprises.',
      'Voici les quatre options, ce qu’elles coûtent, ce qu’elles couvrent, et comment les combiner pour un dispositif qui tient la distance.',
    ],
    sections: [
      {
        h2: 'Les quatre solutions, en clair',
        paras: [
          '1. La réexpédition internationale de La Poste : le papier est renvoyé vers votre adresse étrangère. Points forts : officielle, simple à activer. Limites : durée limitée, coûts par volume, lenteur du transport, courriers égarés non récupérables, et rien ne lit le contenu pour vous.',
          '2. L’adresse d’un proche : gratuite et souple. Limites : c’est une faveur durable, la boîte aux lettres se remplit, et aucun rappel n’existe pour les échéances qui s’y entassent.',
          '3. La domiciliation commerciale : une adresse professionnelle et une gestion du réacheminement. Limites : coût mensuel récurrent, et là encore personne ne lit ni ne classe le contenu.',
          '4. La lecture numérique : chaque document est scanné à son arrivée en France et devient un dossier lu, classé, avec des échéances rappelées. C’est le rôle de BRAINMAIL — complémentaire des trois autres, jamais concurrent.',
        ],
      },
      {
        h2: 'Ce que la réexpédition ne règle pas',
        paras: [
          'Réexpédier le papier déplace le problème : vous recevez en Inde ou au Canada des documents que vous devez toujours lire, dater et traiter — dans une langue, un calendrier et un fuseau horaire qui ne sont pas ceux de l’administration française.',
          'Et le courrier urgent (huissier, impôts avec délai court, assurance) n’attend pas deux semaines d’acheminement. C’est précisément ce trou que comble le scan à la source : le document est lu le jour où il arrive, pas le mois où il arrive.',
        ],
        points: [
          'Scan à la source : lecture le jour même, depuis n’importe quel fuseau horaire',
          'Échéances extraites avec la citation qui prouve la date dans le document',
          'Rappels par email sur les horloges du service — pas de courrier perdu',
          'Brouillons de réponse préparés et validés à distance',
          'Historique daté et consultable — utile au retour en France ou en cas de contrôle',
        ],
      },
      {
        h2: 'Le dispositif recommandé',
        paras: [
          'Adresse physique : un proche ou une domiciliation selon votre situation (la réexpédition La Poste seule ne couvre ni la durée ni les recommandés dans certains cas). Lecture et suivi : BRAINMAIL, dès 29 € HT par mois, avec 3 mois offerts pour le premier essai via le code pilote.',
          'Vos documents restent chiffrés et stockés en Europe, analysés par Mistral (France). Rien ne part sans votre validation — vous gardez le contrôle depuis l’autre bout du monde.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Quelle est la meilleure solution pour recevoir son courrier à l’étranger ?',
        a: 'Il n’y en a pas une seule : une adresse physique en France (proche ou domiciliation) combinée à une lecture numérique type BRAINMAIL donne le meilleur résultat — le document est lu le jour de son arrivée, ses échéances sont rappelées, et rien ne dépend de l’acheminement international du papier.',
      },
      {
        q: 'Combien coûte la réexpédition internationale de La Poste ?',
        a: 'Le tarif dépend de la destination et de la durée (formules de quelques mois, au volume). À cela s’ajoute l’inconvénient principal : vous recevez le papier sans lecture, classement ni rappel des échéances. BRAINMAIL complète ce dispositif pour 29 € HT par mois.',
      },
      {
        q: 'Peut-on faire suivre un recommandé à l’étranger ?',
        a: 'Un recommandé se réexpédie parfois, mais sa valeur juridique et sa rapidité en souffrent. La méthode fiable : le faire scanner à l’arrivée en France pour en prendre connaissance immédiatement, puis décider — répondre, mandater un proche, ou faire suivre si nécessaire.',
      },
      {
        q: 'BRAINMAIL fournit-il une adresse postale ?',
        a: 'Non — et c’est assumé : BRAINMAIL est la couche numérique qui lit, classe, extrait les échéances et prépare les réponses. L’adresse physique reste la vôtre (proche, domiciliation). Cela évite tout conflit avec les exigences d’adresse officielle de l’administration française.',
      },
      {
        q: 'Comment tester la lecture numérique de mon courrier ?',
        a: 'Créez votre espace sur www.brainmail.ai, choisissez le palier Solo et utilisez le code pilote fourni par votre contact : trois mois offerts pour valider le dispositif avant votre départ ou pendant votre expatriation, sans engagement.',
      },
    ],
    related: [
      { slug: 'courrier-expatrie', label: 'Le courrier des expatriés' },
      { slug: 'courrier-multi-societes', label: 'Dirigeants multi-sociétés' },
    ],
  },

  {
    slug: 'courrier-auto-entrepreneur',
    crumb: 'Auto-entrepreneurs',
    summary:
      'BRAINMAIL lit les courriers d’un auto-entrepreneur (URSSAF, impôts, assurances, factures) depuis une photo prise au téléphone, en extrait chaque échéance avec la phrase du document qui la prouve, et envoie un rappel par email avant la date. Palier Solo : 29 € HT par mois, sans engagement.',
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
    crumb: 'Multi-sociétés',
    summary:
      'BRAINMAIL donne un espace séparé à chaque société (holding, SCI, société d’exploitation) et réunit toutes leurs échéances dans un seul calendrier, chacune prouvée par une citation du courrier. Palier Pro : 59 € HT par mois pour 3 sociétés, sans engagement.',
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
        a: 'Aujourd’hui, vous partagez un document en le téléchargeant ou en copiant son résumé et sa réponse : tout reste lisible sans BRAINMAIL. L’invitation d’un comptable ou d’un associé avec son propre accès est en préparation ; elle sera annoncée sur cette page.',
      },
      {
        q: 'Combien coûte le suivi du courrier de trois sociétés ?',
        a: 'Le palier Pro coûte 59 € HT par mois pour 3 sociétés et 200 courriers par mois. Au-delà de 3 sociétés, le palier Cabinet couvre jusqu’à 10 sociétés pour 149 € HT par mois.',
      },
    ],
    related: [
      { slug: 'courrier-sci', label: 'Propriétaires de SCI' },
      { slug: 'courrier-expert-comptable', label: 'Cabinets comptables' },
    ],
  },
  {
    slug: 'courrier-expert-comptable',
    crumb: 'Experts-comptables',
    summary:
      'BRAINMAIL permet à un cabinet comptable de regrouper jusqu’à dix espaces de sociétés dans son propre compte et de suivre leurs courriers et échéances, sans accès client distinct à ce stade. Palier Cabinet : 149 € HT par mois pour 10 sociétés maximum.',
    title: 'Le suivi du courrier pour les cabinets et experts-comptables',
    description:
      'Centralisez les courriers des sociétés que vous gérez : BRAINMAIL extrait les échéances sourcées, dans des espaces distincts accessibles à votre compte. 149 € HT/mois pour 10 sociétés.',
    h1: 'Suivi du courrier et des échéances clients pour experts-comptables',
    eyebrow: 'EXPERTS-COMPTABLES · GESTIONNAIRES · SYNDICS',
    intro: [
      'Un cabinet gère des dizaines de sociétés clientes, et le courrier reste le point aveugle : l’avis URSSAF qui traîne chez le client, l’assurance relue trop tard, la date de télédéclaration découverte après la date limite.',
      'BRAINMAIL peut centraliser le courrier des sociétés dont vous gérez directement les espaces. Chaque espace garde ses documents et échéances séparés, dans la limite du palier souscrit.',
    ],
    sections: [
      {
        h2: 'Le courrier, l’angle mort de la mission',
        paras: [
          'Vous produisez les comptes et les déclarations, mais une part du risque naît avant vous : dans le courrier que le client reçoit et oublie. Chaque majoration, chaque perte de droit, chaque pénalité de retard est d’abord un courrier mal traité chez le client.',
          'En traitant les documents que vous recevez ou numérisez, vous suivez les échéances des sociétés rattachées à votre compte, sans prétendre donner un accès autonome aux clients.',
        ],
      },
      {
        h2: 'Le palier Cabinet, pensé pour votre portefeuille',
        paras: [
          'Jusqu’à 10 sociétés pour 149 € HT par mois, dans une limite de 1 000 courriers par mois. 1 000 courriers par mois, support prioritaire, onboarding accompagné.',
          'L’IA prépare les brouillons de réponse — courriers de relance, demandes d’attestation, réponses aux administrations — et rien ne part sans validation : la vôtre ou celle du client. L’utilisateur du compte garde le contrôle du contenu.',
        ],
        points: [
          'Jusqu’à 10 sociétés avec le palier Cabinet',
          'Échéances sourcées : la preuve et la confirmation restent dans chaque espace',
          'Brouillons préparés par l’IA, validés avant tout envoi',
          'Historique consultable par document et par dossier suivi',
          'IA et données en Europe : Mistral (France), stockage chiffré AES-256-GCM',
        ],
      },
      {
        h2: 'Une intégration en une réunion',
        paras: [
          'Vous créez les espaces des sociétés gérées et importez leurs courriers par scan, PDF ou adresse de réception dédiée. Aucune installation, aucune formation : la page de scan est une page web.',
          'Programme pilote fondateur : trois mois offerts pour les premiers cabinets qui nous font leur retour d’expérience. Demandez-le à votre contact BRAINMAIL.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Comment un cabinet peut-il suivre le courrier de ses clients ?',
        a: 'Avec BRAINMAIL, le cabinet peut gérer jusqu’à dix espaces de sociétés sous son propre compte : courriers numérisés, échéances avec citation, brouillons à relire et rappels. L’accès indépendant des clients n’est pas encore disponible.',
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
        a: '149 € HT par mois pour 10 sociétés maximum et 1 000 courriers par mois. Support prioritaire et onboarding accompagné inclus. Sans engagement, résiliation en un clic.',
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
    crumb: 'SCI',
    summary:
      'BRAINMAIL suit le courrier d’une SCI (avis d’impôts, appels de fonds, assurances, courriers de locataires) à partir d’une photo, garde l’historique de chaque document et rappelle les échéances par email, chacune prouvée par une citation. À partir de 29 € HT par mois.',
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
          'Dossiers suivis jusqu’à la clôture, avec tout l’historique',
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
        a: 'Pas encore avec leur propre accès : cette invitation est en préparation. Dès maintenant, chaque document et sa réponse se téléchargent et se transmettent en un clic, et l’historique de la SCI reste conservé et chiffré dans l’espace.',
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
