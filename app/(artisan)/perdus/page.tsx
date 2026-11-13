import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { restaurer } from "@/lib/actions";
import { MOTIFS_PERDU } from "@/lib/domain/statuts";
import { dateCourte, initiales } from "@/lib/domain/format";
import type { MotifPerdu } from "@/lib/domain/types";
import { lireDb } from "@/lib/serveur";
import { premier, resume, ville } from "@/lib/vue";

export const metadata = { title: "Dossiers perdus" };

export default async function Perdus({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { db } = await lireDb();
  const motif = premier(sp.motif) as MotifPerdu | undefined;
  const perdus = db.dossiers.filter((d) => d.statut === "perdu").sort((a, b) => (b.perduLe ?? "").localeCompare(a.perduLe ?? ""));
  const motifs = (Object.keys(MOTIFS_PERDU) as MotifPerdu[]).filter((m) => perdus.some((d) => d.motifPerdu === m));

  return (
    <>
      <AppBar titre="Perdus" retour="/dossiers" />
      <main className="screen">
        <Flash ok={premier(sp.ok)} erreur={premier(sp.erreur)} />
        <nav className="chips" aria-label="Filtrer par motif">
          <Link href="/perdus" className={`chip${!motif ? " on" : ""}`}>Tous</Link>
          {motifs.map((m) => (
            <Link key={m} href={`/perdus?motif=${m}`} className={`chip${motif === m ? " on" : ""}`}>{MOTIFS_PERDU[m]}</Link>
          ))}
        </nav>
        {motifs
          .filter((m) => !motif || m === motif)
          .map((m) => {
            const liste = perdus.filter((d) => d.motifPerdu === m);
            return (
              <section key={m} className="group" aria-label={MOTIFS_PERDU[m]}>
                <div className="gh"><small>Motif</small><small className="r">Dossiers</small><b>{MOTIFS_PERDU[m]}</b><b className="r">{liste.length}</b></div>
                {liste.map((d) => (
                  <div key={d.id} className="li">
                    <Link href={`/dossiers/${d.id}`} className="av">{initiales(d.client.nom)}</Link>
                    <Link href={`/dossiers/${d.id}`} className="tx"><b>{d.client.nom}</b><small>{resume(d.description, 26)} · {ville(d.client.adresse)}</small></Link>
                    <span className="rt">
                      <form action={restaurer}>
                        <input type="hidden" name="id" value={d.id} />
                        <input type="hidden" name="retour" value="/perdus" />
                        <SubmitButton className="tag out">Restaurer</SubmitButton>
                      </form>
                      <small>{d.perduLe ? dateCourte(d.perduLe) : ""}</small>
                    </span>
                  </div>
                ))}
              </section>
            );
          })}
        {perdus.length === 0 && <p className="vide-etat">Aucun dossier perdu.</p>}
        <p className="hint">Aucune demande d'avis n'est envoyée pour un dossier perdu. Conservation 3 ans après clôture (à confirmer avec un juriste).</p>
      </main>
    </>
  );
}
