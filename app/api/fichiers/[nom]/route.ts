import { NextResponse } from "next/server";
import { getRepo } from "@/lib/repo";

const TYPES: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" };

/** Devis PDF et photos. Les noms sont aléatoires et non devinables. */
export async function GET(_: Request, { params }: { params: Promise<{ nom: string }> }) {
  const { nom } = await params;
  const contenu = await getRepo().lireFichier(nom);
  if (!contenu) return new NextResponse("Fichier introuvable.", { status: 404 });
  const ext = nom.split(".").pop()!.toLowerCase();
  return new NextResponse(Buffer.from(contenu), {
    headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Content-Disposition": "inline", "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
