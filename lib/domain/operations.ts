// Opérations métier sur la base en mémoire. Chaque fonction modifie `db` et lève ErreurMetier si l'action est impossible.
// Elles ne touchent ni au disque ni au réseau : la couche serveur les exécute dans une transaction du dépôt.
import type {
  Client,
  Db,
  Dossier,
  GenreMessage,
  MotifPerdu,
  NatureRdv,
  RendezVous,
  Statut,
  TypeMission,
} from "./types.ts";
import { LIBELLE_STATUT, MOTIFS_PERDU, peutPasser } from "./statuts.ts";
import * as sms from "./messages.ts";
import { conflits } from "./agenda.ts";
import { MINUTE, ajouterJours, ajouterMinutes, cleJour, hm, minutesDuJour } from "./temps.ts";
import { chiffres, heure, jourCourt } from "./format.ts";

export class ErreurMetier extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurMetier";
  }
}

export interface Ctx {
  now: Date;
  baseUrl: string;
  id(prefixe: string): string;
  token(): string;
  code(): string;
}

const ctxMsg = (db: Db, ctx: Ctx): sms.CtxMessage => ({ artisan: db.artisan, baseUrl: ctx.baseUrl });

export function trouverDossier(db: Db, id: string): Dossier {
  const d = db.dossiers.find((x) => x.id === id);
  if (!d) throw new ErreurMetier("Ce dossier n'existe pas ou a été supprimé.");
  return d;
}

export function dossierParToken(db: Db, token: string): Dossier {
  const d = db.dossiers.find((x) => x.publicToken === token);
  if (!d) throw new ErreurMetier("Ce lien n'est plus valable.");
  return d;
}

/** Dernier rendez-vous non annulé du dossier (hors indisponibilités). */
export function rdvCourant(db: Db, dossierId: string): RendezVous | undefined {
  return db.rdvs
    .filter((r) => r.dossierId === dossierId && r.confirmation !== "annule" && r.nature !== "indispo")
    .sort((a, b) => b.debut.localeCompare(a.debut))[0];
}

export function estDesinscrit(db: Db, tel: string): boolean {
  return db.artisan.desinscrits.includes(chiffres(tel));
}

function evt(d: Dossier, ctx: Ctx, texte: string) {
  d.evenements.push({ date: ctx.now.toISOString(), texte });
}

function envoyer(db: Db, ctx: Ctx, d: Dossier, genre: GenreMessage, texte: string) {
  db.messages.push({
    id: ctx.id("m"),
    dossierId: d.id,
    destinataire: { nom: d.client.nom, telephone: d.client.telephone },
    genre,
    texte,
    envoyeLe: ctx.now.toISOString(),
  });
}

function changerStatut(d: Dossier, vers: Statut) {
  if (!peutPasser(d.type, d.statut, vers)) {
    throw new ErreurMetier(`Impossible de passer de « ${LIBELLE_STATUT[d.statut]} » à « ${LIBELLE_STATUT[vers]} ».`);
  }
  d.statut = vers;
}

function verifierClient(c: Client) {
  if (!c.nom.trim()) throw new ErreurMetier("Indiquez le nom du client.");
  if (chiffres(c.telephone).length < 10) throw new ErreurMetier("Indiquez un numéro de téléphone à 10 chiffres.");
  if (!c.adresse.trim()) throw new ErreurMetier("Indiquez l'adresse de l'intervention.");
}

// ---------- Brique 1 : capture ----------

export interface NouveauDossier {
  type: TypeMission;
  client: Client;
  description: string;
  pieces?: string;
  photos?: string[];
  source: Dossier["source"];
  creneauDemande?: Date;
  creneauSouhaite?: string;
}

export function creerDossier(db: Db, ctx: Ctx, n: NouveauDossier): Dossier {
  const client = { nom: n.client.nom.trim(), telephone: n.client.telephone.trim(), adresse: n.client.adresse.trim() };
  verifierClient(client);
  const d: Dossier = {
    id: ctx.id("d"),
    publicToken: ctx.token(),
    numero: `${ctx.now.getFullYear()}-${String(db.compteurDossiers++).padStart(3, "0")}`,
    type: n.type,
    statut: "a_traiter",
    client,
    description: n.description.trim(),
    pieces: n.pieces?.trim() || undefined,
    photos: n.photos ?? [],
    source: n.source,
    creeLe: ctx.now.toISOString(),
    creneauDemande: n.creneauDemande?.toISOString(),
    creneauSouhaite: n.creneauSouhaite?.trim() || undefined,
    evenements: [],
  };
  db.dossiers.push(d);
  evt(d, ctx, n.source === "speed_dial" ? "Créé via Speed Dial" : "Demande reçue via la page client");
  return d;
}

export function modifierClient(db: Db, ctx: Ctx, id: string, c: Client, description?: string) {
  const d = trouverDossier(db, id);
  verifierClient(c);
  d.client = { nom: c.nom.trim(), telephone: c.telephone.trim(), adresse: c.adresse.trim() };
  if (description !== undefined) d.description = description.trim();
  evt(d, ctx, "Fiche client modifiée");
}

// ---------- Brique 2 : agenda ----------

/** Planifie ou replanifie le rendez-vous du dossier, puis génère le SMS de confirmation. */
export function planifier(db: Db, ctx: Ctx, dossierId: string, debut: Date, dureeMin?: number): RendezVous {
  const d = trouverDossier(db, dossierId);
  let nature: NatureRdv;
  let vers: Statut | null = null;
  switch (d.statut) {
    case "a_traiter":
      nature = d.type;
      vers = d.type === "depannage" ? "rdv_planifie" : "visite_planifiee";
      break;
    case "rdv_planifie":
      nature = "depannage";
      break;
    case "visite_planifiee":
      nature = "visite";
      break;
    case "signe":
      nature = "chantier";
      vers = "chantier_planifie";
      break;
    case "chantier_planifie":
      nature = "chantier";
      break;
    default:
      throw new ErreurMetier("Ce dossier ne peut pas être planifié dans son état actuel.");
  }
  if (Number.isNaN(debut.getTime())) throw new ErreurMetier("Choisissez une date et une heure.");
  if (debut.getTime() < ctx.now.getTime() - 5 * MINUTE) throw new ErreurMetier("Ce créneau est déjà passé. Choisissez une date à venir.");
  const duree = dureeMin ?? (nature === "chantier" ? 240 : db.artisan.durees[nature]);
  const fin = ajouterMinutes(debut, duree);
  const courant = rdvCourant(db, d.id);
  const existant = !vers && courant?.nature === nature ? courant : undefined;
  if (conflits(db.rdvs, debut, fin, db.artisan.trajet, existant?.id).length) {
    throw new ErreurMetier("Ce créneau chevauche un autre rendez-vous, un trajet ou une indisponibilité.");
  }
  let rdv: RendezVous;
  if (existant) {
    existant.debut = debut.toISOString();
    existant.fin = fin.toISOString();
    existant.confirmation = "en_attente";
    delete existant.rappelEnvoyeLe;
    rdv = existant;
    evt(d, ctx, `Replanifié ${jourCourt(debut)} ${heure(debut)}`);
  } else {
    rdv = { id: ctx.id("r"), dossierId: d.id, nature, debut: debut.toISOString(), fin: fin.toISOString(), confirmation: "en_attente" };
    db.rdvs.push(rdv);
    if (vers) changerStatut(d, vers);
    evt(d, ctx, `${LIBELLE_STATUT[d.statut]} ${jourCourt(debut)} ${heure(debut)}`);
  }
  delete d.creneauDemande;
  delete d.creneauSouhaite;
  envoyer(db, ctx, d, "confirmation_rdv", sms.confirmationRdv(ctxMsg(db, ctx), d, rdv));
  evt(d, ctx, "SMS de confirmation envoyé");
  return rdv;
}

function rdvDuLien(db: Db, d: Dossier): RendezVous {
  const r = rdvCourant(db, d.id);
  if (!r) throw new ErreurMetier("Aucun rendez-vous n'est prévu pour ce dossier.");
  return r;
}

export function confirmerPresence(db: Db, ctx: Ctx, token: string) {
  const d = dossierParToken(db, token);
  const r = rdvDuLien(db, d);
  r.confirmation = "confirme";
  evt(d, ctx, "Présence confirmée par le client");
}

export function annulerParClient(db: Db, ctx: Ctx, token: string) {
  const d = dossierParToken(db, token);
  const r = rdvDuLien(db, d);
  r.confirmation = "annule";
  changerStatut(d, "perdu");
  d.motifPerdu = "annule_client";
  d.perduLe = ctx.now.toISOString();
  evt(d, ctx, "Rendez-vous annulé par le client depuis le lien");
}

export function demanderReport(db: Db, ctx: Ctx, token: string, debut?: Date, souhait?: string) {
  const d = dossierParToken(db, token);
  const r = rdvDuLien(db, d);
  r.confirmation = "report_demande";
  d.creneauDemande = debut?.toISOString();
  d.creneauSouhaite = souhait?.trim() || (debut ? undefined : "Le client souhaite être rappelé");
  evt(d, ctx, debut ? `Report demandé : ${jourCourt(debut)} ${heure(debut)}` : "Report demandé, le client souhaite être rappelé");
}

export function envoyerRappel(db: Db, ctx: Ctx, dossierId: string) {
  const d = trouverDossier(db, dossierId);
  const r = rdvDuLien(db, d);
  envoyer(db, ctx, d, "rappel_j1", sms.rappelVeille(ctxMsg(db, ctx), d, r));
  r.rappelEnvoyeLe = ctx.now.toISOString();
  evt(d, ctx, "Lien de confirmation envoyé");
}

export function ajouterIndispo(db: Db, ctx: Ctx, debut: Date, fin: Date, note: string) {
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) throw new ErreurMetier("Indiquez une date, une heure de début et une heure de fin.");
  if (fin <= debut) throw new ErreurMetier("L'heure de fin doit être après l'heure de début.");
  db.rdvs.push({ id: ctx.id("r"), nature: "indispo", debut: debut.toISOString(), fin: fin.toISOString(), confirmation: "confirme", note: note.trim() || "Indisponible" });
}

export function supprimerIndispo(db: Db, id: string) {
  const i = db.rdvs.findIndex((r) => r.id === id && r.nature === "indispo");
  if (i < 0) throw new ErreurMetier("Cette indisponibilité n'existe plus.");
  db.rdvs.splice(i, 1);
}

// ---------- Brique 3 : bon d'intervention et devis ----------

export function signerBon(db: Db, ctx: Ctx, dossierId: string, travaux: string, signature: string) {
  const d = trouverDossier(db, dossierId);
  if (d.statut !== "rdv_planifie") throw new ErreurMetier("Le bon d'intervention se rédige sur un dépannage planifié.");
  if (!travaux.trim()) throw new ErreurMetier("Décrivez les travaux réalisés.");
  if (!/^data:image\/(png|svg\+xml);base64,/.test(signature)) throw new ErreurMetier("Faites signer le client dans le cadre prévu.");
  d.bon = {
    numero: `BI-${ctx.now.getFullYear()}-${String(db.compteurBons++).padStart(4, "0")}`,
    travaux: travaux.trim(),
    signature,
    signeLe: ctx.now.toISOString(),
  };
  changerStatut(d, "intervention_faite");
  evt(d, ctx, "Bon d'intervention signé par le client");
  envoyer(db, ctx, d, "copie_bon", sms.copieBon(ctxMsg(db, ctx), d));
  evt(d, ctx, "Copie du bon envoyée au client");
}

export interface FichierDevis {
  fichier: string;
  nomFichier: string;
  empreinte: string;
}

export function importerDevis(db: Db, ctx: Ctx, dossierId: string, f: FichierDevis) {
  const d = trouverDossier(db, dossierId);
  if (d.type !== "visite") throw new ErreurMetier("Un devis se joint à une visite technique.");
  if (d.statut !== "visite_planifiee" && d.statut !== "devis_envoye") throw new ErreurMetier("Le devis s'importe après la visite.");
  const remplacement = d.statut === "devis_envoye";
  d.devis = {
    ...f,
    envoyeLe: ctx.now.toISOString(),
    code: ctx.code(),
    relances: 0,
    prochaineRelance: estDesinscrit(db, d.client.telephone) ? undefined : ajouterJours(ctx.now, db.artisan.relanceDevis.delaiJours).toISOString(),
  };
  if (!remplacement) changerStatut(d, "devis_envoye");
  envoyer(db, ctx, d, "lien_devis", sms.lienDevis(ctxMsg(db, ctx), d));
  evt(d, ctx, remplacement ? "Devis remplacé, nouveau lien envoyé" : "Devis importé, lien envoyé");
}

/** Plafond absolu du cahier : deux relances au plus. */
export const MAX_RELANCES = 2;

export function relancerDevis(db: Db, ctx: Ctx, dossierId: string) {
  const d = trouverDossier(db, dossierId);
  const dv = d.devis;
  if (d.statut !== "devis_envoye" || !dv) throw new ErreurMetier("Il n'y a pas de devis en attente de signature.");
  if (dv.relances >= MAX_RELANCES) throw new ErreurMetier("Deux relances ont déjà été envoyées : c'est le maximum.");
  if (estDesinscrit(db, d.client.telephone)) throw new ErreurMetier("Le client a demandé à ne plus recevoir de relance.");
  envoyer(db, ctx, d, "relance_devis", sms.relanceDevis(ctxMsg(db, ctx), d));
  dv.relances++;
  dv.prochaineRelance = dv.relances < Math.min(db.artisan.relanceDevis.max, MAX_RELANCES) ? ajouterJours(ctx.now, db.artisan.relanceDevis.delaiJours).toISOString() : undefined;
  evt(d, ctx, `Relance ${dv.relances} envoyée`);
}

export function signerDevis(db: Db, ctx: Ctx, token: string, code: string, agent?: string) {
  const d = dossierParToken(db, token);
  const dv = d.devis;
  if (d.statut !== "devis_envoye" || !dv) throw new ErreurMetier("Ce devis n'est plus en attente de signature.");
  if (code.replace(/\D/g, "") !== dv.code) throw new ErreurMetier("Code incorrect. Saisissez les 6 chiffres reçus par SMS.");
  dv.signeLe = ctx.now.toISOString();
  dv.preuve = { horodatage: dv.signeLe, empreinte: dv.empreinte, telephone: d.client.telephone, methode: "Code reçu par SMS (simulé)", agent };
  delete dv.prochaineRelance;
  changerStatut(d, "signe");
  evt(d, ctx, "Devis signé par le client");
}

export function marquerSigne(db: Db, ctx: Ctx, dossierId: string) {
  const d = trouverDossier(db, dossierId);
  const dv = d.devis;
  if (d.statut !== "devis_envoye" || !dv) throw new ErreurMetier("Il n'y a pas de devis en attente de signature.");
  dv.signeLe = ctx.now.toISOString();
  dv.preuve = { horodatage: dv.signeLe, empreinte: dv.empreinte, telephone: d.client.telephone, methode: "Marqué signé par l'artisan" };
  delete dv.prochaineRelance;
  changerStatut(d, "signe");
  evt(d, ctx, "Devis marqué signé par l'artisan");
}

// ---------- Brique 4 : pipeline et avis ----------

export function terminer(db: Db, ctx: Ctx, dossierId: string) {
  const d = trouverDossier(db, dossierId);
  changerStatut(d, "termine");
  d.termineLe = ctx.now.toISOString();
  evt(d, ctx, "Dossier terminé");
  // Une seule demande d'avis par dossier, envoyée à tous les clients, sans question préalable.
  if (db.artisan.demandeAvis && db.artisan.lienGoogle && !d.avisDemandeLe && !estDesinscrit(db, d.client.telephone)) {
    envoyer(db, ctx, d, "demande_avis", sms.demandeAvis(ctxMsg(db, ctx), d));
    d.avisDemandeLe = ctx.now.toISOString();
    evt(d, ctx, "Demande d'avis envoyée");
  }
}

export function passerPerdu(db: Db, ctx: Ctx, dossierId: string, motif: MotifPerdu) {
  const d = trouverDossier(db, dossierId);
  if (!(motif in MOTIFS_PERDU)) throw new ErreurMetier("Choisissez un motif.");
  changerStatut(d, "perdu");
  d.motifPerdu = motif;
  d.perduLe = ctx.now.toISOString();
  for (const r of db.rdvs) if (r.dossierId === d.id && new Date(r.debut) > ctx.now) r.confirmation = "annule";
  if (d.devis) delete d.devis.prochaineRelance;
  evt(d, ctx, `Passé en Perdu : ${MOTIFS_PERDU[motif].toLowerCase()}`);
}

export function restaurer(db: Db, ctx: Ctx, dossierId: string) {
  const d = trouverDossier(db, dossierId);
  changerStatut(d, "a_traiter");
  delete d.motifPerdu;
  delete d.perduLe;
  evt(d, ctx, "Dossier restauré");
}

export function desinscrire(db: Db, ctx: Ctx, token: string) {
  const d = dossierParToken(db, token);
  const tel = chiffres(d.client.telephone);
  if (!db.artisan.desinscrits.includes(tel)) db.artisan.desinscrits.push(tel);
  for (const x of db.dossiers) if (chiffres(x.client.telephone) === tel && x.devis) delete x.devis.prochaineRelance;
  evt(d, ctx, "Le client s'est désinscrit des relances et demandes d'avis");
}

export function reactiver(db: Db, ctx: Ctx, token: string) {
  const d = dossierParToken(db, token);
  const tel = chiffres(d.client.telephone);
  db.artisan.desinscrits = db.artisan.desinscrits.filter((t) => t !== tel);
  evt(d, ctx, "Le client a réactivé les messages");
}

export function ajouterRetour(db: Db, ctx: Ctx, token: string, message: string) {
  const d = dossierParToken(db, token);
  if (message.trim().length < 3) throw new ErreurMetier("Écrivez votre message avant de l'envoyer.");
  db.retours.push({ id: ctx.id("f"), dossierId: d.id, message: message.trim().slice(0, 2000), creeLe: ctx.now.toISOString(), traite: false });
  evt(d, ctx, "Retour privé reçu");
}

export function traiterRetour(db: Db, id: string) {
  const r = db.retours.find((x) => x.id === id);
  if (!r) throw new ErreurMetier("Ce retour n'existe plus.");
  r.traite = true;
}

// ---------- Automatisations ----------

export interface Bilan {
  rappels: number;
  relances: number;
}

/** Rappels de la veille et relances de devis. `manuel` ignore l'heure d'envoi des rappels. */
export function lancerAutomatisations(db: Db, ctx: Ctx, manuel: boolean): Bilan {
  const bilan: Bilan = { rappels: 0, relances: 0 };
  const a = db.artisan;
  const demain = cleJour(ajouterJours(ctx.now, 1));
  if (a.rappelVeille.actif && (manuel || minutesDuJour(ctx.now) >= hm(a.rappelVeille.heure))) {
    for (const r of db.rdvs) {
      if (r.nature === "indispo" || !r.dossierId || r.rappelEnvoyeLe || r.confirmation !== "en_attente") continue;
      if (cleJour(new Date(r.debut)) !== demain) continue;
      const d = db.dossiers.find((x) => x.id === r.dossierId);
      if (!d || d.statut === "perdu") continue;
      envoyer(db, ctx, d, "rappel_j1", sms.rappelVeille(ctxMsg(db, ctx), d, r));
      r.rappelEnvoyeLe = ctx.now.toISOString();
      evt(d, ctx, "Rappel de la veille envoyé");
      bilan.rappels++;
    }
  }
  for (const d of db.dossiers) {
    const dv = d.devis;
    if (d.statut !== "devis_envoye" || !dv?.prochaineRelance || new Date(dv.prochaineRelance) > ctx.now) continue;
    if (dv.relances >= Math.min(a.relanceDevis.max, MAX_RELANCES) || estDesinscrit(db, d.client.telephone)) {
      delete dv.prochaineRelance;
      continue;
    }
    relancerDevis(db, ctx, d.id);
    bilan.relances++;
  }
  a.dernierPassage = ctx.now.toISOString();
  a.dernierBilan = `${bilan.rappels} rappel${bilan.rappels > 1 ? "s" : ""}, ${bilan.relances} relance${bilan.relances > 1 ? "s" : ""}`;
  return bilan;
}

/** Vrai si un passage automatique aurait quelque chose à envoyer maintenant. */
export function automatisationsEnAttente(db: Db, now: Date): boolean {
  const a = db.artisan;
  const demain = cleJour(ajouterJours(now, 1));
  const rappel =
    a.rappelVeille.actif &&
    minutesDuJour(now) >= hm(a.rappelVeille.heure) &&
    db.rdvs.some((r) => r.dossierId && r.nature !== "indispo" && !r.rappelEnvoyeLe && r.confirmation === "en_attente" && cleJour(new Date(r.debut)) === demain);
  const relance = db.dossiers.some((d) => d.statut === "devis_envoye" && d.devis?.prochaineRelance && new Date(d.devis.prochaineRelance) <= now);
  return rappel || relance;
}
