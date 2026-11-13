import type { MotifPerdu, Statut, TypeMission } from "./types.ts";

/** Parcours de chaque type de mission (cahier de cadrage, section 3). */
export const PARCOURS: Record<TypeMission, Statut[]> = {
  depannage: ["a_traiter", "rdv_planifie", "intervention_faite", "termine"],
  visite: ["a_traiter", "visite_planifiee", "devis_envoye", "signe", "chantier_planifie", "termine"],
};

export const LIBELLE_STATUT: Record<Statut, string> = {
  a_traiter: "À traiter",
  rdv_planifie: "RDV planifié",
  intervention_faite: "Intervention faite",
  visite_planifiee: "Visite planifiée",
  devis_envoye: "Devis envoyé",
  signe: "Signé",
  chantier_planifie: "Chantier planifié",
  termine: "Terminé",
  perdu: "Perdu",
};

/** Couleur du badge de statut (classes .tag du système visuel). */
export const TAG_STATUT: Record<Statut, string> = {
  a_traiter: "lime",
  rdv_planifie: "ink",
  visite_planifiee: "ink",
  intervention_faite: "out",
  devis_envoye: "violet",
  signe: "green",
  chantier_planifie: "ink",
  termine: "green",
  perdu: "grey",
};

export const LIBELLE_TYPE: Record<TypeMission, string> = { depannage: "Dépannage", visite: "Visite" };
export const TAG_TYPE: Record<TypeMission, string> = { depannage: "lime", visite: "ink" };

export const MOTIFS_PERDU: Record<MotifPerdu, string> = {
  devis_non_signe: "Devis non signé",
  annule_client: "Rendez-vous annulé",
  injoignable: "Injoignable",
  autre_artisan: "A choisi un autre artisan",
  autre: "Autre motif",
};

/** Ordre d'affichage des groupes dans l'onglet Dossiers. */
export const ORDRE_STATUTS: Statut[] = [
  "a_traiter",
  "rdv_planifie",
  "visite_planifiee",
  "intervention_faite",
  "devis_envoye",
  "signe",
  "chantier_planifie",
  "termine",
];

export function estActif(s: Statut): boolean {
  return s !== "termine" && s !== "perdu";
}

/** Seules transitions autorisées : l'étape suivante du parcours, Perdu depuis un dossier actif, et la restauration d'un perdu. */
export function peutPasser(type: TypeMission, de: Statut, vers: Statut): boolean {
  if (de === vers) return false;
  if (vers === "perdu") return estActif(de);
  if (de === "perdu") return vers === "a_traiter";
  const p = PARCOURS[type];
  const i = p.indexOf(de);
  return i >= 0 && p[i + 1] === vers;
}

export function statutSuivant(type: TypeMission, de: Statut): Statut | undefined {
  const p = PARCOURS[type];
  const i = p.indexOf(de);
  return i >= 0 ? p[i + 1] : undefined;
}
