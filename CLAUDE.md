# ArtizaPro

PWA « secrétaire commerciale de poche » pour artisans indépendants du bâtiment. Cahier de cadrage et maquettes : `docs/`.
La maquette de référence est `docs/maquettes-claude-design.html` (sauf l'Agenda, qui est une grille horaire et non une carte).

@AGENTS.md

## Commandes

- `npm run dev` : serveur local sur le port 3000, accessible depuis un téléphone du même Wi-Fi (`http://<ip-du-mac>:3000`).
- `npm test` : tests du domaine (`lib/domain/*.test.ts`, runner natif de Node, sans dépendance).
- `npm run typecheck`, `npm run build`.
- Réinitialiser les données de démo : bouton dans Profil, ou supprimer `data/`.

## Architecture

- `lib/domain/` : métier pur, sans disque ni réseau, testable avec Node (imports relatifs avec extension `.ts`, `import type` pour les types).
  - `statuts.ts` : parcours dépannage / visite. Un statut ne change que par `peutPasser`.
  - `agenda.ts` : plages, conflits (trajet compris), créneaux libres, blocs de la grille.
  - `operations.ts` : toutes les mutations (planifier, signer, relancer, terminer…). Lèvent `ErreurMetier` avec un message affichable.
  - `messages.ts` : textes des SMS. `alertes.ts` : ce qui attend une décision. `seed.ts` : démo recalculée autour de la date du jour.
- `lib/repo/` : dépôt de données. `json.ts` écrit `data/db.json` et `data/fichiers/`. Passer à Supabase = nouvelle implémentation de `Repository`.
- `lib/actions.ts` : Server Actions (formulaires). `agir()` redirige avec `?ok=` ou `?erreur=` ; `agirFormulaire()` renvoie l'erreur au formulaire client.
- `app/(artisan)/` : écrans de l'artisan avec barre d'onglets. `app/demande/` et `app/c/[token]/` : pages client sans compte.

## Conventions

- Interface en français, mobile d'abord (390 px), système visuel de la maquette dans `app/globals.css` (Space Grotesk, #202020, #C9F158, #F2F3F5).
- Aucune intégration tierce en direct. SMS simulés dans `db.messages` (onglet Messages), signature par code simulée, carte stylisée sans fournisseur.
- Le serveur tourne en `TZ=Europe/Paris` : les dates sont stockées en ISO et manipulées en heure locale.
- Pas de login dans le MVP : un seul artisan (`db.artisan`).
