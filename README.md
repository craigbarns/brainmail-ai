# BRAINMAIL.ai

SaaS de gestion du courrier, indépendant de PropertyOS. Next.js + TypeScript, PostgreSQL, stockage privé S3, hébergement prévu sur Railway. Aucun service Supabase ni Vercel.

**Parcours prioritaire :** QR temporaire → photos multipages → synchronisation ordinateur → Mistral OCR → analyse OpenRouter → classement → échéance à confirmer → réponse à relire.

## Démarrage en cinq minutes

Prérequis : Node.js 22 LTS et npm. Le dépôt est public : n'y placez jamais de
clé ni de donnée réelle.

```sh
npm ci
npm run setup:local
npm run dev
```

Ouvrir <http://localhost:3000>, créer un compte et un espace. Les mots de passe comportent au moins 12 caractères. En développement local seulement, la vérification email est désactivée et le worker tourne dans le processus web. Une base PostgreSQL embarquée PGlite et des fichiers chiffrés sont conservés sous `.data/`. Il n’y a aucune donnée de démonstration ni résultat IA simulé dans l’application.

Le fichier `.env.local` est **masqué** dans Finder. Sur macOS :

```sh
open -a TextEdit .env.local
```

Ajouter vos clés dans ce fichier puis redémarrer le serveur. Ne jamais les envoyer dans un chat ni les ajouter au dépôt. `npm run setup:local` ne remplace jamais un fichier existant. `STORAGE_ENCRYPTION_KEY` est générée aléatoirement : la perdre rend les fichiers déjà enregistrés illisibles.

Sans clés IA, capture, stockage, authentification et navigation fonctionnent. L’analyse passe en erreur explicite « non configuré » et peut être relancée après configuration. Les rappels sont inactifs sans Resend. Les indicateurs de connexion affichent la présence de configuration, pas une preuve de validité des clés.

### Utiliser un vrai téléphone en local

`localhost` sur le téléphone désigne le téléphone lui-même. Sur un réseau privé de confiance, définir `APP_URL=http://ADRESSE_LAN_DU_MAC:3000`, redémarrer, puis ouvrir **cette même adresse sur l’ordinateur** avant de générer le QR. Les deux appareils doivent pouvoir communiquer. Pour un accès distant, préférer le domaine HTTPS Railway configuré. L’application utilise la sélection/capture photo du navigateur ; aucune application native à installer. Les images HEIC doivent être exportées en JPEG avant import si le navigateur ne les convertit pas.

### PostgreSQL local complet (facultatif)

```sh
docker compose up -d postgres
```

Définir `DATABASE_URL=postgresql://brainmail:local-development-only@localhost:5432/brainmail`, puis `npm run db:migrate`. Le mot de passe de `compose.yaml` est uniquement destiné au développement et le port est lié à `127.0.0.1`. Garder `LOCAL_DEV=true` pour le worker local ; ne pas lancer un second worker avec PGlite.

## Fonctionnalités livrées

- Inscription, connexion, déconnexion, mots de passe scrypt avec sel aléatoire ; vérification d’email en production. `SIGNUP_EMAIL_ALLOWLIST` s’applique dès qu’il est défini (espaces et casse tolérés) et reste obligatoire en production.
- Plusieurs sociétés par utilisateur, création et changement d’espace, contrôle d’appartenance à chaque requête. Chaque document, fichier, action et tâche est rattaché à un espace.
- Capture sécurisée : secret 256 bits placé dans le fragment du lien QR, empreinte stockée en base, association atomique à un seul téléphone, expiration de 15 minutes, révocation et finalisation depuis l’ordinateur. Le téléphone ne peut pas lire les courriers.
- Photos JPEG/PNG/WebP, décodées et réencodées sans métadonnées GPS ; PDF lisibles de 20 pages maximum. 15 Mo par fichier, 20 fichiers et 50 Mo par courrier. Les originaux photo sont normalisés en JPEG ; ce produit n’est pas un système d’archivage probant.
- Stockage AES-256-GCM côté application, données authentifiées liées à l’espace/document/fichier, bucket privé. Aucun lien public aux originaux. Téléchargement par une route authentifiée.
- Dashboard, recherche sur titre/expéditeur/résumé/dossier, classement éditable, dossiers, archive et désarchivage. **Suppression définitive** d’un courrier et de ses fichiers (droit à l’effacement RGPD) ; la révocation d’un QR supprime aussi la capture abandonnée.
- OCR Mistral puis JSON structuré OpenRouter validé côté serveur. Le texte documentaire est traité comme donnée non fiable. Pas de navigation vers les liens du courrier, de paiement ni d’envoi autonome.
- Calendrier mensuel et actions éditables. Une date sans citation correspondante est retirée ; toutes les actions nécessitent confirmation humaine avant rappels. Dates sans heure, rappel selon Europe/Paris.
- Réponse éditable, validation explicite et copie. Toute modification dans l’éditeur retire la validation. **Aucun envoi de réponse automatique.**
- Worker PostgreSQL durable : prise exclusive des tâches, bail renouvelable, protection contre les workers obsolètes, quatre tentatives maximum, délais exponentiels, relance depuis l’interface, conservation du texte OCR entre reprises. Nettoyage horaire des sessions, tokens, compteurs, captures et jobs terminés expirés.
- Rappels Resend aux membres vérifiés, seulement pour les actions confirmées non terminées dont l’échéance est aujourd’hui ou demain, par lot de dix par minute. Email générique sans contenu du courrier. Déduplication en base et clé d’idempotence Resend ; après 23 heures d’incertitude, revue manuelle plutôt qu’un renvoi risqué. Les tentatives de connexion sont limitées par email **et par IP**.
- Réception Resend / Inboxes derrière un indicateur d’activation : webhook signé, boîte exacte rattachée à la société, déduplication par email, récupération du contenu et des pièces jointes, même pipeline documentaire. Provisionnement d’une adresse aléatoire par espace, **changeable** si divulguée, et quota de 50 réceptions/jour/espace pour borner les analyses déclenchées, actions de l’agent Resend désactivées.
- Mem0 facultatif : synchronisation des seules préférences explicites, espace isolé par `user_id`, recherche de contexte. Les souvenirs dont l’empreinte ne correspond pas aux préférences PostgreSQL actuelles sont ignorés. Une panne Mem0 ne bloque pas l’analyse. Désactiver arrête les échanges futurs ; la suppression distante reste une opération de gestion à prévoir.

## Configuration

Toutes les variables sont décrites dans `.env.example`. Aucune clé secrète ne doit avoir le préfixe `NEXT_PUBLIC_`.

| Variable                                           | Usage                                                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `APP_URL`                                          | Origine exacte de l’application, QR et liens email ; HTTPS en production                        |
| `EXTRA_ORIGINS`                                    | Origines supplémentaires acceptées pour les requêtes navigateur, ex. `https://www.brainmail.ai` |
| `DATABASE_URL`                                     | Connexion PostgreSQL privée Railway                                                             |
| `SIGNUP_EMAIL_ALLOWLIST`                           | Liste d’emails autorisés à créer un compte pendant le pilote                                    |
| `STORAGE_ENCRYPTION_KEY`                           | 32 octets en base64, identiques pour web et worker                                              |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`            | Paramètres du bucket privé Railway                                                              |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`         | Identifiants du bucket, uniquement côté serveur                                                 |
| `MISTRAL_API_KEY`, `MISTRAL_OCR_MODEL`             | OCR ; modèle par défaut `mistral-ocr-latest`                                                    |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`           | Modèle explicitement choisi, compatible `json_schema` et politique `data_collection: deny`      |
| `RESEND_API_KEY`, `RESEND_FROM`                    | Vérification email et rappels, expéditeur sur domaine vérifié                                   |
| `RESEND_INBOUND_API_KEY`                           | Clé du compte Resend dédié à la réception ; à défaut `RESEND_API_KEY` est utilisée              |
| `RESEND_INBOUND_ENABLED`                           | `false` jusqu’à validation de la réception et des signatures                                    |
| `RESEND_INBOUND_DOMAIN`                            | Sous-domaine dédié, normalement `in.brainmail.ai`                                               |
| `RESEND_WEBHOOK_SECRET`                            | Secret du webhook Resend de cet environnement                                                   |
| `RESEND_ATTACHMENT_HOSTS`                          | Liste d’hôtes HTTPS **exacts** observés pour les téléchargements Resend, sans wildcard          |
| `MEM0_API_KEY`                                     | Mémoire contextuelle optionnelle                                                                |
| `LOCAL_DEV`, `LOCAL_DB_PATH`, `LOCAL_STORAGE_PATH` | Développement uniquement ; stockage local et PGlite refusés en production                       |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`       | Emplacements réservés ; abonnement et facturation hors MVP actuel                               |

Les services externes sont appelés par le worker. Mistral reçoit les fichiers à analyser ; OpenRouter reçoit le texte extrait et le contexte sélectionné. Mem0 ne reçoit pas les courriers. Les restrictions réseau et les choix de modèles devront être validés avec les comptes réellement utilisés.

## Déploiement Railway

Le dépôt contient un `Dockerfile` et les migrations SQL. La configuration des services (commande de démarrage, migration préalable, contrôle de santé) est saisie dans les réglages Railway de chaque service, il n’y a plus de fichier `railway.json`. Voir [l’état de livraison](docs/DELIVERY.md).

1. Créer un projet **BRAINMAIL** isolé, choisir une région adaptée, ajouter PostgreSQL et un bucket privé Railway.
2. Service `web` : **Settings → Source**, connecter le dépôt GitHub privé, branche `main`. Construction par le `Dockerfile`, commande de pré-déploiement `npm run db:migrate`, démarrage `npm start`, contrôle de santé `/api/health`.
3. Service `worker` : même dépôt et même branche, même pré-déploiement, démarrage `npm run worker`, sans domaine ni contrôle HTTP. Les deux migrations sont sérialisées par verrou PostgreSQL. Relier **les deux** services à GitHub : un `railway up` manuel ne laisse aucun commit associé et peut faire tourner web et worker sur deux versions différentes.
4. Renseigner les variables privées des deux services. `DATABASE_URL` référence la base du projet. Les variables S3 reprennent exactement les valeurs du bucket. Railway utilise des URL virtual-hosted, donc `S3_FORCE_PATH_STYLE=false`. Aucun volume partagé entre web et worker n’est nécessaire.
5. Générer `STORAGE_ENCRYPTION_KEY` (`openssl rand -base64 32`) et conserver sa sauvegarde sécurisée. Renseigner la **même valeur** pour les deux services. Ne pas réutiliser la clé locale avec de nouvelles données réelles par défaut.
6. Définir `LOCAL_DEV=false`, `STORAGE_DRIVER=s3`, `APP_URL` sur l’URL HTTPS choisie. Renseigner l’email propriétaire dans `SIGNUP_EMAIL_ALLOWLIST` et les clés Mistral/OpenRouter/Resend. Ne pas activer la réception avant sa configuration complète.
7. Service `Postgres` : onglet **Backups**, activer une sauvegarde quotidienne avant toute donnée réelle, puis tester une restauration.
8. Déployer web et worker. Vérifier les migrations, le statut sain, un HTTP 200 sur `/api/health`, la connexion, un upload réel et son téléchargement, puis le traitement d’un courrier test non confidentiel.
9. Observer le résultat OCR, le classement, la citation de date, la confirmation d’action, le brouillon et un rappel de test. Une compilation réussie ne valide pas ces services externes.

Le conteneur tourne sous un utilisateur non privilégié. PostgreSQL reste la source de vérité. Le worker se ferme proprement sur SIGTERM. Le pilote utilise une seule réplique web et une seule réplique worker ; le verrouillage des tâches permet d’ajouter des workers, sous réserve de tests de charge et de quotas adaptés.

### Domaines BRAINMAIL.ai

Aucun accès DNS n’est présumé et aucune cible DNS n’est inventée.

| Nom                | Destination prévue                                                          |
| ------------------ | --------------------------------------------------------------------------- |
| `www.brainmail.ai` | Service web, page commerciale `/`                                           |
| `app.brainmail.ai` | Service web, application `/app` et connexion `/login`                       |
| `api.brainmail.ai` | Facultatif, non configuré aujourd’hui ; séparation future possible          |
| `in.brainmail.ai`  | Réception email Resend, avec ses propres enregistrements fournis par Resend |

Ajouter chaque domaine HTTP dans les réglages Railway, puis recopier chez le gestionnaire DNS les **CNAME et éventuels enregistrements de validation fournis pour ce service**. Attendre la validation du certificat HTTPS. `APP_URL=https://app.brainmail.ai`. Le navigateur de l’application appelle `/api` sur `app.brainmail.ai` ; les cookies restent limités à cet hôte. `api.brainmail.ai` n’est pas une API publique avec clés clientes et n’expose pas les sessions à d’autres sous-domaines.

Après ajout DNS, vérifier les réponses HTTPS pour les trois noms, les liens de connexion et les QR générés. Ne pas remplacer les MX existants de `brainmail.ai` : configurer uniquement le sous-domaine email décidé. Une redirection du domaine racine `brainmail.ai` vers `www` peut être ajoutée chez le gestionnaire DNS/hébergement si souhaitée.

### Resend Inboxes et réception

Dans Resend, vérifier les domaines d’envoi et de réception, configurer les enregistrements requis, puis créer un webhook vers `https://app.brainmail.ai/api/webhooks/resend` (ou `api.brainmail.ai` une fois ce domaine réellement configuré) avec `email.received` et `inbox.email.received`. Copier son secret dans les deux services, activer `RESEND_INBOUND_ENABLED=true`, et activer une boîte dans les préférences de l’espace.

Les pièces jointes sont téléchargées uniquement depuis les hôtes exacts configurés dans `RESEND_ATTACHMENT_HOSTS`, sans redirection. Ne jamais autoriser un hôte fourni directement par un expéditeur. Les pièces jointes Office, archives et fichiers exécutables sont refusés ; l’échec apparaît dans les tâches de réception. L’intégration Inboxes utilise l’API de récupération des pièces jointes reçues par `email_id` : ce point doit être validé avec un email réel du compte Resend avant activation du pilote. Les emails uniquement HTML sont conservés comme originaux JSON mais l’analyse du corps nécessite une version texte ; aucune page HTML non fiable n’est affichée.

## Vérifications

```sh
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Sur macOS avec Chrome déjà installé :

```sh
PLAYWRIGHT_CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' npm run test:e2e
```

Les tests serveur utilisent le moteur PostgreSQL embarqué PGlite et les vrais contrôles de fichiers/chiffrement. Les fournisseurs externes sont simulés **uniquement dans les tests**. Le test navigateur démarre un serveur isolé sur 3100, utilise deux contextes (ordinateur et téléphone), contrôle la synchronisation et exige une erreur explicite en l’absence de clé IA. La CI GitHub exécute types, tests, build et navigateur sans secrets.

Le test avec PostgreSQL Railway, S3 Railway et les APIs réelles est une étape distincte de recette, pas couvert par les mocks.

## Exploitation et limites du pilote

- Migrations immuables versionnées sous `db/`, appliquées avec checksum et transaction. Ajouter de nouveaux fichiers pour évoluer ; ne pas modifier une migration déjà appliquée. Le runner actuel accepte du SQL simple séparé par `;`, pas de blocs procéduraux contenant des points-virgules.
- Sauvegarder PostgreSQL, le bucket **et** la clé de chiffrement ; effectuer une restauration de test avant des données de production. La suppression/rétention automatique, l’export complet de compte et la rotation de clé avec rechiffrement ne sont pas encore livrés.
- Fichiers privés ne signifie pas chiffrement de bout en bout : le serveur doit les déchiffrer pour l’OCR. Les textes extraits et métadonnées sont stockés dans PostgreSQL. Ne jamais exposer la base ou ses identifiants au navigateur.
- Le stockage privé et le décodage des images ne remplacent pas un antivirus. Les PDF sont téléchargés en pièce jointe, jamais exécutés ni affichés dans un iframe. Ajouter une quarantaine antivirus avant ouverture du pilote à des expéditeurs inconnus.
- Les erreurs de réception et mémoire sont visibles dans Préférences ; les détails opérationnels figurent dans `jobs`. Pour relancer un job d’intégration après correction, un opérateur autorisé peut remettre **le job concerné uniquement** à `queued`, `attempts=0`, `run_at=now()`. Aucun texte de courrier ni clé n’est journalisé.
- Les fichiers devenus orphelins lors d’un crash entre stockage et transaction nécessitent une réconciliation bucket/base ; aucune purge automatique n’est activée.
- Les limites de requêtes applicatives sont en base et par compte/action. Ajouter des limites réseau/IP au frontal avant ouverture publique. Les tables de sessions, tokens et limites expirés nécessitent une tâche de maintenance périodique.
- Rappels traités à raison d’un envoi par cycle minute dans cette première version. Pour du volume, augmenter le lot avec les limites Resend. L’échec dépassant 23 heures passe en revue manuelle. La livraison finale d’un email n’est pas suivie par webhook dans ce MVP.
- Pas encore : récupération de mot de passe, invitation d’autres utilisateurs, MFA/SSO, abonnement Stripe, suppression de compte, recadrage/réorganisation des photos, PDF de réponse, envoi de réponse ni archivage à valeur probante. Ces points n’empêchent pas le parcours prioritaire du pilote privé, mais empêchent de présenter cette version comme une ouverture SaaS commerciale complète.

## Références d’intégration

Contrats consultés pendant le développement : [Mistral OCR](https://docs.mistral.ai/api/endpoint/ocr), [sorties structurées OpenRouter](https://openrouter.ai/docs/guides/features/structured-outputs), [Railway Buckets](https://docs.railway.com/storage-buckets), [réception Resend](https://resend.com/docs/dashboard/receiving/get-email-content), [création d’Inbox](https://resend.com/docs/api-reference/inboxes/create-inbox), [mémoire Mem0](https://docs.mem0.ai/api-reference/memory/add-memories), [recherche Mem0](https://docs.mem0.ai/api-reference/memory/search-memories).
