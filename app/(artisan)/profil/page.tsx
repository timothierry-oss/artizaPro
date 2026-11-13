import Link from "next/link";
import QRCode from "qrcode";
import { AppBar } from "@/components/AppBar";
import { AdresseComplete, BoutonCopier } from "@/components/Divers";
import { Flash } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { SubmitButton } from "@/components/SubmitButton";
import * as act from "@/lib/actions";
import { MAX_RELANCES } from "@/lib/domain/operations";
import { dateCourte, duree, heure, hmCourt, initiales, joursPlage, nomJourCourt, telephone } from "@/lib/domain/format";
import type { Plage, TypeMission } from "@/lib/domain/types";
import { baseUrl, lireDb } from "@/lib/serveur";
import { premier } from "@/lib/vue";

export const metadata = { title: "Profil" };

function Ligne({ icone, titre, sous, children }: { icone: string; titre: string; sous: string; children: React.ReactNode }) {
  return (
    <details className="dep">
      <summary className="rw">
        <span className="ico"><Icon name={icone} /></span>
        <span className="tx">{titre}<small>{sous}</small></span>
        <span className="chev">›</span>
      </summary>
      <div className="corps">{children}</div>
    </details>
  );
}

function resumePlages(p: Plage[]) {
  return p.length ? p.map((x) => `${joursPlage(x.jours)} ${hmCourt(x.debut)}–${hmCourt(x.fin)}`).join(", ") : "Aucune plage";
}

function EditeurPlages({ type, plages }: { type: TypeMission; plages: Plage[] }) {
  const lignes = [...plages, ...Array(3).fill(null)].slice(0, 3) as (Plage | null)[];
  return (
    <>
      {lignes.map((p, i) => (
        <fieldset key={i} style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8 }}>
          <legend className="hint" style={{ padding: 0, marginBottom: 6 }}>{p ? `Plage ${i + 1}` : `Plage ${i + 1} (facultative)`}</legend>
          <div className="jours">
            {[1, 2, 3, 4, 5, 6, 0].map((j) => (
              <label key={j} title={nomJourCourt(j)}>
                <input className="sr" type="checkbox" name={`${type}_${i}_jours`} value={j} defaultChecked={p?.jours.includes(j)} />
                {nomJourCourt(j).slice(0, 2).replace(".", "")}
              </label>
            ))}
          </div>
          <div className="duo">
            <input aria-label="Début" name={`${type}_${i}_debut`} type="time" className="in" defaultValue={p?.debut} />
            <input aria-label="Fin" name={`${type}_${i}_fin`} type="time" className="in" defaultValue={p?.fin} />
          </div>
        </fieldset>
      ))}
    </>
  );
}

export default async function Profil({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const { db } = await lireDb();
  const a = db.artisan;
  const url = await baseUrl();
  const cheminDemande = `/demande/${a.slug}`;
  const qr = await QRCode.toString(url + cheminDemande, { type: "svg", margin: 0, color: { dark: "#202020", light: "#FFFFFF" } });
  const ical = `${url}/api/ical?key=${a.icalKey}`;

  return (
    <>
      <AppBar titre="Profil" />
      <main className="screen">
        <div className="avatar" aria-hidden="true">{initiales(`${a.prenom} ${a.nom}`)}</div>
        <Flash ok={premier(sp.ok)} erreur={premier(sp.erreur)} />

        <section className="wc" aria-label="Entreprise">
          <div className="h">Entreprise</div>
          <dl className="kv">
            <div><Icon name="user" /><div><dt>Nom affiché</dt><dd>{a.entreprise}</dd></div></div>
            <div><Icon name="phone" /><div><dt>Téléphone dans les SMS</dt><dd>{telephone(a.telephone)}</dd></div></div>
            <div><Icon name="msg" /><div><dt>Nom d'expéditeur SMS</dt><dd>{a.expediteur}</dd></div></div>
            <div><Icon name="star" /><div><dt>Fiche Google</dt><dd>{a.lienGoogle.replace(/^https?:\/\//, "") || "Non renseignée"}</dd></div></div>
          </dl>
          <details className="dep">
            <summary className="rw g"><span className="ico"><Icon name="pen" /></span><span className="tx">Modifier</span><span className="chev">›</span></summary>
            <form action={act.enregistrerEntreprise} className="corps">
              <div className="duo">
                <div className="field"><label htmlFor="e-prenom">Prénom</label><input id="e-prenom" name="prenom" className="in" defaultValue={a.prenom} /></div>
                <div className="field"><label htmlFor="e-nom">Nom</label><input id="e-nom" name="nomArtisan" className="in" defaultValue={a.nom} /></div>
              </div>
              <div className="field"><label htmlFor="e-ent">Nom de l'entreprise</label><input id="e-ent" name="entreprise" className="in" defaultValue={a.entreprise} required /></div>
              <div className="field"><label htmlFor="e-tel">Téléphone affiché dans les SMS</label><input id="e-tel" name="telephone" type="tel" className="in" defaultValue={a.telephone} required /></div>
              <div className="field"><label htmlFor="e-exp">Nom d'expéditeur SMS</label><input id="e-exp" name="expediteur" className="in" defaultValue={a.expediteur} maxLength={11} required /><span className="hint">3 à 11 caractères, sans accent. Les règles françaises sont à vérifier avant l'ouverture.</span></div>
              <div className="field"><label htmlFor="e-g">Lien de la fiche Google Business Profile</label><input id="e-g" name="lienGoogle" type="url" className="in" defaultValue={a.lienGoogle} placeholder="https://g.page/…" /></div>
              <div className="field"><label htmlFor="e-adr">Adresse (bon d'intervention)</label><input id="e-adr" name="adresse" className="in" defaultValue={a.adresse} /></div>
              <div className="field"><label htmlFor="e-siret">SIRET</label><input id="e-siret" name="siret" className="in" defaultValue={a.siret} /></div>
              <SubmitButton>Enregistrer</SubmitButton>
            </form>
          </details>
        </section>

        <div className="sect">Durées et plages</div>
        <div className="rows">
          <Ligne icone="bolt" titre="Durées et trajet" sous={`Dépannage ${duree(a.durees.depannage)} · visite ${duree(a.durees.visite)} · trajet ${a.trajet} min`}>
            <form action={act.enregistrerDurees} className="grid">
              <div className="field"><label htmlFor="d-dep">Dépannage (minutes)</label><input id="d-dep" name="depannage" type="number" min="15" max="480" step="5" className="in" defaultValue={a.durees.depannage} /></div>
              <div className="field"><label htmlFor="d-vis">Visite technique (minutes)</label><input id="d-vis" name="visite" type="number" min="15" max="240" step="5" className="in" defaultValue={a.durees.visite} /></div>
              <div className="field"><label htmlFor="d-tr">Trajet entre deux rendez-vous (minutes)</label><input id="d-tr" name="trajet" type="number" min="0" max="120" step="5" className="in" defaultValue={a.trajet} /></div>
              <SubmitButton>Enregistrer</SubmitButton>
            </form>
          </Ligne>
          <Ligne icone="cal" titre="Plages par type de mission" sous={`Dépannages : ${resumePlages(a.plages.depannage)} · Visites : ${resumePlages(a.plages.visite)}`}>
            <form action={act.enregistrerPlages} className="grid">
              <div className="sect" style={{ fontSize: 15 }}><span className="tag lime">Dépannages</span></div>
              <EditeurPlages type="depannage" plages={a.plages.depannage} />
              <div className="sect" style={{ fontSize: 15 }}><span className="tag ink">Visites</span></div>
              <EditeurPlages type="visite" plages={a.plages.visite} />
              <p className="hint">Les clients ne voient que les créneaux libres dans ces plages. Laissez une plage vide pour la supprimer.</p>
              <SubmitButton>Enregistrer les plages</SubmitButton>
            </form>
          </Ligne>
        </div>

        <div className="sect">Messages automatiques</div>
        <form action={act.enregistrerMessagesAuto} className="grid">
          <div className="rows">
            <label className="rw" style={{ outline: "none" }}>
              <span className="ico"><Icon name="bell" /></span>
              <span className="tx">Rappel la veille<small>Lien pour confirmer, annuler ou reporter</small></span>
              <input className="sr" type="checkbox" name="rappelActif" defaultChecked={a.rappelVeille.actif} />
              <span className="tog" />
            </label>
            <div className="rw">
              <span className="ico"><Icon name="clock" /></span>
              <label className="tx" htmlFor="m-heure">Heure d'envoi du rappel</label>
              <input id="m-heure" name="rappelHeure" type="time" className="in" style={{ width: 120, minHeight: 40 }} defaultValue={a.rappelVeille.heure} />
            </div>
            <div className="rw">
              <span className="ico"><Icon name="doc" /></span>
              <label className="tx" htmlFor="m-delai">Relance de devis après (jours)<small>Avec lien de désinscription</small></label>
              <input id="m-delai" name="delai" type="number" min="1" max="15" className="in" style={{ width: 80, minHeight: 40 }} defaultValue={a.relanceDevis.delaiJours} />
            </div>
            <div className="rw">
              <span className="ico"><Icon name="refresh" /></span>
              <label className="tx" htmlFor="m-max">Nombre de relances<small>{MAX_RELANCES} au plus</small></label>
              <select id="m-max" name="max" className="in" style={{ width: 80, minHeight: 40 }} defaultValue={a.relanceDevis.max}>
                {Array.from({ length: MAX_RELANCES + 1 }, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <label className="rw" style={{ outline: "none" }}>
              <span className="ico"><Icon name="star" /></span>
              <span className="tx">Demande d'avis Google<small>Une fois, à chaque dossier terminé, à tous les clients</small></span>
              <input className="sr" type="checkbox" name="avis" defaultChecked={a.demandeAvis} />
              <span className="tog" />
            </label>
          </div>
          <SubmitButton className="pill w">Enregistrer les messages automatiques</SubmitButton>
        </form>

        <div className="sect">Partage et données</div>
        <div className="rows">
          <Ligne icone="link" titre="Lien de demande public" sous={`…${cheminDemande}`}>
            <div className="qr" dangerouslySetInnerHTML={{ __html: qr }} role="img" aria-label="QR code du lien de demande" />
            <p className="hint" style={{ textAlign: "center" }}><AdresseComplete chemin={cheminDemande} /></p>
            <div className="row">
              <BoutonCopier texte={cheminDemande} label="Copier le lien" />
              <Link className="pill w sm" href={cheminDemande}>Ouvrir la page</Link>
            </div>
            <p className="hint">À mettre sur ta fiche Google, ton site, ta signature d'e-mail ou ton camion.</p>
          </Ligne>
          <div id="ical">
            <Ligne icone="cal" titre="Abonnement iCal" sous="Lecture seule, lien privé">
              <p className="hint" style={{ overflowWrap: "anywhere" }}>{ical}</p>
              <div className="row"><BoutonCopier texte={ical} label="Copier le lien" /></div>
              <p className="hint">Dans Google Agenda : Autres agendas, À partir de l'URL. Dans Apple Calendrier : Fichier, Nouvel abonnement. L'agenda se met à jour tout seul, mais ne bloque pas les créneaux.</p>
            </Ligne>
          </div>
          <div className="rw">
            <span className="ico"><Icon name="gear" /></span>
            <span className="tx">Automatisations<small>{a.dernierPassage ? `Dernier passage ${dateCourte(a.dernierPassage)} à ${heure(a.dernierPassage)} · ${a.dernierBilan}` : "Rappels de la veille et relances de devis"}</small></span>
            <form action={act.lancerAutomatisations}><SubmitButton className="pill sm">Lancer</SubmitButton></form>
          </div>
          <a className="rw" href="/api/export" download>
            <span className="ico"><Icon name="dl" /></span>
            <span className="tx">Exporter les dossiers (JSON)<small>Pour une demande d'export ou une sauvegarde</small></span>
            <span className="chev">›</span>
          </a>
          <Ligne icone="refresh" titre="Réinitialiser la démo" sous="Remplace toutes les données par l'exemple de départ">
            <p className="hint">Les dossiers, messages et réglages actuels seront effacés.</p>
            <form action={act.reinitialiserDemo}><SubmitButton className="pill red">Effacer et recharger la démo</SubmitButton></form>
          </Ligne>
        </div>
        <p className="hint" style={{ textAlign: "center" }}>ArtizaPro · MVP · SMS, signature et IA simulés</p>
      </main>
    </>
  );
}
