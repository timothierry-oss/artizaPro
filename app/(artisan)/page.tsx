import Link from "next/link";
import { BoutonCarre } from "@/components/AppBar";
import { Flash } from "@/components/Flash";
import { MiniMap } from "@/components/MiniMap";
import { aDecider } from "@/lib/domain/alertes";
import { automatisationsEnAttente, lancerAutomatisations } from "@/lib/domain/operations";
import { capitaliser, duree, heure, initiales, jourLong } from "@/lib/domain/format";
import { ajouterJours, MINUTE } from "@/lib/domain/temps";
import type { Db, RendezVous } from "@/lib/domain/types";
import { getRepo } from "@/lib/repo";
import { ctxServeur, lireDb } from "@/lib/serveur";
import { ligneDossier, premier, rdvsDuJour } from "@/lib/vue";

export const metadata = { title: "Accueil" };

function LigneRdv({ db, r, now, blanc, quand }: { db: Db; r: RendezVous; now: Date; blanc?: boolean; quand?: string }) {
  const d = db.dossiers.find((x) => x.id === r.dossierId);
  if (!d) return null;
  const fin = new Date(r.fin);
  const fait = fin < now;
  const enCours = new Date(r.debut) <= now && !fait;
  const libelle = r.nature === "chantier" ? "Chantier" : r.nature === "visite" ? "Visite" : "Dépannage";
  const tag = fait
    ? <span className="tag green">Fait</span>
    : enCours
      ? <span className="tag lime">En cours</span>
      : r.confirmation === "confirme"
        ? <span className="tag out">Confirmé</span>
        : r.confirmation === "report_demande"
          ? <span className="tag red">Report demandé</span>
          : <span className="tag red">Non confirmé</span>;
  return (
    <Link href={`/dossiers/${d.id}`} className={`rr${blanc ? " w" : ""}`}>
      <div className={`t ${r.nature === "depannage" ? "l" : "d"}`}>
        {heure(r.debut)}
        <small>{quand ?? duree((fin.getTime() - new Date(r.debut).getTime()) / MINUTE)}</small>
      </div>
      <span className="tx">
        <b>{d.client.nom}</b>
        <small>{libelle} · {d.client.adresse.replace(/,?\s*\d{5}/, ",")}</small>
      </span>
      {tag}
    </Link>
  );
}

export default async function Accueil({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  let { db, now } = await lireDb();
  // Rappels de la veille et relances : lancés au passage sur l'accueil quand il y a quelque chose à envoyer.
  if (automatisationsEnAttente(db, now)) {
    const ctx = await ctxServeur();
    await getRepo().modifier((x) => lancerAutomatisations(x, ctx, false));
    db = await getRepo().lire();
  }
  const a = db.artisan;
  const decider = aDecider(db, now);
  const aujourdhui = rdvsDuJour(db, now).filter((r) => r.nature !== "indispo");
  const demain = ajouterJours(now, 1);
  const rdvDemain = rdvsDuJour(db, demain).filter((r) => r.nature !== "indispo");
  const aTraiter = decider.dossiers.slice(0, 5);

  return (
    <>
      <header className="appbar">
        <div>
          <h1 className="hello">Bonjour, {a.prenom}</h1>
          <div className="sub">{capitaliser(jourLong(now))} · {a.entreprise}</div>
        </div>
        <BoutonCarre href="/messages" icone="bell" label="Messages" point={decider.retoursNonTraites > 0} />
      </header>
      <main className="screen">
        <Flash ok={premier(sp.ok)} erreur={premier(sp.erreur)} />
        <section className="wc" aria-label="À décider aujourd'hui">
          <div className="lbl">À décider aujourd'hui</div>
          <div className="big">{decider.total ? `${decider.total} dossier${decider.total > 1 ? "s" : ""}` : "Rien à décider"}</div>
          <div className="lbl" style={{ fontSize: 13 }}>{decider.resume || "Tous les dossiers sont à jour."}</div>
          <Link href="/dossiers/nouveau" className="pill">Nouveau dossier</Link>
        </section>

        <div className="sect">
          <h2 style={{ font: "inherit" }}>Aujourd'hui · {aujourdhui.length} rendez-vous</h2>
          <Link href="/agenda" className="lnk">Agenda</Link>
        </div>
        <section className="wc" style={{ padding: 12, gap: 10 }} aria-label="Rendez-vous du jour">
          {aujourdhui.length > 0 && (
            <MiniMap
              noms
              points={aujourdhui.map((r) => {
                const d = db.dossiers.find((x) => x.id === r.dossierId);
                return { adresse: d?.client.adresse ?? r.id, sombre: r.nature !== "depannage" };
              })}
            />
          )}
          {aujourdhui.map((r) => <LigneRdv key={r.id} db={db} r={r} now={now} />)}
          {aujourdhui.length === 0 && <p className="vide-etat">Aucun rendez-vous aujourd'hui.</p>}
        </section>
        {rdvDemain.map((r) => (
          <LigneRdv key={r.id} db={db} r={r} now={now} blanc quand="demain" />
        ))}

        <section className="wc" aria-label="À traiter">
          <div className="h">À traiter <Link href="/dossiers" className="lnk">Voir tout</Link></div>
          {aTraiter.length === 0 && decider.retoursNonTraites === 0 && <p className="hint">Rien en attente. Les nouvelles demandes arriveront ici.</p>}
          {decider.retoursNonTraites > 0 && (
            <Link href="/messages?filtre=retours" className="li">
              <span className="av l">!</span>
              <span className="tx"><b>{decider.retoursNonTraites} retour{decider.retoursNonTraites > 1 ? "s" : ""} privé{decider.retoursNonTraites > 1 ? "s" : ""}</b><small>Un client attend votre rappel</small></span>
              <span className="rt"><span className="tag lime">À rappeler</span></span>
            </Link>
          )}
          {aTraiter.map(({ dossier: d }) => {
            const l = ligneDossier(db, d, now);
            return (
              <Link key={d.id} href={`/dossiers/${d.id}`} className="li">
                <span className={`av ${d.type === "depannage" ? "l" : "d"}`}>{initiales(d.client.nom)}</span>
                <span className="tx"><b>{d.client.nom}</b><small>{l.sous}</small></span>
                <span className="rt"><span className={`tag ${l.tag.cls}`}>{l.tag.texte}</span>{l.petit && <small>{l.petit}</small>}</span>
              </Link>
            );
          })}
        </section>
        <p className="hint" style={{ textAlign: "center" }}>
          Lien de demande à partager : <Link href={`/demande/${a.slug}`} style={{ textDecoration: "underline" }}>/demande/{a.slug}</Link>
        </p>
      </main>
    </>
  );
}
