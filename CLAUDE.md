# ArtizaPro

PWA pour artisans indépendants du bâtiment. Cahier de cadrage : `docs/`. Maquettes de référence : `docs/maquettes.html`.

## Conventions

- Interface en français, mobile d'abord (390 px), pas de login dans le MVP.
- Aucune intégration tierce en direct (SMS, téléphonie, IA, signature, Google) : toujours derrière une interface, avec une implémentation simulée.
- Données via un dépôt abstrait (`lib/repo`), implémentation fichier JSON pour l'instant.
- Les statuts d'un dossier ne changent que par les transitions définies dans `lib/domain/statuts.ts`.
- Pas de visuel de carte bancaire ; système visuel dans les maquettes (Space Grotesk, #202020, #C9F158, #F2F3F5).
- Agenda = grille horaire. La carte géographique sert à voir les lieux de rendez-vous (Accueil, fiches).

## Commandes

À compléter après l'initialisation du projet Next.js.
