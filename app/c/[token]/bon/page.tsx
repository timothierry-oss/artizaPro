import { BoutonImprimer } from "@/components/Divers";
import { rdvCourant } from "@/lib/domain/operations";
import { dateLongue, heure, plageHoraire, telephone } from "@/lib/domain/format";
import { pageClient } from "@/lib/client";

export const metadata = { title: "Bon d'intervention" };

export default async function Bon({ params }: { params: Promise<{ token: string }> }) {
  const { db, d, a } = await pageClient(params);
  const b = d.bon;
  if (!b) return <main className="a4"><p>Aucun bon d'intervention pour ce dossier.</p></main>;
  const r = db.rdvs.filter((x) => x.dossierId === d.id).sort((x, y) => y.debut.localeCompare(x.debut))[0] ?? rdvCourant(db, d.id);
  return (
    <>
      <div className="imprimer"><BoutonImprimer /></div>
      <main className="a4">
        <div className="hd">
          <div><h1>Bon d'intervention</h1><small>N° {b.numero} · {dateLongue(b.signeLe)}</small></div>
          <div style={{ textAlign: "right" }}><b>{a.entreprise}</b><small>{a.adresse}</small><small>{telephone(a.telephone)}{a.siret ? ` · SIRET ${a.siret}` : ""}</small></div>
        </div>
        <dl>
          <dt>Client</dt><dd>{d.client.nom}</dd>
          <dt>Adresse</dt><dd>{d.client.adresse}</dd>
          <dt>Téléphone</dt><dd>{telephone(d.client.telephone)}</dd>
          {r && (<><dt>Intervention</dt><dd>{dateLongue(r.debut)}, {plageHoraire(r.debut, r.fin)}</dd></>)}
        </dl>
        <div><b>Problème signalé</b><div className="box">{d.description || "Non précisé"}</div></div>
        <div><b>Travaux réalisés</b><div className="box">{b.travaux}</div></div>
        <div className="sigs">
          <div>
            <b>Signature du client</b>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="box"><img src={b.signature} alt={`Signature de ${d.client.nom}`} /></div>
            <small style={{ color: "#666C77" }}>Signé le {dateLongue(b.signeLe)} à {heure(b.signeLe)}</small>
          </div>
          <div><b>Artisan</b><div className="box">{a.entreprise}</div></div>
        </div>
        <div className="foot">Ce document atteste la réalisation des travaux décrits. Il ne contient ni prix ni TVA et ne vaut pas facture. Copie envoyée par SMS au client. Généré avec ArtizaPro.</div>
      </main>
    </>
  );
}
