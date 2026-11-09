# État de livraison — 9 novembre 2026

## Réalisé

Application Next.js/TypeScript, migrations PostgreSQL, stockage privé chiffré, authentification et isolation par société, scanner temporaire multipage, import PDF, pipeline durable, calendrier/actions, archives et brouillons validables. Adaptateurs Mistral/OpenRouter/Resend/Mem0 préparés. Configuration Docker et Railway web/worker, variables et guide DNS livrés.

## Accès inspectés

- GitHub : connexion du compte `craigbarns` vérifiée. Aucun dépôt `brainmail-ai` n’existait au début du travail. Le dépôt [craigbarns/brainmail-ai](https://github.com/craigbarns/brainmail-ai) a ensuite été créé et sa visibilité privée vérifiée ; le code est publié sur `main`.
- Railway : connexion existante vérifiée, projets accessibles listés ; aucun projet BRAINMAIL identifié dans cette liste. Aucun projet existant modifié.
- Clés Mistral, OpenRouter, Resend et Mem0 : absentes de la configuration initiale. Un fichier local masqué `.env.local` a été créé pour leur saisie sécurisée et ouvert dans TextEdit à la demande de l’utilisateur.
- DNS : aucun gestionnaire DNS ni accès établi. Aucun enregistrement modifié.

## Vérifié localement

- 15 tests serveur passent : authentification, CSRF, QR à usage unique/expiration, multipage, isolation des documents/fichiers/actions/espaces, chiffrement, validation PDF/image/date, jobs concurrents/baux/reprises, erreurs sans clés, contrats OCR/LLM, signatures webhook/déduplication, rappels et isolation mémoire.
- Vérification TypeScript et build Next.js réussis.
- Test navigateur manuel automatisé : inscription, connexion, QR, sélection d’image sur viewport mobile, synchronisation, finalisation, calendrier et préférences réussis.
- Test navigateur reproductible `tests/browser.spec.ts` : 1 test réussi (8,9 secondes) avec contextes ordinateur et téléphone isolés.

## Validation GitHub

[Le contrôle GitHub Actions](https://github.com/craigbarns/brainmail-ai/actions/runs/42651479131) a réussi sur le commit `d71a63f` : installation propre sous Node.js 22, TypeScript, 15 tests serveur, build de production et test navigateur Chromium. Les changements ultérieurs de ce document ne modifient pas le code testé.

## À valider avec les accès réels

OCR Mistral et modèle OpenRouter choisis, délivrabilité/verification Resend, rappel reçu, réception Inboxes et téléchargement de pièce jointe, Mem0, bucket et PostgreSQL Railway, déploiement sain et HTTPS des domaines.

Aucun déploiement Railway n’a été effectué, aucun service PostgreSQL/bucket Railway n’a été provisionné, et aucun domaine DNS n’a été raccordé. Le conteneur Docker est préparé mais sa construction et son exécution sur Railway restent à valider. Les résultats IA des tests sont des fixtures ; ils ne constituent pas une preuve de fonctionnement des comptes API réels.
