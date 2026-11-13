// Dates locales (le serveur tourne avec TZ=Europe/Paris).

export const MINUTE = 60_000;
const pad = (n: number) => String(n).padStart(2, "0");

export function hm(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function versHm(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

export function minuit(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function ajouterJours(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function ajouterMinutes(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MINUTE);
}

/** Le jour donné à `minutes` minutes après minuit. */
export function aHeure(jour: Date, minutes: number): Date {
  const x = minuit(jour);
  x.setMinutes(minutes);
  return x;
}

export function minutesDuJour(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

export function cleJour(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function depuisCleJour(s: string | undefined | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Valeur d'un champ <input type="datetime-local"> en heure locale. */
export function depuisDateHeureLocale(s: string | undefined | null): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s ?? "");
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
}

export function versDateHeureLocale(d: Date): string {
  return `${cleJour(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function memeJour(a: Date, b: Date): boolean {
  return cleJour(a) === cleJour(b);
}

export function ecartJours(a: Date, b: Date): number {
  return Math.round((minuit(b).getTime() - minuit(a).getTime()) / 86_400_000);
}

export function arrondirSup(min: number, pas = 5): number {
  return Math.ceil(min / pas) * pas;
}

export function lundi(d: Date): Date {
  const x = minuit(d);
  return ajouterJours(x, -((x.getDay() + 6) % 7));
}

/** Avance (ou recule) de `n` jours ouvrés, du lundi au vendredi. n = 0 : le jour même. */
export function jourOuvre(depuis: Date, n: number): Date {
  let d = minuit(depuis);
  const pas = n < 0 ? -1 : 1;
  let reste = Math.abs(n);
  while (reste > 0) {
    d = ajouterJours(d, pas);
    if (d.getDay() !== 0 && d.getDay() !== 6) reste--;
  }
  return d;
}
