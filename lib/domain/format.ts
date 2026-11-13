// Formats d'affichage en français, sans dépendance à Intl pour un rendu identique serveur et client.

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const JOURS_COURTS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const JOURS_LETTRE = ["D", "L", "M", "M", "J", "V", "S"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

type D = string | Date;
const dt = (x: D) => (typeof x === "string" ? new Date(x) : x);
const pad = (n: number) => String(n).padStart(2, "0");

export const capitaliser = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** 9:00, 14:30 */
export function heure(x: D): string {
  const d = dt(x);
  return `${d.getHours()}:${pad(d.getMinutes())}`;
}

/** 14 h, 14 h 30 (dans les SMS) */
export function heureSms(x: D): string {
  const d = dt(x);
  return d.getMinutes() ? `${d.getHours()} h ${pad(d.getMinutes())}` : `${d.getHours()} h`;
}

/** ven. 14 nov. */
export function jourCourt(x: D): string {
  const d = dt(x);
  return `${JOURS_COURTS[d.getDay()]} ${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}

/** vendredi 14 novembre */
export function jourLong(x: D): string {
  const d = dt(x);
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`;
}

export function nomJour(x: D): string {
  return JOURS[dt(x).getDay()];
}

/** 14 nov. */
export function dateCourte(x: D): string {
  const d = dt(x);
  return `${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`;
}

/** 14 novembre 2026 */
export function dateLongue(x: D): string {
  const d = dt(x);
  return `${d.getDate()} ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

export function lettreJour(x: D): string {
  return JOURS_LETTRE[dt(x).getDay()];
}

export function nomJourCourt(i: number): string {
  return JOURS_COURTS[i];
}

/** 40 min, 1 h 30, 2 h */
export function duree(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${pad(m)}` : `${h} h`;
}

/** 14:00–15:30 */
export function plageHoraire(debut: D, fin: D): string {
  return `${heure(debut)}–${heure(fin)}`;
}

export function chiffres(tel: string): string {
  return tel.replace(/\D/g, "").replace(/^33(?=\d{9}$)/, "0");
}

/** 06 12 34 56 78 */
export function telephone(tel: string): string {
  const c = chiffres(tel);
  return c.length === 10 ? c.replace(/(\d{2})(?=\d)/g, "$1 ") : tel;
}

export function initiales(nom: string): string {
  const mots = nom.replace(/[.]/g, " ").split(/\s+/).filter(Boolean);
  return mots
    .slice(0, 2)
    .map((m) => m[0])
    .join("")
    .toUpperCase();
}

/** à l'instant, il y a 2 h, hier, il y a 3 j, 14 nov. */
export function relatif(x: D, maintenant: Date): string {
  const d = dt(x);
  const min = Math.round((maintenant.getTime() - d.getTime()) / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  if (min < 60 * 24 && d.getDate() === maintenant.getDate()) return `il y a ${Math.round(min / 60)} h`;
  const j = Math.round(min / (60 * 24));
  if (j <= 1) return "hier";
  if (j < 7) return `il y a ${j} j`;
  return dateCourte(d);
}

/** aujourd'hui, demain, hier, ou ven. 14 nov. */
export function jourRelatif(x: D, maintenant: Date): string {
  const d = dt(x);
  const a = new Date(maintenant);
  a.setHours(0, 0, 0, 0);
  const b = new Date(d);
  b.setHours(0, 0, 0, 0);
  const n = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  if (n === 0) return "aujourd'hui";
  if (n === 1) return "demain";
  if (n === -1) return "hier";
  return jourCourt(d);
}

/** lun.–ven., sam., lun., mer. */
export function joursPlage(jours: number[]): string {
  const ordre = [1, 2, 3, 4, 5, 6, 0].filter((j) => jours.includes(j));
  if (ordre.length === 0) return "aucun jour";
  const idx = (j: number) => (j + 6) % 7;
  const contigu = ordre.every((j, i) => i === 0 || idx(j) === idx(ordre[i - 1]) + 1);
  if (contigu && ordre.length >= 3) return `${JOURS_COURTS[ordre[0]]}–${JOURS_COURTS[ordre[ordre.length - 1]]}`;
  return ordre.map((j) => JOURS_COURTS[j]).join(", ");
}

/** "8:00" à partir de "08:00" */
export function hmCourt(s: string): string {
  return s.replace(/^0(\d)/, "$1");
}
