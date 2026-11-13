import Link from "next/link";
import { AppBar } from "@/components/AppBar";
import { Flash } from "@/components/Flash";
import { SubmitButton } from "@/components/SubmitButton";
import { TexteSms } from "@/components/TexteSms";
import { traiterRetour } from "@/lib/actions";
import { dateCourte, heure, telephone } from "@/lib/domain/format";
import type { GenreMessage } from "@/lib/domain/types";
import { lireDb } from "@/lib/serveur";
import { premier } from "@/lib/vue";

export const metadata = { title: "Messages" };

const GENRES: Record<GenreMessage, { libelle: string; tag: string }> = {
  confirmation_rdv: { libelle: "Confirmation RDV", tag: "ink" },
  rappel_j1: { libelle: "Rappel", tag: "grey" },
  lien_devis: { libelle: "Lien devis", tag: "violet" },
  relance_devis: { libelle: "Relance devis", tag: "violet" },
  copie_bon: { libelle: "Copie du bon", tag: "out" },
  demande_avis: { libelle: "Demande d'avis", tag: "green" },
};

const FILTRES: { cle: string; libelle: string; genres?: GenreMessage[] }[] = [
  { cle: "tous", libelle: "Tous" },
  { cle: "retours", libelle: "Retours privés" },
  { cle: "rdv", libelle: "Rendez-vous", genres: ["confirmation_rdv", "rappel_j1"] },
  { cle: "devis", libelle: "Devis", genres: ["lien_devis", "relance_devis"] },
  { cle: "avis", libelle: "Avis et bons", genres: ["demande_avis", "copie_bon"] },
];

export default async function Messages({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { db } = await lireDb();
  const filtre = FILTRES.find((f) => f.cle === premier(sp.filtre)) ?? FILTRES[0];
  const quand = (iso: string) => `${dateCourte(iso)} ${heure(iso)}`;
  const retours = filtre.cle === "tous" || filtre.cle === "retours" ? db.retours : [];
  const messages = filtre.cle === "retours" ? [] : db.messages.filter((m) => !filtre.genres || filtre.genres.includes(m.genre));
  const elements = [
    ...retours.map((r) => ({ date: r.creeLe, retour: r, message: undefined })),
    ...messages.map((m) => ({ date: m.envoyeLe, message: m, retour: undefined })),
  ]
    .sort((a, b) => {
      // Les retours non traités restent en tête.
      const pa = a.retour && !a.retour.traite ? 1 : 0;
      const pb = b.retour && !b.retour.traite ? 1 : 0;
      return pb - pa || b.date.localeCompare(a.date);
    })
    .slice(0, 80);

  return (
    <>
      <AppBar titre="Messages" />
      <main className="screen">
        <Flash ok={premier(sp.ok)} erreur={premier(sp.erreur)} />
        <p className="hint">SMS simulés : rien ne part réellement. Expéditeur {db.artisan.expediteur}, sans réponse possible. Les liens ouvrent les pages client.</p>
        <nav className="chips" aria-label="Filtrer">
          {FILTRES.map((f) => (
            <Link key={f.cle} href={f.cle === "tous" ? "/messages" : `/messages?filtre=${f.cle}`} className={`chip${f.cle === filtre.cle ? " on" : ""}`}>{f.libelle}</Link>
          ))}
        </nav>
        {elements.map((e) => {
          if (e.retour) {
            const r = e.retour;
            const d = db.dossiers.find((x) => x.id === r.dossierId);
            return (
              <article key={r.id} className={`msg${r.traite ? "" : " alert"}`}>
                <div className="mh"><span className={`tag ${r.traite ? "grey" : "lime"}`}>{r.traite ? "Retour privé · traité" : "Retour privé · à rappeler"}</span><small>{quand(r.creeLe)}</small></div>
                <div><b>{d?.client.nom}</b> · {d && telephone(d.client.telephone)}</div>
                <div className="body">{r.message}</div>
                <div className="row">
                  {d && <a className="pill sm" style={{ flex: "0 0 auto" }} href={`tel:${d.client.telephone.replace(/\s/g, "")}`}>Appeler</a>}
                  {d && <Link className="pill w sm" style={{ flex: "0 0 auto" }} href={`/dossiers/${d.id}`}>Dossier</Link>}
                  {!r.traite && (
                    <form action={traiterRetour}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="retour" value={`/messages${filtre.cle !== "tous" ? `?filtre=${filtre.cle}` : ""}`} />
                      <SubmitButton className="pill ghost sm">Marquer traité</SubmitButton>
                    </form>
                  )}
                </div>
              </article>
            );
          }
          const m = e.message!;
          const g = GENRES[m.genre];
          return (
            <article key={m.id} className="msg">
              <div className="mh"><span className={`tag ${g.tag}`}>{g.libelle}</span><small>{quand(m.envoyeLe)}</small></div>
              <div>
                {m.dossierId ? <Link href={`/dossiers/${m.dossierId}`}><b>{m.destinataire.nom}</b></Link> : <b>{m.destinataire.nom}</b>} · {telephone(m.destinataire.telephone)}
              </div>
              <div className="body"><TexteSms texte={m.texte} /></div>
            </article>
          );
        })}
        {elements.length === 0 && <p className="vide-etat">Aucun message pour ce filtre.</p>}
      </main>
    </>
  );
}
