import Link from "next/link";
import { Flash } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { MiniMap } from "@/components/MiniMap";
import { Merci, PageClient } from "@/components/PageClient";
import { SubmitButton } from "@/components/SubmitButton";
import { annulerRdv, confirmerPresence, demanderReport } from "@/lib/actions";
import { creneauxLibres } from "@/lib/domain/agenda";
import { rdvCourant } from "@/lib/domain/operations";
import { capitaliser, duree, heure, jourLong } from "@/lib/domain/format";
import { MINUTE } from "@/lib/domain/temps";
import { pageClient } from "@/lib/client";
import { premier, slotVue } from "@/lib/vue";

export const metadata = { title: "Votre rendez-vous" };

export default async function Rdv({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, now, d, a, token } = await pageClient(params);
  const sp = await searchParams;
  const etape = premier(sp.etape);
  const r = rdvCourant(db, d.id);
  const props = { titre: "Votre rendez-vous", entreprise: a.entreprise, tel: a.telephone };

  if (d.statut === "perdu" && d.motifPerdu === "annule_client") {
    return <PageClient {...props}><Merci titre="Rendez-vous annulé"><p className="hint" style={{ fontSize: 14 }}>{a.entreprise} est prévenu. Pour un nouveau rendez-vous, appelez-nous.</p></Merci></PageClient>;
  }
  if (!r || new Date(r.fin) < now || d.statut === "termine" || d.statut === "perdu") {
    return <PageClient {...props}><p className="vide-etat">Aucun rendez-vous à venir pour ce dossier.</p></PageClient>;
  }
  const debut = new Date(r.debut);
  const libelle = r.nature === "chantier" ? "Travaux" : r.nature === "visite" ? "Visite technique" : "Dépannage";
  const champ = <input type="hidden" name="token" value={token} />;

  if (etape === "report") {
    const libres = creneauxLibres(a, db.rdvs, d.type, now, 10, now, 6).filter((c) => c.debut.getTime() !== debut.getTime());
    return (
      <PageClient {...props}>
        <Flash erreur={premier(sp.erreur)} />
        <h2 className="titre-client">Choisissez un autre créneau</h2>
        <p className="hint" style={{ fontSize: 14 }}>{a.entreprise} confirmera le nouveau créneau par SMS. Votre rendez-vous actuel reste réservé en attendant.</p>
        <form action={demanderReport} className="grid">
          {champ}
          <div className="slots" role="radiogroup" aria-label="Créneaux libres">
            {libres.map((c) => (
              <label key={c.debut.toISOString()} className="slot">
                <input className="sr" type="radio" name="creneau" value={c.debut.toISOString()} required />
                {slotVue(c, now, true).label}
              </label>
            ))}
            <label className="slot"><input className="sr" type="radio" name="creneau" value="rappel" />Rappelez-moi</label>
          </div>
          <input name="souhait" className="in" placeholder="Précision (facultatif) : plutôt le matin…" />
          <SubmitButton enCours="Envoi…">Envoyer ma demande</SubmitButton>
        </form>
        <Link href={`/c/${token}/rdv`} className="pill ghost">Garder mon rendez-vous</Link>
      </PageClient>
    );
  }

  if (etape === "annuler") {
    return (
      <PageClient {...props}>
        <h2 className="titre-client">Annuler le rendez-vous du {jourLong(debut)} à {heure(debut)} ?</h2>
        <p className="hint" style={{ fontSize: 14 }}>{a.entreprise} sera prévenu et libérera le créneau.</p>
        <form action={annulerRdv}>{champ}<SubmitButton className="pill red" enCours="Annulation…">Oui, annuler le rendez-vous</SubmitButton></form>
        <Link href={`/c/${token}/rdv?etape=report`} className="pill w">Plutôt changer de créneau</Link>
        <Link href={`/c/${token}/rdv`} className="pill ghost">Garder mon rendez-vous</Link>
      </PageClient>
    );
  }

  return (
    <PageClient {...props}>
      <Flash ok={premier(sp.ok)} erreur={premier(sp.erreur)} />
      <section className="wc">
        <span className={`tag ${r.nature === "depannage" ? "lime" : "ink"}`} style={{ justifySelf: "start" }}>{libelle}</span>
        <div className="bigdate">{capitaliser(jourLong(debut))}<br />à {heure(debut)}</div>
        <div className="hint" style={{ fontSize: 14 }}>{a.entreprise} · environ {duree((new Date(r.fin).getTime() - debut.getTime()) / MINUTE)}</div>
        <MiniMap points={[{ adresse: d.client.adresse, sombre: r.nature !== "depannage", actif: true }]} hauteur={130} trajet={false} />
        <dl className="kv"><div><Icon name="pin" /><div><dt>Adresse de l'intervention</dt><dd>{d.client.adresse}</dd></div></div></dl>
      </section>
      {r.confirmation === "confirme" ? (
        <p className="flash ok">Votre présence est confirmée. À bientôt.</p>
      ) : r.confirmation === "report_demande" ? (
        <p className="flash ok">Votre demande de changement est transmise. Vous recevrez un SMS de confirmation.</p>
      ) : (
        <form action={confirmerPresence}>{champ}<SubmitButton className="pill big" enCours="Confirmation…">Je confirme ma présence</SubmitButton></form>
      )}
      <Link href={`/c/${token}/rdv?etape=report`} className="pill w">Demander un autre créneau</Link>
      <Link href={`/c/${token}/rdv?etape=annuler`} className="pill red">Annuler le rendez-vous</Link>
    </PageClient>
  );
}
