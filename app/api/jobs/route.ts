import { NextResponse, type NextRequest } from "next/server";
import { lancerAutomatisations } from "@/lib/domain/operations";
import { getRepo } from "@/lib/repo";
import { ctxServeur } from "@/lib/serveur";

export const dynamic = "force-dynamic";

/** Automatisations (rappels de la veille, relances de devis). Prévu pour un cron ; protégé par CRON_SECRET si défini. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ erreur: "Non autorisé" }, { status: 401 });
  const ctx = await ctxServeur();
  const bilan = await getRepo().modifier((db) => lancerAutomatisations(db, ctx, req.nextUrl.searchParams.get("mode") === "manuel"));
  return NextResponse.json(bilan);
}
