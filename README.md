# ArtizaPro

Assistant commercial de poche pour artisans du bâtiment (plombiers, électriciens) : capter les demandes, planifier les rendez-vous, faire signer, relancer, récolter les avis Google. PWA mobile pour l'artisan, pages web sans compte pour le client.

## État du projet

Phase de conception. Aucun code applicatif pour l'instant.

- `docs/Cahier de cadrage MVP v2 – Assistant commercial de poche pour artisans.pdf` : cahier de cadrage (11 oct. 2026).
- `docs/maquettes.html` : maquettes HTML (plan du site, parcours, système visuel, écrans artisan et client). À ouvrir dans un navigateur.

## Décisions de la première passe

- Tout le MVP (4 briques) en version minimale, sans appels manqués, dictée vocale, IA, SMS réels, signature eIDAS, base de données ni login.
- Next.js (App Router, TypeScript, Tailwind) en PWA, dépôt de données abstrait avec implémentation fichier JSON, Supabase ensuite.
- SMS simulés : journal « Messages » dans l'app, avec liens vers les pages client.
- Design : Space Grotesk, encre `#202020`, lime `#C9F158`, fond `#F2F3F5`, cartes blanches, boutons pilule. Onglets : Accueil, Agenda (grille horaire), Dossiers, Messages, Profil. Carte des lieux de rendez-vous sur l'Accueil et les fiches.

## Prochaines étapes

1. Valider les maquettes.
2. Initialiser le projet Next.js.
3. Domaine et dépôt de données, puis briques 1 à 4.
