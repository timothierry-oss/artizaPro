// Ce qui attend une décision de l'artisan. Calculé à la volée, jamais stocké.
import type { Db, Dossier } from "./types.ts";
import { conflits, dansPlage } from "./agenda.ts";
import { MAX_RELANCES, rdvCourant } from "./operations.ts";
import { MINUTE, ajouterMinutes } from "./temps.ts";
import { dateCourte } from "./format.ts";

export type GenreAlerte =
  | "nouvelle"
  | "hors_plage"
  | "creneau_pris"
  | "non_confirme"
  | "report"
  | "bon_a_rediger"
  | "devis_a_importer"
  | "a_terminer"
  | "relance"
  | "a_planifier"
  | "annule";

export interface Alerte {
  genre: GenreAlerte;
  libelle: string;
  tag: string;
  /** Résumé pour la carte « À décider » de l'accueil. */
  resume: string;
}

const A = (genre: GenreAlerte, libelle: string, tag: string, resume: string): Alerte => ({ genre, libelle, tag, resume });

export function alertesDossier(db: Db, d: Dossier, now: Date): Alerte[] {
  const out: Alerte[] = [];
  const a = db.artisan;
  const r = rdvCourant(db, d.id);

  if (d.statut === "a_traiter") {
    if (d.creneauDemande) {
      const debut = new Date(d.creneauDemande);
      const fin = ajouterMinutes(debut, a.durees[d.type]);
      if (!dansPlage(a, d.type, debut, fin)) out.push(A("hors_plage", "Hors plage", "red", "créneau hors plage"));
      else if (conflits(db.rdvs, debut, fin, a.trajet).length) out.push(A("creneau_pris", "Créneau pris", "red", "créneau déjà pris"));
      else out.push(A("nouvelle", "À valider", "lime", "créneau à valider"));
    } else {
      out.push(A("nouvelle", "Créneau à proposer", "lime", "créneau à proposer"));
    }
  }

  if (r && (d.statut === "rdv_planifie" || d.statut === "visite_planifiee" || d.statut === "chantier_planifie")) {
    const debut = new Date(r.debut).getTime();
    const passe = new Date(r.fin).getTime() < now.getTime();
    if (r.confirmation === "report_demande") out.push(A("report", "Report demandé", "red", "report demandé"));
    else if (!passe && r.confirmation === "en_attente" && debut - now.getTime() < 48 * 60 * MINUTE) {
      out.push(A("non_confirme", "Non confirmé", "red", "RDV non confirmé"));
    }
    if (passe && d.statut === "rdv_planifie") out.push(A("bon_a_rediger", "Bon à rédiger", "lime", "bon à rédiger"));
    if (passe && d.statut === "visite_planifiee") out.push(A("devis_a_importer", "Devis à importer", "lime", "devis à importer"));
    if (passe && d.statut === "chantier_planifie") out.push(A("a_terminer", "Travaux à clore", "out", "chantier à clore"));
  }

  if (d.statut === "intervention_faite") out.push(A("a_terminer", "À terminer", "out", "dossier à terminer"));
  if (d.statut === "signe") out.push(A("a_planifier", "Chantier à planifier", "lime", "chantier à planifier"));

  if (d.statut === "devis_envoye" && d.devis && !d.devis.prochaineRelance) {
    const depuis = now.getTime() - new Date(d.devis.envoyeLe).getTime();
    const delai = a.relanceDevis.delaiJours * 24 * 60 * MINUTE * (1 + d.devis.relances);
    if (depuis >= delai || d.devis.relances >= MAX_RELANCES) out.push(A("relance", "Relancer ou clore", "violet", "devis à relancer ou clore"));
  }

  if (d.statut === "perdu" && d.motifPerdu === "annule_client" && d.perduLe && now.getTime() - new Date(d.perduLe).getTime() < 72 * 60 * MINUTE) {
    out.push(A("annule", "Annulé par le client", "red", "RDV annulé par le client"));
  }
  return out;
}

/** Texte secondaire pour un devis en attente : « Relance prévue le 14 nov. » */
export function infoRelance(d: Dossier): string | undefined {
  if (d.statut !== "devis_envoye" || !d.devis) return undefined;
  if (d.devis.prochaineRelance) return `Relance prévue le ${dateCourte(d.devis.prochaineRelance)}`;
  return d.devis.relances ? `${d.devis.relances} relance${d.devis.relances > 1 ? "s" : ""} envoyée${d.devis.relances > 1 ? "s" : ""}` : undefined;
}

export interface ADecider {
  dossiers: { dossier: Dossier; alertes: Alerte[] }[];
  retoursNonTraites: number;
  total: number;
  resume: string;
}

export function aDecider(db: Db, now: Date): ADecider {
  const dossiers = db.dossiers
    .map((dossier) => ({ dossier, alertes: alertesDossier(db, dossier, now) }))
    .filter((x) => x.alertes.length)
    .sort((x, y) => y.dossier.creeLe.localeCompare(x.dossier.creeLe));
  const retoursNonTraites = db.retours.filter((r) => !r.traite).length;
  const compte = new Map<string, number>();
  for (const x of dossiers) for (const al of x.alertes) compte.set(al.resume, (compte.get(al.resume) ?? 0) + 1);
  if (retoursNonTraites) compte.set("retour privé à rappeler", retoursNonTraites);
  const resume = [...compte.entries()].map(([k, n]) => `${n} ${k}`).join(" · ");
  return { dossiers, retoursNonTraites, total: dossiers.length + retoursNonTraites, resume };
}
