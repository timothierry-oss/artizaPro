import type { Artisan, Plage, RendezVous, TypeMission } from "./types.ts";
import { MINUTE, aHeure, ajouterJours, ajouterMinutes, arrondirSup, hm, memeJour, minuit, minutesDuJour } from "./temps.ts";

export interface Creneau {
  debut: Date;
  fin: Date;
  /** Hors des plages réglées pour ce type de mission. */
  horsPlage: boolean;
}

export const FENETRES = {
  matin: [hm("08:00"), hm("12:00")] as const,
  apresMidi: [hm("13:30"), hm("18:30")] as const,
  journee: [hm("08:00"), hm("19:00")] as const,
};

export function plagesDuJour(artisan: Artisan, type: TypeMission, jour: Date): Plage[] {
  return artisan.plages[type]
    .filter((p) => p.jours.includes(jour.getDay()))
    .sort((a, b) => hm(a.debut) - hm(b.debut));
}

export function dansPlage(artisan: Artisan, type: TypeMission, debut: Date, fin: Date): boolean {
  if (!memeJour(debut, new Date(fin.getTime() - 1))) return false;
  const a = minutesDuJour(debut);
  const b = a + (fin.getTime() - debut.getTime()) / MINUTE;
  return plagesDuJour(artisan, type, debut).some((p) => a >= hm(p.debut) && b <= hm(p.fin));
}

export function rdvActifs(rdvs: RendezVous[]): RendezVous[] {
  return rdvs.filter((r) => r.confirmation !== "annule");
}

/** Rendez-vous et indisponibilités qui chevauchent [debut, fin], trajet compris (sauf autour d'une indisponibilité). */
export function conflits(rdvs: RendezVous[], debut: Date, fin: Date, trajet: number, ignorer?: string): RendezVous[] {
  return rdvActifs(rdvs).filter((r) => {
    if (r.id === ignorer) return false;
    const marge = (r.nature === "indispo" ? 0 : trajet) * MINUTE;
    return new Date(r.debut).getTime() - marge < fin.getTime() && debut.getTime() < new Date(r.fin).getTime() + marge;
  });
}

function chercher(
  artisan: Artisan,
  rdvs: RendezVous[],
  type: TypeMission,
  jour: Date,
  de: number,
  a: number,
  maintenant: Date,
  max: number,
): Creneau[] {
  const d = artisan.durees[type];
  const out: Creneau[] = [];
  // Pas de créneau qui commence dans moins de 30 minutes.
  const auPlusTot = maintenant.getTime() + 30 * MINUTE;
  let t = de;
  while (t + d <= a && out.length < max) {
    const debut = aHeure(jour, t);
    if (debut.getTime() < auPlusTot) {
      const tot = new Date(auPlusTot);
      if (!memeJour(tot, jour)) break;
      t = Math.max(t + 5, arrondirSup(minutesDuJour(tot), 15));
      continue;
    }
    const fin = ajouterMinutes(debut, d);
    const c = conflits(rdvs, debut, fin, artisan.trajet);
    if (c.length) {
      const libreA = Math.max(...c.map((r) => new Date(r.fin).getTime() + (r.nature === "indispo" ? 0 : artisan.trajet) * MINUTE));
      const suivant = new Date(libreA);
      if (!memeJour(suivant, jour)) break;
      t = Math.max(t + 5, arrondirSup(minutesDuJour(suivant), 5));
      continue;
    }
    out.push({ debut, fin, horsPlage: !dansPlage(artisan, type, debut, fin) });
    t += d + artisan.trajet;
  }
  return out;
}

/** Créneaux libres dans les plages du type de mission, sur `nbJours` jours à partir de `depuis`. */
export function creneauxLibres(
  artisan: Artisan,
  rdvs: RendezVous[],
  type: TypeMission,
  depuis: Date,
  nbJours: number,
  maintenant: Date,
  max = 8,
): Creneau[] {
  const out: Creneau[] = [];
  for (let i = 0; i < nbJours && out.length < max; i++) {
    const jour = ajouterJours(minuit(depuis), i);
    for (const p of plagesDuJour(artisan, type, jour)) {
      out.push(...chercher(artisan, rdvs, type, jour, hm(p.debut), hm(p.fin), maintenant, max - out.length));
    }
  }
  return out.slice(0, max);
}

/** Créneaux libres dans une fenêtre horaire d'un jour, en plage ou non (le drapeau horsPlage le dit). */
export function creneauxFenetre(
  artisan: Artisan,
  rdvs: RendezVous[],
  type: TypeMission,
  jour: Date,
  fenetre: readonly [number, number],
  maintenant: Date,
  max = 3,
): Creneau[] {
  return chercher(artisan, rdvs, type, minuit(jour), fenetre[0], fenetre[1], maintenant, max);
}

export interface Bloc {
  genre: "rdv" | "trajet" | "libre";
  debut: Date;
  fin: Date;
  rdv?: RendezVous;
  /** Créneau libre assez long pour être proposé aux clients. */
  propose?: boolean;
}

/** Blocs à afficher dans la grille horaire d'un jour : rendez-vous, trajets, créneaux libres dans les plages. */
export function blocsDuJour(artisan: Artisan, rdvs: RendezVous[], jour: Date): Bloc[] {
  const duJour = rdvActifs(rdvs)
    .filter((r) => memeJour(new Date(r.debut), jour))
    .sort((a, b) => a.debut.localeCompare(b.debut));
  const blocs: Bloc[] = duJour.map((r) => ({ genre: "rdv", debut: new Date(r.debut), fin: new Date(r.fin), rdv: r }));

  const occupe: [number, number][] = [];
  for (const r of duJour) {
    const debut = new Date(r.debut).getTime();
    let fin = new Date(r.fin).getTime();
    if (r.nature !== "indispo") {
      const suivant = duJour.find((s) => s.nature !== "indispo" && new Date(s.debut).getTime() >= fin);
      if (suivant) {
        const finTrajet = Math.min(fin + artisan.trajet * MINUTE, new Date(suivant.debut).getTime());
        if (finTrajet > fin) blocs.push({ genre: "trajet", debut: new Date(fin), fin: new Date(finTrajet) });
      }
      fin += artisan.trajet * MINUTE;
    }
    occupe.push([debut, fin]);
  }

  for (const type of ["visite", "depannage"] as TypeMission[]) {
    for (const p of plagesDuJour(artisan, type, jour)) {
      let curseur = aHeure(jour, hm(p.debut)).getTime();
      const finPlage = aHeure(jour, hm(p.fin)).getTime();
      const dedans = occupe.filter(([a, b]) => b > curseur && a < finPlage).sort((x, y) => x[0] - y[0]);
      for (const [a, b] of [...dedans, [finPlage, finPlage] as [number, number]]) {
        if (a - curseur >= 30 * MINUTE) {
          blocs.push({
            genre: "libre",
            debut: new Date(curseur),
            fin: new Date(Math.min(a, finPlage)),
            propose: a - curseur >= artisan.durees[type] * MINUTE,
          });
        }
        curseur = Math.max(curseur, b);
      }
    }
  }
  return blocs.sort((a, b) => a.debut.getTime() - b.debut.getTime());
}
