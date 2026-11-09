# État de livraison — 9 novembre 2026

## Réalisé

Application Next.js/TypeScript, migrations PostgreSQL, stockage privé chiffré, authentification et isolation par société, scanner temporaire multipage, import PDF, pipeline durable, calendrier/actions, archives et brouillons validables. Adaptateurs Mistral/OpenRouter/Resend/Mem0 préparés. Configuration Docker et Railway web/worker, variables et guide DNS livrés.

## Accès inspectés

- GitHub : connexion du compte `craigbarns` vérifiée. Aucun dépôt `brainmail-ai` n’existait au début du travail.
- Railway : connexion existante vérifiée, projets accessibles listés ; aucun projet BRAINMAIL identifié dans cette liste. Aucun projet existant modifié.
- Clés Mistral, OpenRouter, Resend et Mem0 : absentes de la configuration initiale. Un fichier local masqué `.env.local` a été créé pour leur saisie sécurisée et ouvert dans TextEdit à la demande de l’utilisateur.
- DNS : aucun gestionnaire DNS ni accès établi. Aucun enregistrement modifié.

## Vérifié localement

- 15 tests serveur passent : authentification, CSRF, QR à usage unique/expiration, multipage, isolation des documents/fichiers/actions/espaces, chiffrement, validation PDF/image/date, jobs concurrents/baux/reprises, erreurs sans clés, contrats OCR/LLM, signatures webhook/déduplication, rappels et isolation mémoire.
- Vérification TypeScript et build Next.js réussis.
- Test navigateur manuel automatisé : inscription, connexion, QR, sélection d’image sur viewport mobile, synchronisation, finalisation, calendrier et préférences réussis.
- Test navigateur reproductible `tests/browser.spec.ts` : 1 test réussi (8,9 secondes) avec contextes ordinateur et téléphone isolés.

## À valider avec les accès réels

OCR Mistral et modèle OpenRouter choisis, délivrabilité/verification Resend, rappel reçu, réception Inboxes et téléchargement de pièce jointe, Mem0, bucket et PostgreSQL Railway, déploiement sain et HTTPS des domaines.

À ce stade documentaire, aucun déploiement Railway ni connexion DNS ne doit être présumé. Les résultats IA des tests sont des fixtures ; ils ne constituent pas une preuve de fonctionnement des comptes API réels.
