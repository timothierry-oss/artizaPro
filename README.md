# ArtizaPro

Secrétaire commerciale de poche pour artisans du bâtiment : capter les demandes, planifier les rendez-vous, faire signer, relancer, récolter les avis Google. PWA mobile pour l'artisan, pages web sans compte pour le client.

## Lancer en local

Prérequis : Node 24.

```bash
npm install
npm run dev
```

Ouvrir http://localhost:3000 dans le navigateur, en vue mobile. Depuis un téléphone sur le même Wi-Fi, ouvrir `http://<adresse-IP-du-Mac>:3000` ; l'app s'installe sur l'écran d'accueil (« Partager > Sur l'écran d'accueil » sur iPhone).

Les données de démo (artisan Dupont Plomberie, une vingtaine de dossiers) sont créées au premier lancement dans `data/`, autour de la date du jour. Profil > Réinitialiser la démo les recrée.

## Ce que fait le MVP

| Brique | Écrans |
|---|---|
| Capture | Speed Dial (dossier en 3 clics), page de demande client `/demande/dupont` avec photos et créneaux libres |
| Agenda | Grille horaire par jour, semaine, lieux des rendez-vous, indisponibilités, rappel la veille, flux iCal |
| Bon et devis | Bon d'intervention signé au doigt et copie imprimable, import du devis PDF, QR code, signature par code, relances |
| Pipeline et avis | Dossiers par statut, perdus, demande d'avis Google unique, retour privé, désinscription |

## Ce qui est simulé

- **SMS** : rien ne part. Chaque SMS est généré avec son texte et ses liens dans l'onglet Messages ; les liens ouvrent les vraies pages client.
- **Signature du devis** : le code à 6 chiffres figure dans le SMS simulé. Pas encore de prestataire eIDAS.
- **Carte** : dessin stylisé, positions indicatives. Le bouton Itinéraire ouvre Google Maps.
- **Automatisations** : lancées à l'ouverture de l'accueil quand il y a quelque chose à envoyer, ou depuis Profil > Automatisations.
- Pas d'appel manqué, pas de dictée vocale ni d'IA, pas de base de données (fichier JSON local), pas de login.

## Commandes

- `npm test` : tests du domaine (statuts, créneaux, relances, rappels, avis, désinscription).
- `npm run typecheck` et `npm run build`.

## Documents

- `docs/Cahier de cadrage MVP v2 – Assistant commercial de poche pour artisans.pdf`
- `docs/maquettes-claude-design.html` : maquette de référence (Claude Design).
- `docs/maquettes-v4.html` : plan du site et parcours.
- `docs/decisions.md` : choix de cette version et ce qui reste à brancher.
