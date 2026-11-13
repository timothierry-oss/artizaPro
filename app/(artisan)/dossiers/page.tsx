import Link from "next/link";
import { AppBar, BoutonCarre } from "@/components/AppBar";
import { Flash } from "@/components/Flash";
import { LIBELLE_STATUT, ORDRE_STATUTS } from "@/lib/domain/statuts";
import { initiales } from "@/lib/domain/format";
import { lireDb } from "@/lib/serveur";
import { ligneDossier, premier } from "@/lib/vue";

export const metadata = { title: "Dossiers" };

export default async function Dossiers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { db, now } = await lireDb();
  const type = premier(sp.type);
  const q = (premier(sp.q) ?? "").trim().toLowerCase();
  const filtres = db.dossiers.filter(
    (d) =>
      d.statut !== "perdu" &&
      (!type || d.type === type) &&
      (!q || `${d.client.nom} ${d.client.adresse} ${d.client.telephone} ${d.description} ${d.numero}`.toLowerCase().includes(q)),
  );
  const perdus = db.dossiers.filter((d) => d.statut === "perdu").length;
  const lien = (t?: string) => `/dossiers${t ? `?type=${t}` : ""}`;

  return (
    <>
      <AppBar titre="Dossiers" droite={<BoutonCarre href="/dossiers/nouveau" icone="plus" label="Nouveau dossier" />} />
      <main className="screen">
        <Flash ok={premier(sp.ok)} erreur={premier(sp.erreur)} />
        <form action="/dossiers" role="search">
          {type && <input type="hidden" name="type" value={type} />}
          <input className="in" type="search" name="q" defaultValue={q} placeholder="Rechercher un nom, une adresse, un numéro" aria-label="Rechercher" />
        </form>
        <nav className="chips" aria-label="Filtrer par type">
          <Link href={lien()} className={`chip${!type ? " on" : ""}`}>Tous</Link>
          <Link href={lien("depannage")} className={`chip${type === "depannage" ? " on" : ""}`}>Dépannage {type === "depannage" && <b>×</b>}</Link>
          <Link href={lien("visite")} className={`chip${type === "visite" ? " on" : ""}`}>Visite {type === "visite" && <b>×</b>}</Link>
        </nav>
        {ORDRE_STATUTS.map((st) => {
          const liste = filtres.filter((d) => d.statut === st).sort((a, b) => b.creeLe.localeCompare(a.creeLe));
          if (!liste.length) return null;
          const replie = st === "termine" && !q;
          return (
            <section key={st} className="group" aria-label={LIBELLE_STATUT[st]}>
              <div className="gh"><small>Statut</small><small className="r">Dossiers</small><b>{LIBELLE_STATUT[st]}</b><b className="r">{liste.length}</b></div>
              {(replie ? liste.slice(0, 3) : liste).map((d) => {
                const l = ligneDossier(db, d, now);
                return (
                  <Link key={d.id} href={`/dossiers/${d.id}`} className="li">
                    <span className={`av ${d.type === "depannage" ? "l" : "d"}`}>{initiales(d.client.nom)}</span>
                    <span className="tx"><b>{d.client.nom}</b><small>{l.sous}</small></span>
                    <span className="rt"><span className={`tag ${l.tag.cls}`}>{l.tag.texte}</span>{l.petit && <small>{l.petit}</small>}</span>
                  </Link>
                );
              })}
              {replie && liste.length > 3 && <p className="hint" style={{ paddingTop: 10 }}>Et {liste.length - 3} autres. Utilisez la recherche pour les retrouver.</p>}
            </section>
          );
        })}
        {filtres.length === 0 && <p className="vide-etat">Aucun dossier ne correspond.</p>}
        <Link href="/perdus" className="pill ghost">Dossiers perdus ({perdus})</Link>
      </main>
    </>
  );
}
