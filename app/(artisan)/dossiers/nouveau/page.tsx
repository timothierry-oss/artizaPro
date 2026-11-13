import { AppBar } from "@/components/AppBar";
import { SpeedDialForm, type OptionCreneau, type Suggestions } from "@/components/SpeedDialForm";
import { FENETRES, creneauxFenetre, creneauxLibres } from "@/lib/domain/agenda";
import { capitaliser, duree, nomJour } from "@/lib/domain/format";
import { ecartJours, jourOuvre } from "@/lib/domain/temps";
import type { TypeMission } from "@/lib/domain/types";
import { lireDb } from "@/lib/serveur";
import { slotVue } from "@/lib/vue";

export const metadata = { title: "Nouveau dossier" };

export default async function Nouveau() {
  const { db, now } = await lireDb();
  const a = db.artisan;
  const suivant = jourOuvre(now, 1);
  const suggestions = {} as Suggestions;
  for (const t of ["depannage", "visite"] as TypeMission[]) {
    let auj = creneauxLibres(a, db.rdvs, t, now, 1, now, 3);
    if (!auj.length) auj = creneauxFenetre(a, db.rdvs, t, now, FENETRES.journee, now, 3);
    const s: Record<OptionCreneau, ReturnType<typeof slotVue>[]> = {
      aujourdhui: auj.map((c) => slotVue(c, now)),
      demain_matin: creneauxFenetre(a, db.rdvs, t, suivant, FENETRES.matin, now, 3).map((c) => slotVue(c, now)),
      demain_aprem: creneauxFenetre(a, db.rdvs, t, suivant, FENETRES.apresMidi, now, 3).map((c) => slotVue(c, now)),
    };
    suggestions[t] = s;
  }
  return (
    <>
      <AppBar titre="Nouveau dossier" retour="/" />
      <main className="screen focus">
        <SpeedDialForm
          suggestions={suggestions}
          durees={{ depannage: duree(a.durees.depannage), visite: duree(a.durees.visite) }}
          demainLabel={ecartJours(now, suivant) === 1 ? "Demain" : capitaliser(nomJour(suivant))}
        />
      </main>
    </>
  );
}
