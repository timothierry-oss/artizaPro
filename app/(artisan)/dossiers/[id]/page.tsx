import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { AppBar } from "@/components/AppBar";
import { Flash } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { MiniMap, lienItineraire } from "@/components/MiniMap";
import { SubmitButton } from "@/components/SubmitButton";
import * as act from "@/lib/actions";
import { alertesDossier } from "@/lib/domain/alertes";
import { conflits, creneauxLibres, dansPlage } from "@/lib/domain/agenda";
import { estDesinscrit, MAX_RELANCES, rdvCourant } from "@/lib/domain/operations";
import { LIBELLE_STATUT, LIBELLE_TYPE, MOTIFS_PERDU, TAG_STATUT, TAG_TYPE, estActif } from "@/lib/domain/statuts";
import { dateCourte, duree, heure, jourCourt, jourRelatif, plageHoraire, telephone } from "@/lib/domain/format";
import { ajouterMinutes, MINUTE } from "@/lib/domain/temps";
import type { Db, Dossier, RendezVous } from "@/lib/domain/types";
import { baseUrl, lireDb } from "@/lib/serveur";
import { premier, slotVue } from "@/lib/vue";

export const metadata = { title: "Dossier" };

function Cache({ d }: { d: Dossier }) {
  return <input type="hidden" name="id" value={d.id} />;
}

/** Trois créneaux libres en un clic, puis une date libre. */
function ChoixCreneau({ db, d, now, chantier }: { db: Db; d: Dossier; now: Date; chantier?: boolean }) {
  const libres = chantier ? [] : creneauxLibres(db.artisan, db.rdvs, d.type, now, 10, now, 3);
  return (
    <>
      {libres.length > 0 && (
        <div className="field">
          <span className="lab">Prochains créneaux libres</span>
          <div className="slots">
            {libres.map((c) => (
              <form key={c.debut.toISOString()} action={act.planifier}>
                <Cache d={d} />
                <input type="hidden" name="debut" value={c.debut.toISOString()} />
                <SubmitButton className="slot">{slotVue(c, now, true).label}</SubmitButton>
              </form>
            ))}
          </div>
        </div>
      )}
      <details className="dep">
        <summary className="rw">
          <span className="ico"><Icon name="cal" /></span>
          <span className="tx">{chantier ? "Choisir la date des travaux" : "Autre date"}<small>Date et heure au choix</small></span>
          <span className="chev">›</span>
        </summary>
        <form action={act.planifier} className="corps">
          <Cache d={d} />
          <div className="field">
            <label htmlFor={`quand-${d.id}`}>Date et heure</label>
            <input id={`quand-${d.id}`} name="quand" type="datetime-local" className="in" required step={300} />
          </div>
          {chantier && (
            <div className="field">
              <label htmlFor={`duree-${d.id}`}>Durée des travaux (heures)</label>
              <input id={`duree-${d.id}`} name="dureeH" type="number" min="0.5" max="12" step="0.5" defaultValue="4" className="in" />
            </div>
          )}
          <SubmitButton enCours="Planification…">Planifier et envoyer la confirmation</SubmitButton>
        </form>
      </details>
    </>
  );
}

function BlocRdv({ db, d, r, now }: { db: Db; d: Dossier; r: RendezVous; now: Date }) {
  const debut = new Date(r.debut);
  const fin = new Date(r.fin);
  const passe = fin < now;
  const titre = r.nature === "chantier" ? "Chantier" : r.nature === "visite" ? (passe ? "Visite faite" : "Visite") : passe ? "Intervention" : "Rendez-vous";
  const conf =
    r.confirmation === "confirme" ? <span className="tag green">Confirmé</span>
      : r.confirmation === "report_demande" ? <span className="tag red">Report demandé</span>
        : passe ? <span className="tag green">Passé</span> : <span className="tag red">Non confirmé</span>;
  return (
    <section className="wc" aria-label={titre}>
      <div className="h">{titre} {conf}</div>
      <div className="rr">
        <div className={`t ${r.nature === "depannage" ? "l" : "d"}`}>{heure(debut)}<small>{jourRelatif(debut, now) === "aujourd'hui" ? "auj." : jourCourt(debut).replace(/ \S+$/, "")}</small></div>
        <span className="tx">
          <b>{plageHoraire(debut, fin)} · {duree((fin.getTime() - debut.getTime()) / MINUTE)}</b>
          <small>
            {r.confirmation === "confirme" ? "Présence confirmée par le client" : r.rappelEnvoyeLe ? `Lien de confirmation envoyé le ${dateCourte(r.rappelEnvoyeLe)} à ${heure(r.rappelEnvoyeLe)}` : db.artisan.rappelVeille.actif ? `Rappel la veille à ${db.artisan.rappelVeille.heure.replace(/^0/, "")}` : "Pas de rappel automatique"} · trajet {db.artisan.trajet} min
          </small>
        </span>
      </div>
      <MiniMap points={[{ adresse: d.client.adresse, sombre: r.nature !== "depannage", actif: true }]} hauteur={130} trajet={false} />
      {r.confirmation === "report_demande" && (
        <div className="rw g">
          <span className="ico"><Icon name="refresh" /></span>
          <span className="tx">
            {d.creneauDemande ? `Le client propose ${jourCourt(d.creneauDemande)} à ${heure(d.creneauDemande)}` : "Le client souhaite être rappelé"}
            <small>{d.creneauSouhaite ?? "Validez son créneau ou proposez-en un autre"}</small>
          </span>
        </div>
      )}
      {r.confirmation === "report_demande" && d.creneauDemande && (
        <form action={act.validerCreneauDemande}>
          <Cache d={d} />
          <SubmitButton>Valider le créneau proposé</SubmitButton>
        </form>
      )}
      <div className="row">
        <a className="pill w sm" href={lienItineraire(d.client.adresse)} target="_blank" rel="noopener noreferrer">Itinéraire</a>
        {!passe && (
          <form action={act.envoyerRappel}>
            <Cache d={d} />
            <SubmitButton className="pill w sm">Renvoyer le lien</SubmitButton>
          </form>
        )}
      </div>
      {!passe && (
        <details className="dep">
          <summary className="rw g">
            <span className="ico"><Icon name="clock" /></span>
            <span className="tx">Replanifier<small>Le client reçoit un nouveau SMS de confirmation</small></span>
            <span className="chev">›</span>
          </summary>
          <div className="corps">
            <ChoixCreneau db={db} d={d} now={now} chantier={r.nature === "chantier"} />
          </div>
        </details>
      )}
    </section>
  );
}

export default async function Fiche({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const { db, now } = await lireDb();
  const d = db.dossiers.find((x) => x.id === id);
  if (!d) notFound();
  const a = db.artisan;
  const r = rdvCourant(db, d.id);
  const alertes = alertesDossier(db, d, now);
  const planifie = d.statut === "rdv_planifie" || d.statut === "visite_planifiee" || d.statut === "chantier_planifie";
  const url = await baseUrl();
  const lienDevis = `${url}/c/${d.publicToken}/devis`;
  const qr = d.statut === "devis_envoye" ? await QRCode.toString(lienDevis, { type: "svg", margin: 0, color: { dark: "#202020", light: "#FFFFFF" } }) : "";
  const demande = d.creneauDemande ? new Date(d.creneauDemande) : null;
  const demandeLibre = demande ? conflits(db.rdvs, demande, ajouterMinutes(demande, a.durees[d.type]), a.trajet).length === 0 : false;
  const demandeEnPlage = demande ? dansPlage(a, d.type, demande, ajouterMinutes(demande, a.durees[d.type])) : false;
  const desinscrit = estDesinscrit(db, d.client.telephone);

  return (
    <>
      <AppBar
        titre={d.client.nom}
        retour={d.statut === "perdu" ? "/perdus" : "/dossiers"}
        droite={<a className="sq" href={`tel:${d.client.telephone.replace(/\s/g, "")}`} aria-label={`Appeler ${d.client.nom}`}><Icon name="phone" /></a>}
      />
      <main className="screen">
        <div className="row" style={{ justifyContent: "center" }}>
          <span className={`tag ${TAG_STATUT[d.statut]}`}>{LIBELLE_STATUT[d.statut]}</span>
          <span className={`tag ${TAG_TYPE[d.type]}`}>{LIBELLE_TYPE[d.type]}</span>
          {alertes.slice(0, 1).map((al) => <span key={al.genre} className={`tag ${al.tag}`}>{al.libelle}</span>)}
          <span className="tag out">N° {d.numero}</span>
        </div>
        <Flash ok={premier(sp.ok)} erreur={premier(sp.erreur)} />

        {d.statut === "a_traiter" && (
          <section className="wc" aria-label="Créneau">
            <div className="h">{demande ? "Créneau demandé" : "À planifier"} {alertes[0] && <span className={`tag ${alertes[0].tag}`}>{alertes[0].libelle}</span>}</div>
            {demande && (
              <div className="rr">
                <div className={`t ${d.type === "depannage" ? "l" : "d"}`}>{heure(demande)}<small>{jourRelatif(demande, now) === "aujourd'hui" ? "auj." : jourCourt(demande).replace(/ \S+$/, "")}</small></div>
                <span className="tx">
                  <b>{jourCourt(demande)} · {duree(a.durees[d.type])}</b>
                  <small>{!demandeLibre ? "Ce créneau n'est plus libre" : !demandeEnPlage ? "En dehors de tes plages pour ce type de mission" : "Libre dans ton agenda"}</small>
                </span>
              </div>
            )}
            {d.creneauSouhaite && <p className="hint" style={{ fontSize: 14 }}>Souhait du client : « {d.creneauSouhaite} »</p>}
            {demande && demandeLibre && demande > now && (
              <form action={act.validerCreneauDemande}>
                <Cache d={d} />
                <SubmitButton enCours="Validation…">Valider ce créneau</SubmitButton>
              </form>
            )}
            <ChoixCreneau db={db} d={d} now={now} />
            <p className="hint">Le SMS de confirmation part seulement après ta validation.</p>
          </section>
        )}

        {planifie && r && <BlocRdv db={db} d={d} r={r} now={now} />}

        <section className="wc" aria-label="Client">
          <div className="h">Client</div>
          <dl className="kv">
            <div><Icon name="user" /><div><dt>Nom</dt><dd>{d.client.nom}</dd></div></div>
            <div><Icon name="phone" /><div><dt>Téléphone</dt><dd><a href={`tel:${d.client.telephone.replace(/\s/g, "")}`}>{telephone(d.client.telephone)}</a></dd></div></div>
            <div><Icon name="pin" /><div><dt>Adresse</dt><dd>{d.client.adresse}</dd></div></div>
          </dl>
          {desinscrit && <p className="hint">Ce client s'est désinscrit des relances et demandes d'avis.</p>}
          <details className="dep">
            <summary className="rw g"><span className="ico"><Icon name="pen" /></span><span className="tx">Modifier la fiche</span><span className="chev">›</span></summary>
            <form action={act.modifierClient} className="corps">
              <Cache d={d} />
              <div className="field"><label htmlFor="c-nom">Nom</label><input id="c-nom" name="nom" className="in" defaultValue={d.client.nom} required /></div>
              <div className="field"><label htmlFor="c-tel">Téléphone</label><input id="c-tel" name="telephone" type="tel" className="in" defaultValue={d.client.telephone} required /></div>
              <div className="field"><label htmlFor="c-adr">Adresse</label><input id="c-adr" name="adresse" className="in" defaultValue={d.client.adresse} required /></div>
              <div className="field"><label htmlFor="c-desc">Besoin</label><textarea id="c-desc" name="description" className="in" defaultValue={d.description} /></div>
              <SubmitButton>Enregistrer</SubmitButton>
            </form>
          </details>
        </section>

        <section className="wc" aria-label="Besoin">
          <div className="h">Besoin</div>
          <p style={{ fontSize: 14 }}>{d.description || "Pas de description."}</p>
          {d.pieces && <dl className="kv"><div><Icon name="gear" /><div><dt>Pièces probables</dt><dd>{d.pieces}</dd></div></div></dl>}
          {d.photos.length > 0 && (
            <div className="photos">
              {d.photos.map((p) => (
                <a key={p} href={`/api/fichiers/${p}`} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/fichiers/${p}`} alt="Photo envoyée par le client" />
                </a>
              ))}
            </div>
          )}
          <p className="hint">{d.source === "page_client" ? "Demande reçue via la page client" : "Créé via Speed Dial"} · {dateCourte(d.creeLe)} à {heure(d.creeLe)}</p>
        </section>

        {d.statut === "visite_planifiee" && (
          <section className="wc" aria-label="Devis">
            <div className="h">Devis</div>
            <p className="hint" style={{ fontSize: 14 }}>Crée le devis dans ton outil habituel, puis glisse le PDF ici. Le client reçoit un lien pour le signer sur son téléphone.</p>
            <form action={act.importerDevis} className="grid">
              <Cache d={d} />
              <input name="pdf" type="file" accept="application/pdf,.pdf" required className="in" aria-label="PDF du devis" />
              <SubmitButton enCours="Envoi…">Envoyer le devis au client</SubmitButton>
            </form>
          </section>
        )}

        {d.devis && (
          <section className="wc" aria-label="Devis">
            <div className="h">Devis {d.devis.signeLe ? <span className="tag green">Signé</span> : d.statut === "devis_envoye" ? <span className="tag violet">Non signé</span> : null}</div>
            <a className="rw g" href={`/api/fichiers/${d.devis.fichier}`} target="_blank" rel="noopener noreferrer">
              <span className="ico"><Icon name="doc" /></span>
              <span className="tx">{d.devis.nomFichier}<small>Envoyé le {dateCourte(d.devis.envoyeLe)} à {heure(d.devis.envoyeLe)} par SMS</small></span>
              <span className="chev">›</span>
            </a>
            {d.statut === "devis_envoye" && (
              <>
                <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label="QR code du lien de signature" />
                <p className="hint" style={{ textAlign: "center" }}>Sur place : le client scanne et signe sur son propre téléphone.<br /><Link href={`/c/${d.publicToken}/devis`} style={{ textDecoration: "underline" }}>Ouvrir la page de signature</Link></p>
                <div className="row">
                  {d.devis.relances < MAX_RELANCES && !desinscrit && (
                    <form action={act.relancerDevis}>
                      <Cache d={d} />
                      <SubmitButton className="pill w sm">Relancer maintenant</SubmitButton>
                    </form>
                  )}
                  <form action={act.marquerSigne}>
                    <Cache d={d} />
                    <SubmitButton className="pill w sm">Marquer signé</SubmitButton>
                  </form>
                </div>
                <p className="hint">
                  {d.devis.prochaineRelance
                    ? `Relance automatique prévue le ${dateCourte(d.devis.prochaineRelance)} (${d.devis.relances + 1} sur ${Math.min(a.relanceDevis.max, MAX_RELANCES)})`
                    : `${d.devis.relances} relance${d.devis.relances > 1 ? "s" : ""} envoyée${d.devis.relances > 1 ? "s" : ""}, plus de relance automatique prévue`}
                </p>
                <details className="dep">
                  <summary className="rw g"><span className="ico"><Icon name="refresh" /></span><span className="tx">Remplacer le PDF<small>Un nouveau lien et un nouveau code sont envoyés</small></span><span className="chev">›</span></summary>
                  <form action={act.importerDevis} className="corps">
                    <Cache d={d} />
                    <input name="pdf" type="file" accept="application/pdf,.pdf" required className="in" aria-label="Nouveau PDF du devis" />
                    <SubmitButton>Envoyer le nouveau devis</SubmitButton>
                  </form>
                </details>
              </>
            )}
            {d.devis.preuve && (
              <dl className="kv">
                <div><Icon name="lock" /><div><dt>Dossier de preuve</dt><dd>{d.devis.preuve.methode} · {dateCourte(d.devis.preuve.horodatage)} à {heure(d.devis.preuve.horodatage)}</dd></div></div>
                <div><Icon name="doc" /><div><dt>Empreinte SHA-256 du PDF</dt><dd style={{ fontSize: 12, fontWeight: 400 }}>{d.devis.preuve.empreinte}</dd></div></div>
              </dl>
            )}
          </section>
        )}

        {d.bon && (
          <section className="wc" aria-label="Bon d'intervention">
            <div className="h">Bon d'intervention <span className="tag green">Signé</span></div>
            <p style={{ fontSize: 14 }}>{d.bon.travaux}</p>
            <p className="hint">N° {d.bon.numero} · signé le {dateCourte(d.bon.signeLe)} à {heure(d.bon.signeLe)}</p>
            <Link className="pill w sm" href={`/c/${d.publicToken}/bon`}>Voir la copie envoyée au client</Link>
          </section>
        )}

        {d.statut === "rdv_planifie" && <Link className="pill" href={`/dossiers/${d.id}/bon`}>Rédiger le bon d'intervention</Link>}
        {d.statut === "devis_envoye" && <button className="pill off" disabled>Planifier le chantier (après signature)</button>}
        {d.statut === "signe" && (
          <section className="wc" aria-label="Planifier le chantier">
            <div className="h">Planifier le chantier</div>
            <ChoixCreneau db={db} d={d} now={now} chantier />
          </section>
        )}
        {(d.statut === "intervention_faite" || d.statut === "chantier_planifie") && (
          <form action={act.terminer} className="grid">
            <Cache d={d} />
            <SubmitButton enCours="Clôture…">{d.statut === "chantier_planifie" ? "Marquer les travaux terminés" : "Marquer terminé"}</SubmitButton>
            <p className="hint" style={{ textAlign: "center" }}>
              {a.demandeAvis && !desinscrit ? "La demande d'avis Google part à ce moment, une seule fois." : "Aucune demande d'avis ne sera envoyée."}
            </p>
          </form>
        )}
        {d.statut === "termine" && (
          <section className="wc" aria-label="Avis">
            <div className="h">Avis Google {d.avisDemandeLe ? <span className="tag green">Demandé</span> : <span className="tag grey">Non demandé</span>}</div>
            <p className="hint" style={{ fontSize: 14 }}>
              {d.avisDemandeLe ? `Demande envoyée le ${dateCourte(d.avisDemandeLe)}, sans relance.` : desinscrit ? "Le client s'est désinscrit." : "La demande d'avis est désactivée dans le profil."}
            </p>
          </section>
        )}
        {d.statut === "perdu" && (
          <section className="wc" aria-label="Dossier perdu">
            <div className="h">Perdu <span className="tag grey">{d.motifPerdu ? MOTIFS_PERDU[d.motifPerdu] : ""}</span></div>
            <p className="hint">Depuis le {d.perduLe ? dateCourte(d.perduLe) : "?"}. Aucune demande d'avis n'est envoyée.</p>
            <form action={act.restaurer}>
              <Cache d={d} />
              <SubmitButton className="pill w">Restaurer le dossier</SubmitButton>
            </form>
          </section>
        )}
        {estActif(d.statut) && (
          <details className="dep">
            <summary className="pill red">Passer en Perdu</summary>
            <form action={act.passerPerdu} className="corps">
              <Cache d={d} />
              <div className="field">
                <label htmlFor="motif">Motif</label>
                <select id="motif" name="motif" className="in" defaultValue={d.statut === "devis_envoye" ? "devis_non_signe" : "injoignable"}>
                  {Object.entries(MOTIFS_PERDU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <p className="hint">Les rendez-vous à venir sont annulés. Aucun SMS n'est envoyé au client.</p>
              <SubmitButton className="pill red">Confirmer : passer en Perdu</SubmitButton>
            </form>
          </details>
        )}

        <section className="wc" aria-label="Historique">
          <div className="h">Historique</div>
          <div className="tl">
            {d.evenements.map((e, i) => (
              <div key={i}><span>{dateCourte(e.date)}</span><span>{e.texte}</span></div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
