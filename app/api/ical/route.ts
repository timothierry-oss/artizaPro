import { NextResponse, type NextRequest } from "next/server";
import { getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const echapper = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
/** Lignes de 75 octets au plus (RFC 5545). */
const plier = (l: string) => l.match(/.{1,70}/gu)?.join("\r\n ") ?? l;

/** Flux iCalendar en lecture seule, pour afficher l'agenda dans Google, Apple ou Outlook. */
export async function GET(req: NextRequest) {
  const db = await getRepo().lire();
  if (req.nextUrl.searchParams.get("key") !== db.artisan.icalKey) return new NextResponse("Lien d'abonnement invalide.", { status: 403 });
  const maintenant = utc(new Date().toISOString());
  const lignes = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ArtizaPro//MVP//FR", "CALSCALE:GREGORIAN", `X-WR-CALNAME:${echapper(db.artisan.entreprise)}`];
  for (const r of db.rdvs) {
    if (r.confirmation === "annule") continue;
    const d = db.dossiers.find((x) => x.id === r.dossierId);
    const titre = r.nature === "indispo" ? r.note ?? "Indisponible" : `${r.nature === "chantier" ? "Chantier" : r.nature === "visite" ? "Visite" : "Dépannage"} · ${d?.client.nom ?? ""}`;
    lignes.push(
      "BEGIN:VEVENT",
      `UID:${r.id}@artizapro`,
      `DTSTAMP:${maintenant}`,
      `DTSTART:${utc(r.debut)}`,
      `DTEND:${utc(r.fin)}`,
      plier(`SUMMARY:${echapper(titre)}`),
      ...(d ? [plier(`LOCATION:${echapper(d.client.adresse)}`), plier(`DESCRIPTION:${echapper(`${d.description}\nTél. ${d.client.telephone}`)}`)] : []),
      "END:VEVENT",
    );
  }
  lignes.push("END:VCALENDAR");
  return new NextResponse(lignes.join("\r\n") + "\r\n", {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="artizapro.ics"', "Cache-Control": "no-store" },
  });
}
