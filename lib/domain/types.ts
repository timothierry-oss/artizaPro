// Modèle de données du MVP. Tout est sérialisable en JSON (dates en ISO).

export type TypeMission = "depannage" | "visite";

export type Statut =
  | "a_traiter"
  | "rdv_planifie"
  | "intervention_faite"
  | "visite_planifiee"
  | "devis_envoye"
  | "signe"
  | "chantier_planifie"
  | "termine"
  | "perdu";

export type MotifPerdu = "devis_non_signe" | "annule_client" | "injoignable" | "autre_artisan" | "autre";

/** Plage horaire hebdomadaire. jours : 0 = dimanche … 6 = samedi. Heures au format "08:30". */
export interface Plage {
  jours: number[];
  debut: string;
  fin: string;
}

export interface Artisan {
  slug: string;
  prenom: string;
  nom: string;
  entreprise: string;
  telephone: string;
  expediteur: string;
  lienGoogle: string;
  adresse: string;
  siret: string;
  durees: Record<TypeMission, number>;
  trajet: number;
  plages: Record<TypeMission, Plage[]>;
  rappelVeille: { actif: boolean; heure: string };
  relanceDevis: { delaiJours: number; max: number };
  demandeAvis: boolean;
  icalKey: string;
  /** Numéros (chiffres seuls) désinscrits des relances et demandes d'avis. */
  desinscrits: string[];
  dernierPassage?: string;
  dernierBilan?: string;
}

export interface Client {
  nom: string;
  telephone: string;
  adresse: string;
}

export interface Evenement {
  date: string;
  texte: string;
}

export interface Bon {
  numero: string;
  travaux: string;
  /** Image de la signature (data URL). */
  signature: string;
  signeLe: string;
}

export interface PreuveSignature {
  horodatage: string;
  empreinte: string;
  telephone: string;
  methode: string;
  agent?: string;
}

export interface Devis {
  fichier: string;
  nomFichier: string;
  /** SHA-256 du PDF, pour l'intégrité du document signé. */
  empreinte: string;
  envoyeLe: string;
  code: string;
  relances: number;
  prochaineRelance?: string;
  signeLe?: string;
  preuve?: PreuveSignature;
}

export interface Dossier {
  id: string;
  publicToken: string;
  numero: string;
  type: TypeMission;
  statut: Statut;
  client: Client;
  description: string;
  pieces?: string;
  photos: string[];
  source: "speed_dial" | "page_client";
  creeLe: string;
  /** Créneau demandé par le client, en attente de validation par l'artisan. */
  creneauDemande?: string;
  /** Souhait libre du client quand aucun créneau proposé ne convient. */
  creneauSouhaite?: string;
  bon?: Bon;
  devis?: Devis;
  motifPerdu?: MotifPerdu;
  perduLe?: string;
  termineLe?: string;
  avisDemandeLe?: string;
  evenements: Evenement[];
}

export type NatureRdv = "depannage" | "visite" | "chantier" | "indispo";
export type Confirmation = "en_attente" | "confirme" | "annule" | "report_demande";

export interface RendezVous {
  id: string;
  dossierId?: string;
  nature: NatureRdv;
  debut: string;
  fin: string;
  confirmation: Confirmation;
  rappelEnvoyeLe?: string;
  note?: string;
}

export type GenreMessage =
  | "confirmation_rdv"
  | "rappel_j1"
  | "lien_devis"
  | "relance_devis"
  | "copie_bon"
  | "demande_avis";

/** SMS simulé : rien ne part, le texte est consultable dans l'onglet Messages. */
export interface Message {
  id: string;
  dossierId?: string;
  destinataire: { nom: string; telephone: string };
  genre: GenreMessage;
  texte: string;
  envoyeLe: string;
}

export interface RetourPrive {
  id: string;
  dossierId: string;
  message: string;
  creeLe: string;
  traite: boolean;
}

export interface Db {
  version: 1;
  compteurDossiers: number;
  compteurBons: number;
  artisan: Artisan;
  dossiers: Dossier[];
  rdvs: RendezVous[];
  messages: Message[];
  retours: RetourPrive[];
}
