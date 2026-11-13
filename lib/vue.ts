// Préparation des données pour l'affichage (côté serveur).
import type { Db, Dossier, RendezVous, TypeMission } from "./domain/types.ts";
import { alertesDossier, infoRelance } from "./domain/alertes.ts";
import { rdvCourant } from "./domain/operations.ts";
import { LIBELLE_TYPE, TAG_TYPE } from "./domain/statuts.ts";
import { dateCourte, duree, heure, jourCourt, jourRelatif, relatif } from "./domain/format.ts";
import { MINUTE } from "./domain/temps.ts";
import type { SlotVue } from "@/components/SpeedDialForm";
import type { Creneau } from "./domain/agenda.ts";

export const premier = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export interface LigneDossier {
  dossier: Dossier;
  sous: string;
  tag: { texte: string; cls: string };
  petit?: string;
}

/** Ligne de liste : sous-titre, badge et mention à droite selon l'état du dossier. */
export function ligneDossier(db: Db, d: Dossier, now: Date): LigneDossier {
  const r = rdvCourant(db, d.id);
  const al = alertesDossier(db, d, now)[0];
  const type = { texte: d.type === "depannage" ? "Dép" : "Visite", cls: TAG_TYPE[d.type] };
  let sous = `${resume(d.description)} · ${ville(d.client.adresse)}`;
  let petit: string | undefined = relatif(d.creeLe, now);
  if (r && (d.statut === "rdv_planifie" || d.statut === "visite_planifiee" || d.statut === "chantier_planifie")) {
    sous = `${jourCourt(r.debut)} ${heure(r.debut)} · ${duree((new Date(r.fin).getTime() - new Date(r.debut).getTime()) / MINUTE)}`;
    petit = r.confirmation === "confirme" ? "confirmé" : r.rappelEnvoyeLe ? "rappel envoyé" : undefined;
  }
  if (d.statut === "a_traiter" && d.creneauDemande) petit = `${jourRelatif(d.creneauDemande, now)} ${heure(d.creneauDemande)}`;
  if (d.statut === "a_traiter" && d.creneauSouhaite) petit = d.creneauSouhaite;
  if (d.statut === "devis_envoye" && d.devis) {
    sous = `Devis envoyé le ${dateCourte(d.devis.envoyeLe)} · non signé`;
    petit = infoRelance(d);
  }
  if (d.statut === "intervention_faite" && d.bon) sous = `${resume(d.description)} · bon signé le ${dateCourte(d.bon.signeLe)}`;
  if (d.statut === "signe" && d.devis?.signeLe) sous = `Devis signé le ${dateCourte(d.devis.signeLe)}`;
  if (d.statut === "termine") {
    sous = `${resume(d.description)} · ${d.termineLe ? dateCourte(d.termineLe) : ""}`;
    petit = d.avisDemandeLe ? "avis demandé" : undefined;
  }
  const tag = al ? { texte: al.libelle, cls: al.tag } : r?.confirmation === "confirme" && d.statut !== "termine" ? { texte: "Confirmé", cls: "green" } : type;
  return { dossier: d, sous, tag, petit };
}

export function resume(s: string, n = 34): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).replace(/[\s,.;]+\S*$/, "") + "…" : t || "Sans description";
}

export function ville(adresse: string): string {
  const m = /\d{5}\s+(.+)$/.exec(adresse);
  if (m) return m[1];
  const p = adresse.split(",");
  return (p[p.length - 1] ?? adresse).trim();
}

export function libelleType(t: TypeMission) {
  return LIBELLE_TYPE[t];
}

export function slotVue(c: Creneau, now: Date, avecJour = false): SlotVue {
  const jour = jourRelatif(c.debut, now);
  return {
    iso: c.debut.toISOString(),
    label: avecJour ? `${jour === "aujourd'hui" ? "Auj." : jour === "demain" ? "Demain" : jourCourt(c.debut).replace(/ \S+$/, "")} · ${heure(c.debut)}` : heure(c.debut),
    horsPlage: c.horsPlage,
  };
}

export function rdvsDuJour(db: Db, jour: Date): RendezVous[] {
  const k = jour.toDateString();
  return db.rdvs
    .filter((r) => r.confirmation !== "annule" && new Date(r.debut).toDateString() === k)
    .sort((a, b) => a.debut.localeCompare(b.debut));
}
