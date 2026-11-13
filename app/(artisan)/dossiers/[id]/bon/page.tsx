import { notFound, redirect } from "next/navigation";
import { AppBar } from "@/components/AppBar";
import { BonForm } from "@/components/BonForm";
import { Icon } from "@/components/Icon";
import { rdvCourant } from "@/lib/domain/operations";
import { dateLongue, plageHoraire } from "@/lib/domain/format";
import { lireDb } from "@/lib/serveur";

export const metadata = { title: "Bon d'intervention" };

export default async function PageBon({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { db } = await lireDb();
  const d = db.dossiers.find((x) => x.id === id);
  if (!d) notFound();
  if (d.statut !== "rdv_planifie") redirect(`/dossiers/${d.id}`);
  const r = rdvCourant(db, d.id);
  return (
    <>
      <AppBar titre="Bon d'intervention" retour={`/dossiers/${d.id}`} />
      <main className="screen focus">
        <section className="wc">
          <dl className="kv">
            <div><Icon name="user" /><div><dt>Client</dt><dd>{d.client.nom} · {d.client.adresse}</dd></div></div>
            {r && <div><Icon name="clock" /><div><dt>Intervention</dt><dd>{dateLongue(r.debut)}, {plageHoraire(r.debut, r.fin)}</dd></div></div>}
            <div><Icon name="doc" /><div><dt>Problème signalé</dt><dd>{d.description || "Non précisé"}</dd></div></div>
          </dl>
        </section>
        <BonForm id={d.id} />
      </main>
    </>
  );
}
