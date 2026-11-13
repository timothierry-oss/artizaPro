// Gabarits des SMS (cahier de cadrage, sections 4 à 8). Chaque SMS contient le téléphone de l'artisan ;
// les relances et demandes d'avis contiennent un lien de désinscription.
import type { Artisan, Dossier, RendezVous } from "./types.ts";
import { heureSms, jourLong, nomJour, dateLongue, telephone } from "./format.ts";

export interface CtxMessage {
  artisan: Artisan;
  baseUrl: string;
}

export function lienClient(c: CtxMessage, d: Dossier, page: "rdv" | "devis" | "bon" | "retour" | "stop"): string {
  return `${c.baseUrl}/c/${d.publicToken}/${page}`;
}

const joindre = (c: CtxMessage) => `Pour nous joindre : ${telephone(c.artisan.telephone)}.`;

export function confirmationRdv(c: CtxMessage, d: Dossier, r: RendezVous): string {
  const quoi = r.nature === "chantier" ? "Début des travaux confirmé" : "Rendez-vous confirmé";
  return `Bonjour, ici ${c.artisan.entreprise}. ${quoi} ${jourLong(r.debut)} à ${heureSms(r.debut)}, ${d.client.adresse}. Gérer ce rendez-vous : ${lienClient(c, d, "rdv")}. ${joindre(c)}`;
}

export function rappelVeille(c: CtxMessage, d: Dossier, r: RendezVous): string {
  return `Rappel : rendez-vous demain ${nomJour(r.debut)} à ${heureSms(r.debut)} avec ${c.artisan.entreprise}. Confirmez d'un clic, ou annulez et demandez un autre créneau : ${lienClient(c, d, "rdv")}. ${joindre(c)}`;
}

export function lienDevis(c: CtxMessage, d: Dossier): string {
  return `Bonjour, ici ${c.artisan.entreprise}. Votre devis est prêt, lisez-le et signez-le ici : ${lienClient(c, d, "devis")}. Code de signature : ${formatCode(d.devis?.code ?? "")}. ${joindre(c)}`;
}

export function relanceDevis(c: CtxMessage, d: Dossier): string {
  return `Bonjour, ici ${c.artisan.entreprise}. Votre devis vous attend toujours : ${lienClient(c, d, "devis")}. Code de signature : ${formatCode(d.devis?.code ?? "")}. Une question ? ${telephone(c.artisan.telephone)}. Ne plus recevoir de relance : ${lienClient(c, d, "stop")}`;
}

export function copieBon(c: CtxMessage, d: Dossier): string {
  return `Bonjour, ici ${c.artisan.entreprise}. Merci, voici la copie de votre bon d'intervention du ${dateLongue(d.bon?.signeLe ?? new Date())} : ${lienClient(c, d, "bon")}. ${joindre(c)}`;
}

export function demandeAvis(c: CtxMessage, d: Dossier): string {
  return `Merci pour votre confiance. Si vous avez un instant, votre avis aide beaucoup ${c.artisan.entreprise} : ${c.artisan.lienGoogle}. Un souci avec l'intervention ? Écrivez-nous ici : ${lienClient(c, d, "retour")}. ${joindre(c)} Stop : ${lienClient(c, d, "stop")}`;
}

export function formatCode(code: string): string {
  return code.replace(/^(\d{3})(\d{3})$/, "$1 $2");
}
