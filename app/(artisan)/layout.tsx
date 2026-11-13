import { TabBar } from "@/components/TabBar";
import { initiales } from "@/lib/domain/format";
import { lireDb } from "@/lib/serveur";

export default async function LayoutArtisan({ children }: { children: React.ReactNode }) {
  const { db } = await lireDb();
  const a = db.artisan;
  return (
    <div className="app">
      {children}
      <TabBar initiales={initiales(`${a.prenom} ${a.nom}`)} nonLus={db.retours.filter((r) => !r.traite).length} />
    </div>
  );
}
