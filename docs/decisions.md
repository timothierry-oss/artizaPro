# Décisions de la version 0.1 (13 novembre 2026)

## Retenu

- Tout le MVP (4 briques) en version minimale, exploitable de bout en bout en local.
- Next.js 16 (App Router, Server Actions), React 19, TypeScript. CSS repris de la maquette Claude Design, sans Tailwind.
- Données dans un fichier JSON local derrière l'interface `Repository` (`lib/repo`). Transactions sérialisées, écriture atomique.
- Structure « Aujourd'hui d'abord » : Accueil, Agenda, Dossiers, Messages, Profil.
- Agenda en grille horaire. La carte sert à voir les lieux (Accueil, fiches, vue Lieux de l'agenda).
- Désinscription par numéro de téléphone : concerne relances et demandes d'avis, pas les confirmations ni rappels de rendez-vous.
- Désinscription confirmée par un bouton, pour éviter qu'un aperçu de lien automatique ne désinscrive le client.
- Deux relances de devis au maximum, quel que soit le réglage.

## À brancher plus tard (interfaces prêtes)

| Sujet | Où | Piste |
|---|---|---|
| Base de données | `lib/repo` | Supabase (région UE) |
| Envoi des SMS | `envoyer()` dans `lib/domain/operations.ts` | Twilio, Telnyx ou OVH |
| Appels manqués | nouveau webhook + `creerDossier` | renvoi conditionnel vers numéro virtuel |
| Signature eIDAS | `signerDevis` | Yousign, Universign ou DocuSeal |
| Carte réelle et autocomplétion d'adresse | `components/MiniMap.tsx` | OpenStreetMap / Leaflet, API Adresse (data.gouv) |
| Automatisations planifiées | `POST /api/jobs` (protégé par `CRON_SECRET`) | cron Vercel |
| Comptes | — | Supabase Auth |
