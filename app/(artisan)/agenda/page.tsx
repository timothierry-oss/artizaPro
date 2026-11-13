import Link from "next/link";
import { AppBar, BoutonCarre } from "@/components/AppBar";
import { Flash } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { MiniMap } from "@/components/MiniMap";
import { SubmitButton } from "@/components/SubmitButton";
import { ajouterIndispo, supprimerIndispo } from "@/lib/actions";
import { blocsDuJour, plagesDuJour } from "@/lib/domain/agenda";
import { capitaliser, duree, heure, jourLong, lettreJour, plageHoraire } from "@/lib/domain/format";
import { MINUTE, ajouterJours, cleJour, depuisCleJour, ecartJours, hm, lundi, memeJour, minuit, minutesDuJour } from "@/lib/domain/temps";
import type { Db, RendezVous, TypeMission } from "@/lib/domain/types";
import { lireDb } from "@/lib/serveur";
import { premier, rdvsDuJour } from "@/lib/vue";

export const metadata = { title: "Agenda" };

const H = 56; // pixels par heure

function nomRdv(db: Db, r: RendezVous) {
  const d = db.dossiers.find((x) => x.id === r.dossierId);
  return { d, nom: d?.client.nom ?? r.note ?? "Indisponible", libelle: r.nature === "chantier" ? "Chantier" : r.nature === "visite" ? "Visite" : "Dépannage" };
}

function Grille({ db, jour, now }: { db: Db; jour: Date; now: Date }) {
  const a = db.artisan;
  const blocs = blocsDuJour(a, db.rdvs, jour);
  const plages = (["visite", "depannage"] as TypeMission[]).flatMap((t) => plagesDuJour(a, t, jour).map((p) => ({ t, p })));
  const minutes = [...plages.flatMap(({ p }) => [hm(p.debut), hm(p.fin)]), ...blocs.flatMap((b) => [minutesDuJour(b.debut), minutesDuJour(b.fin) || 24 * 60])];
  const debutH = Math.min(8, ...minutes.map((m) => Math.floor(m / 60)));
  const finH = Math.max(19, ...minutes.map((m) => Math.ceil(m / 60)));
  const y = (d: Date) => ((d.getTime() - minuit(jour).getTime()) / MINUTE / 60 - debutH) * H;
  const retour = `/agenda?jour=${cleJour(jour)}`;
  return (
    <div className="agd">
      <div className="grid" style={{ height: (finH - debutH) * H }}>
        {Array.from({ length: finH - debutH + 1 }, (_, i) => (
          <div key={i} className="hr" style={{ top: i * H }}><span>{debutH + i}:00</span></div>
        ))}
        {plages.map(({ t, p }, i) => (
          <div key={i} className={`band ${t}`} style={{ top: (hm(p.debut) / 60 - debutH) * H, height: ((hm(p.fin) - hm(p.debut)) / 60) * H }}>
            <i>{t === "visite" ? "Visites" : "Dépannages"}</i>
          </div>
        ))}
        {blocs.map((b, i) => {
          const top = y(b.debut);
          const hauteur = Math.max(y(b.fin) - top, 16);
          if (b.genre === "trajet") return <div key={i} className="ev tr" style={{ top, height: hauteur }}>trajet {Math.round((b.fin.getTime() - b.debut.getTime()) / MINUTE)} min</div>;
          if (b.genre === "libre") {
            // Pas de créneau libre dans le passé ; celui en cours commence maintenant.
            if (b.fin <= now) return null;
            if (b.debut < now) {
              const reste = (b.fin.getTime() - now.getTime()) / MINUTE;
              if (reste < 30) return null;
              const t2 = y(now);
              return <div key={i} className="ev free" style={{ top: t2, height: Math.max(y(b.fin) - t2, 16) }}>Libre <small>{plageHoraire(now, b.fin)}</small></div>;
            }
            return (
              <div key={i} className="ev free" style={{ top, height: hauteur }}>
                Libre{b.propose ? " · proposé aux clients" : ""} <small>{plageHoraire(b.debut, b.fin)}</small>
              </div>
            );
          }
          const r = b.rdv!;
          if (r.nature === "indispo") {
            return (
              <div key={i} className="ev ind" style={{ top, height: hauteur }}>
                <b>{r.note ?? "Indisponible"}</b> <small>{plageHoraire(r.debut, r.fin)}</small>
                <form action={supprimerIndispo}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="retour" value={retour} />
                  <button aria-label="Supprimer l'indisponibilité">×</button>
                </form>
              </div>
            );
          }
          const { d, nom, libelle } = nomRdv(db, r);
          const cls = r.nature === "depannage" ? "l" : r.nature === "chantier" ? "c" : "d";
          return (
            <Link key={i} href={d ? `/dossiers/${d.id}` : "#"} className={`ev ${cls}${hauteur >= 60 ? " haut" : ""}`} style={{ top, height: hauteur }}>
              <b>{nom}</b> <small>{plageHoraire(r.debut, r.fin)} · {libelle}</small>
              {hauteur >= 60 && d && <small>{d.client.adresse}</small>}
              {hauteur >= 72 && r.confirmation !== "confirme" && new Date(r.fin) > now && (
                <span className={`tag ${r.confirmation === "report_demande" ? "red" : "red"}`}>{r.confirmation === "report_demande" ? "Report demandé" : "Non confirmé"}</span>
              )}
            </Link>
          );
        })}
        {memeJour(jour, now) && minutesDuJour(now) / 60 >= debutH && minutesDuJour(now) / 60 <= finH && <div className="now" style={{ top: y(now) }} aria-label={`Maintenant, ${heure(now)}`} />}
      </div>
    </div>
  );
}

export default async function Agenda({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { db, now } = await lireDb();
  const jour = depuisCleJour(premier(sp.jour)) ?? minuit(now);
  const vue = premier(sp.vue) === "semaine" ? "semaine" : premier(sp.vue) === "carte" ? "carte" : "jour";
  let debutBande = lundi(now);
  if (jour < debutBande || ecartJours(debutBande, jour) > 20) debutBande = lundi(jour);
  const jours = Array.from({ length: 21 }, (_, i) => ajouterJours(debutBande, i));
  const occupe = new Set(db.rdvs.filter((r) => r.confirmation !== "annule" && r.nature !== "indispo").map((r) => cleJour(new Date(r.debut))));
  const lien = (j: Date, v = vue) => `/agenda?jour=${cleJour(j)}${v !== "jour" ? `&vue=${v}` : ""}`;
  const duJour = rdvsDuJour(db, jour).filter((r) => r.nature !== "indispo");
  const ical = `/api/ical?key=${db.artisan.icalKey}`;

  return (
    <>
      <AppBar titre="Agenda" droite={<BoutonCarre href={`/profil#ical`} icone="link" label="Abonnement iCal" />} />
      <main className="screen" style={{ gap: 12 }}>
        <Flash ok={premier(sp.ok)} erreur={premier(sp.erreur)} />
        <nav className="dayrow" aria-label="Jours">
          {jours.map((j) => (
            <Link key={cleJour(j)} href={lien(j)} className={`${memeJour(j, jour) ? "on" : ""}${memeJour(j, now) ? " auj" : ""}`} aria-current={memeJour(j, jour) ? "date" : undefined}>
              <span>{lettreJour(j)}</span>
              <b>{j.getDate()}</b>
              {occupe.has(cleJour(j)) ? <i /> : <span style={{ height: 5 }} />}
            </Link>
          ))}
        </nav>
        <nav className="seg" aria-label="Vue">
          <Link href={lien(jour, "jour")} className={vue === "jour" ? "on" : ""}>Jour</Link>
          <Link href={lien(jour, "semaine")} className={vue === "semaine" ? "on" : ""}>Semaine</Link>
          <Link href={lien(jour, "carte")} className={vue === "carte" ? "on" : ""}>Lieux</Link>
        </nav>
        <div className="sect" style={{ paddingTop: 0 }}>
          <h2 style={{ font: "inherit" }}>{vue === "semaine" ? `Semaine du ${lundi(jour).getDate()}` : capitaliser(jourLong(jour))}</h2>
          {!memeJour(jour, now) && <Link href="/agenda" className="lnk">Aujourd'hui</Link>}
        </div>

        {vue === "jour" && <Grille db={db} jour={jour} now={now} />}

        {vue === "carte" && (
          <section className="wc" style={{ padding: 12, gap: 10 }}>
            {duJour.length ? (
              <>
                <MiniMap
                  noms
                  hauteur={260}
                  points={duJour.map((r) => ({ adresse: nomRdv(db, r).d?.client.adresse ?? r.id, sombre: r.nature !== "depannage", heure: heure(r.debut) }))}
                />
                {duJour.map((r, i) => {
                  const { d, nom, libelle } = nomRdv(db, r);
                  return (
                    <Link key={r.id} href={d ? `/dossiers/${d.id}` : "#"} className="rr">
                      <div className={`t ${r.nature === "depannage" ? "l" : "d"}`}>{i + 1}<small>{heure(r.debut)}</small></div>
                      <span className="tx"><b>{nom}</b><small>{libelle} · {d?.client.adresse}</small></span>
                      <span className="chev">›</span>
                    </Link>
                  );
                })}
                <p className="hint">Positions indicatives : la carte réelle (OpenStreetMap) sera branchée plus tard.</p>
              </>
            ) : (
              <p className="vide-etat">Aucun rendez-vous ce jour-là.</p>
            )}
          </section>
        )}

        {vue === "semaine" &&
          Array.from({ length: 7 }, (_, i) => ajouterJours(lundi(jour), i)).map((j) => {
            const liste = rdvsDuJour(db, j);
            return (
              <section key={cleJour(j)} className="group">
                <div className="gh"><small>{memeJour(j, now) ? "Aujourd'hui" : ""}</small><small className="r">RDV</small><b><Link href={lien(j, "jour")}>{capitaliser(jourLong(j))}</Link></b><b className="r">{liste.filter((r) => r.nature !== "indispo").length}</b></div>
                {liste.length === 0 && <p className="hint">Libre.</p>}
                {liste.map((r) => {
                  const { d, nom, libelle } = nomRdv(db, r);
                  return (
                    <Link key={r.id} href={d ? `/dossiers/${d.id}` : lien(j, "jour")} className="li">
                      <span className={`av ${r.nature === "depannage" ? "l" : r.nature === "indispo" ? "" : "d"}`} style={{ fontSize: 12 }}>{heure(r.debut)}</span>
                      <span className="tx"><b>{nom}</b><small>{r.nature === "indispo" ? `Indisponible · ${plageHoraire(r.debut, r.fin)}` : `${libelle} · ${duree((new Date(r.fin).getTime() - new Date(r.debut).getTime()) / MINUTE)}`}</small></span>
                      {r.nature !== "indispo" && <span className="rt"><span className={`tag ${r.confirmation === "confirme" ? "green" : new Date(r.fin) < now ? "grey" : "red"}`}>{r.confirmation === "confirme" ? "Confirmé" : new Date(r.fin) < now ? "Passé" : "Non confirmé"}</span></span>}
                    </Link>
                  );
                })}
              </section>
            );
          })}

        <details className="dep">
          <summary className="rw">
            <span className="ico"><Icon name="plus" /></span>
            <span className="tx">Ajouter une indisponibilité<small>Les créneaux bloqués ne sont plus proposés aux clients</small></span>
            <span className="chev">›</span>
          </summary>
          <form action={ajouterIndispo} className="corps">
            <div className="field"><label htmlFor="i-jour">Jour</label><input id="i-jour" name="jour" type="date" className="in" defaultValue={cleJour(jour)} required /></div>
            <div className="duo">
              <div className="field"><label htmlFor="i-de">De</label><input id="i-de" name="de" type="time" className="in" defaultValue="12:00" required /></div>
              <div className="field"><label htmlFor="i-a">À</label><input id="i-a" name="a" type="time" className="in" defaultValue="13:30" required /></div>
            </div>
            <div className="field"><label htmlFor="i-note">Motif (facultatif)</label><input id="i-note" name="note" className="in" placeholder="Fournisseur, rendez-vous perso…" /></div>
            <SubmitButton>Bloquer ce créneau</SubmitButton>
          </form>
        </details>
        <p className="hint">Les événements de ton agenda externe ne bloquent pas les créneaux : marque tes indisponibilités ici. <a href={ical} style={{ textDecoration: "underline" }}>Flux iCal</a> pour afficher cet agenda dans Google, Apple ou Outlook.</p>
      </main>
    </>
  );
}
