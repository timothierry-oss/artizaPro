import { notFound } from "next/navigation";
import { lireDb } from "./serveur.ts";

/** Données d'une page client à partir du jeton du lien SMS. */
export async function pageClient(params: Promise<{ token: string }>) {
  const { token } = await params;
  const { db, now } = await lireDb();
  const d = db.dossiers.find((x) => x.publicToken === token);
  if (!d) notFound();
  return { db, now, d, a: db.artisan, token };
}
