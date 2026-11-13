import { notFound } from "next/navigation";
import { DemandeForm } from "@/components/DemandeForm";
import { Merci, PageClient } from "@/components/PageClient";
import { creneauxLibres } from "@/lib/domain/agenda";
import { duree } from "@/lib/domain/format";
import { lireDb } from "@/lib/serveur";
import { premier, slotVue } from "@/lib/vue";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { db } = await lireDb();
  return { title: `Demande · ${db.artisan.slug === (await params).slug ? db.artisan.entreprise : "ArtizaPro"}` };
}

export default async function Demande({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { db, now } = await lireDb();
  const a = db.artisan;
  if (slug !== a.slug) notFound();
  if (premier(sp.envoye)) {
    return (
      <PageClient titre={a.entreprise} entreprise={a.entreprise} tel={a.telephone}>
        <Merci titre="Demande envoyée">
          <p className="hint" style={{ fontSize: 14 }}>{a.entreprise} a bien reçu votre demande. Vous recevrez un SMS dès que le créneau sera confirmé.</p>
        </Merci>
      </PageClient>
    );
  }
  const slots = {
    depannage: creneauxLibres(a, db.rdvs, "depannage", now, 7, now, 5).map((c) => slotVue(c, now, true)),
    visite: creneauxLibres(a, db.rdvs, "visite", now, 7, now, 5).map((c) => slotVue(c, now, true)),
  };
  return (
    <PageClient titre={a.entreprise} entreprise={a.entreprise} tel={a.telephone}>
      <div>
        <h2 className="titre-client">Décrivez votre besoin</h2>
        <p className="hint" style={{ fontSize: 14 }}>Nous vous confirmons un créneau par SMS. Aucun compte à créer.</p>
      </div>
      <DemandeForm slug={a.slug} slots={slots} durees={{ depannage: duree(a.durees.depannage), visite: duree(a.durees.visite) }} />
    </PageClient>
  );
}
