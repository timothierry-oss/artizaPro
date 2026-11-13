import { NextResponse } from "next/server";
import { getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

/** Export complet des données (droit d'accès, sauvegarde). */
export async function GET() {
  const db = await getRepo().lire();
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(db, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="artizapro-export-${date}.json"` },
  });
}
