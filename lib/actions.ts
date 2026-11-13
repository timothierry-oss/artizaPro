"use server";
// Actions serveur appelées par les formulaires. Chacune exécute une opération métier dans une transaction du dépôt.
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as op from "./domain/operations.ts";
import type { Db, MotifPerdu, Plage, TypeMission } from "./domain/types.ts";
import { aHeure, depuisCleJour, depuisDateHeureLocale, hm } from "./domain/temps.ts";
import { getRepo } from "./repo/index.ts";
import { ctxServeur } from "./serveur.ts";

export type EtatFormulaire = { erreur?: string } | undefined;

const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const estErreurMetier = (e: unknown): e is Error => e instanceof Error && e.name === "ErreurMetier";

function avecParam(chemin: string, cle: "ok" | "erreur", valeur: string): string {
  const [base, query = ""] = chemin.split("?");
  const p = new URLSearchParams(query);
  p.delete("ok");
  p.delete("erreur");
  p.set(cle, valeur);
  return `${base}?${p}`;
}

function cheminSur(c: string, defaut: string): string {
  return c.startsWith("/") && !c.startsWith("//") ? c : defaut;
}

/** Exécute `fn` puis redirige : vers le chemin renvoyé par `fn`, ou vers `retour` avec le message d'erreur. */
async function agir(retour: string, fn: (db: Db, ctx: op.Ctx) => string | void, ok?: string): Promise<never> {
  let cible: string;
  try {
    const ctx = await ctxServeur();
    const r = await getRepo().modifier((db) => fn(db, ctx));
    cible = typeof r === "string" ? r : retour;
    if (ok) cible = avecParam(cible, "ok", ok);
  } catch (e) {
    if (!estErreurMetier(e)) throw e;
    cible = avecParam(retour, "erreur", e.message);
  }
  revalidatePath("/", "layout");
  redirect(cible);
}

/** Variante pour les formulaires longs : l'erreur revient au formulaire sans perdre la saisie. */
async function agirFormulaire(fn: (db: Db, ctx: op.Ctx) => string, ok?: string): Promise<EtatFormulaire> {
  let cible: string;
  try {
    const ctx = await ctxServeur();
    cible = await getRepo().modifier((db) => fn(db, ctx));
    if (ok) cible = avecParam(cible, "ok", ok);
  } catch (e) {
    if (!estErreurMetier(e)) throw e;
    return { erreur: e.message };
  }
  revalidatePath("/", "layout");
  redirect(cible);
}

function lireDebut(fd: FormData): Date | null {
  const iso = s(fd, "debut");
  if (iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return depuisDateHeureLocale(s(fd, "quand"));
}

function lireType(fd: FormData): TypeMission {
  const t = s(fd, "type");
  if (t !== "depannage" && t !== "visite") throw new op.ErreurMetier("Choisissez le type de mission.");
  return t;
}

const TYPES_IMAGE: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic" };

async function stockerFichiers(fichiers: File[], types: Record<string, string>, maxMo: number): Promise<{ nom: string; original: string; contenu: Uint8Array }[]> {
  const out = [];
  for (const f of fichiers) {
    if (!f || typeof f === "string" || f.size === 0) continue;
    const ext = types[f.type] ?? (f.name.toLowerCase().endsWith(".pdf") && types["application/pdf"] ? "pdf" : undefined);
    if (!ext) throw new op.ErreurMetier(`Format non accepté pour « ${f.name} ».`);
    if (f.size > maxMo * 1024 * 1024) throw new op.ErreurMetier(`« ${f.name} » dépasse ${maxMo} Mo.`);
    const contenu = new Uint8Array(await f.arrayBuffer());
    out.push({ nom: await getRepo().stockerFichier(contenu, ext), original: f.name, contenu });
  }
  return out;
}

// ---------- Création de dossiers ----------

export async function creerSpeedDial(_: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const debut = lireDebut(fd);
  return agirFormulaire(
    (db, ctx) => {
      const d = op.creerDossier(db, ctx, {
        type: lireType(fd),
        client: { nom: s(fd, "nom"), telephone: s(fd, "telephone"), adresse: s(fd, "adresse") },
        description: s(fd, "description"),
        source: "speed_dial",
      });
      if (debut) op.planifier(db, ctx, d.id, debut);
      return `/dossiers/${d.id}`;
    },
    debut ? "Dossier créé et SMS de confirmation généré" : "Dossier créé",
  );
}

export async function creerDemande(_: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const slug = s(fd, "slug");
  let photos: string[] = [];
  try {
    const fichiers = fd.getAll("photos").filter((f): f is File => typeof f !== "string" && f.size > 0);
    if (fichiers.length > 2) return { erreur: "Ajoutez deux photos au maximum." };
    photos = (await stockerFichiers(fichiers, TYPES_IMAGE, 8)).map((f) => f.nom);
  } catch (e) {
    if (estErreurMetier(e)) return { erreur: e.message };
    throw e;
  }
  const creneau = s(fd, "creneau");
  return agirFormulaire((db, ctx) => {
    if (slug !== db.artisan.slug) throw new op.ErreurMetier("Cette page de demande n'existe plus.");
    if (!s(fd, "description")) throw new op.ErreurMetier("Décrivez votre besoin en quelques mots.");
    const debut = creneau && creneau !== "autre" ? new Date(creneau) : undefined;
    op.creerDossier(db, ctx, {
      type: lireType(fd),
      client: { nom: s(fd, "nom"), telephone: s(fd, "telephone"), adresse: s(fd, "adresse") },
      description: s(fd, "description"),
      photos,
      source: "page_client",
      creneauDemande: debut && !Number.isNaN(debut.getTime()) ? debut : undefined,
      creneauSouhaite: creneau === "autre" ? s(fd, "souhait") || "Autre moment, à rappeler" : undefined,
    });
    return `/demande/${slug}?envoye=1`;
  });
}

export async function modifierClient(fd: FormData) {
  const id = s(fd, "id");
  await agir(`/dossiers/${id}`, (db, ctx) => op.modifierClient(db, ctx, id, { nom: s(fd, "nom"), telephone: s(fd, "telephone"), adresse: s(fd, "adresse") }, s(fd, "description")), "Fiche enregistrée");
}

// ---------- Planification ----------

export async function planifier(fd: FormData) {
  const id = s(fd, "id");
  const debut = lireDebut(fd);
  const dureeH = Number(s(fd, "dureeH").replace(",", "."));
  await agir(
    `/dossiers/${id}`,
    (db, ctx) => {
      if (!debut) throw new op.ErreurMetier("Choisissez une date et une heure.");
      op.planifier(db, ctx, id, debut, dureeH > 0 ? Math.round(dureeH * 60) : undefined);
    },
    "Rendez-vous planifié, SMS de confirmation généré",
  );
}

export async function validerCreneauDemande(fd: FormData) {
  const id = s(fd, "id");
  await agir(
    `/dossiers/${id}`,
    (db, ctx) => {
      const d = op.trouverDossier(db, id);
      if (!d.creneauDemande) throw new op.ErreurMetier("Aucun créneau n'a été demandé.");
      op.planifier(db, ctx, id, new Date(d.creneauDemande));
    },
    "Créneau validé, SMS de confirmation généré",
  );
}

export async function envoyerRappel(fd: FormData) {
  const id = s(fd, "id");
  await agir(`/dossiers/${id}`, (db, ctx) => op.envoyerRappel(db, ctx, id), "Lien de confirmation renvoyé");
}

export async function ajouterIndispo(fd: FormData) {
  const jour = depuisCleJour(s(fd, "jour"));
  const retour = `/agenda?jour=${s(fd, "jour")}`;
  await agir(
    retour,
    (db, ctx) => {
      if (!jour || !s(fd, "de") || !s(fd, "a")) throw new op.ErreurMetier("Indiquez le jour, l'heure de début et l'heure de fin.");
      op.ajouterIndispo(db, ctx, aHeure(jour, hm(s(fd, "de"))), aHeure(jour, hm(s(fd, "a"))), s(fd, "note"));
    },
    "Indisponibilité ajoutée",
  );
}

export async function supprimerIndispo(fd: FormData) {
  await agir(cheminSur(s(fd, "retour"), "/agenda"), (db) => op.supprimerIndispo(db, s(fd, "id")), "Indisponibilité supprimée");
}

// ---------- Bon d'intervention et devis ----------

export async function signerBon(_: EtatFormulaire, fd: FormData): Promise<EtatFormulaire> {
  const id = s(fd, "id");
  return agirFormulaire((db, ctx) => {
    op.signerBon(db, ctx, id, s(fd, "travaux"), s(fd, "signature"));
    return `/dossiers/${id}`;
  }, "Bon signé, copie envoyée au client");
}

export async function importerDevis(fd: FormData) {
  const id = s(fd, "id");
  const fichier = fd.get("pdf");
  let stocke: { nom: string; original: string; contenu: Uint8Array } | undefined;
  try {
    if (!(fichier instanceof File) || fichier.size === 0) throw new op.ErreurMetier("Choisissez le PDF du devis.");
    [stocke] = await stockerFichiers([fichier], { "application/pdf": "pdf" }, 10);
  } catch (e) {
    if (!estErreurMetier(e)) throw e;
    redirect(avecParam(`/dossiers/${id}`, "erreur", e.message));
  }
  await agir(
    `/dossiers/${id}`,
    (db, ctx) =>
      op.importerDevis(db, ctx, id, {
        fichier: stocke!.nom,
        nomFichier: stocke!.original,
        empreinte: createHash("sha256").update(stocke!.contenu).digest("hex"),
      }),
    "Devis envoyé au client par SMS",
  );
}

export async function relancerDevis(fd: FormData) {
  const id = s(fd, "id");
  await agir(`/dossiers/${id}`, (db, ctx) => op.relancerDevis(db, ctx, id), "Relance envoyée");
}

export async function marquerSigne(fd: FormData) {
  const id = s(fd, "id");
  await agir(`/dossiers/${id}`, (db, ctx) => op.marquerSigne(db, ctx, id), "Devis marqué signé");
}

// ---------- Pipeline ----------

export async function terminer(fd: FormData) {
  const id = s(fd, "id");
  await agir(`/dossiers/${id}`, (db, ctx) => op.terminer(db, ctx, id), "Dossier terminé");
}

export async function passerPerdu(fd: FormData) {
  const id = s(fd, "id");
  await agir(`/dossiers/${id}`, (db, ctx) => op.passerPerdu(db, ctx, id, s(fd, "motif") as MotifPerdu), "Dossier passé en Perdu");
}

export async function restaurer(fd: FormData) {
  const id = s(fd, "id");
  await agir(cheminSur(s(fd, "retour"), `/dossiers/${id}`), (db, ctx) => op.restaurer(db, ctx, id), "Dossier restauré");
}

export async function traiterRetour(fd: FormData) {
  await agir(cheminSur(s(fd, "retour"), "/messages"), (db) => op.traiterRetour(db, s(fd, "id")), "Retour marqué traité");
}

// ---------- Pages client ----------

export async function confirmerPresence(fd: FormData) {
  const t = s(fd, "token");
  await agir(`/c/${t}/rdv`, (db, ctx) => op.confirmerPresence(db, ctx, t), "Merci, votre présence est confirmée");
}

export async function annulerRdv(fd: FormData) {
  const t = s(fd, "token");
  await agir(`/c/${t}/rdv`, (db, ctx) => op.annulerParClient(db, ctx, t), "Votre rendez-vous est annulé");
}

export async function demanderReport(fd: FormData) {
  const t = s(fd, "token");
  const choix = s(fd, "creneau");
  await agir(
    `/c/${t}/rdv?etape=report`,
    (db, ctx) => {
      const debut = choix && choix !== "rappel" ? new Date(choix) : undefined;
      op.demanderReport(db, ctx, t, debut, s(fd, "souhait"));
      return `/c/${t}/rdv`;
    },
    "Demande envoyée, l'artisan vous confirme le nouveau créneau par SMS",
  );
}

export async function signerDevis(fd: FormData) {
  const t = s(fd, "token");
  const agent = (await headers()).get("user-agent") ?? undefined;
  await agir(`/c/${t}/devis`, (db, ctx) => op.signerDevis(db, ctx, t, s(fd, "code"), agent), "Devis signé, merci");
}

export async function envoyerRetour(fd: FormData) {
  const t = s(fd, "token");
  await agir(`/c/${t}/retour`, (db, ctx) => {
    op.ajouterRetour(db, ctx, t, s(fd, "message"));
    return `/c/${t}/retour?envoye=1`;
  });
}

export async function desinscrire(fd: FormData) {
  const t = s(fd, "token");
  await agir(`/c/${t}/stop`, (db, ctx) => {
    op.desinscrire(db, ctx, t);
    return `/c/${t}/stop?fait=1`;
  });
}

export async function reactiver(fd: FormData) {
  const t = s(fd, "token");
  await agir(`/c/${t}/stop`, (db, ctx) => {
    op.reactiver(db, ctx, t);
    return `/c/${t}/stop`;
  }, "Les messages sont réactivés");
}

// ---------- Profil et réglages ----------

function entier(fd: FormData, k: string, min: number, max: number, libelle: string): number {
  const n = Number(s(fd, k));
  if (!Number.isInteger(n) || n < min || n > max) throw new op.ErreurMetier(`${libelle} : indiquez un nombre entre ${min} et ${max}.`);
  return n;
}

export async function enregistrerEntreprise(fd: FormData) {
  await agir(
    "/profil",
    (db) => {
      const a = db.artisan;
      const entreprise = s(fd, "entreprise");
      const expediteur = s(fd, "expediteur").toUpperCase();
      if (!entreprise) throw new op.ErreurMetier("Indiquez le nom de l'entreprise.");
      if (!/^[A-Z0-9 .-]{3,11}$/.test(expediteur)) throw new op.ErreurMetier("Le nom d'expéditeur fait 3 à 11 caractères : lettres, chiffres, espace, point ou tiret.");
      const lien = s(fd, "lienGoogle");
      if (lien && !/^https?:\/\//.test(lien)) throw new op.ErreurMetier("Le lien Google commence par https://");
      Object.assign(a, {
        prenom: s(fd, "prenom"),
        nom: s(fd, "nomArtisan"),
        entreprise,
        telephone: s(fd, "telephone"),
        expediteur,
        lienGoogle: lien,
        adresse: s(fd, "adresse"),
        siret: s(fd, "siret"),
      });
    },
    "Entreprise enregistrée",
  );
}

export async function enregistrerDurees(fd: FormData) {
  await agir(
    "/profil",
    (db) => {
      db.artisan.durees = {
        depannage: entier(fd, "depannage", 15, 480, "Durée d'un dépannage"),
        visite: entier(fd, "visite", 15, 240, "Durée d'une visite"),
      };
      db.artisan.trajet = entier(fd, "trajet", 0, 120, "Temps de trajet");
    },
    "Durées enregistrées",
  );
}

export async function enregistrerPlages(fd: FormData) {
  await agir(
    "/profil",
    (db) => {
      const lire = (type: TypeMission): Plage[] => {
        const out: Plage[] = [];
        for (let i = 0; i < 3; i++) {
          const jours = fd.getAll(`${type}_${i}_jours`).map(Number).filter((j) => j >= 0 && j <= 6);
          const debut = s(fd, `${type}_${i}_debut`);
          const fin = s(fd, `${type}_${i}_fin`);
          if (!jours.length || !debut || !fin) continue;
          if (hm(fin) <= hm(debut)) throw new op.ErreurMetier("Dans chaque plage, l'heure de fin doit être après l'heure de début.");
          out.push({ jours, debut, fin });
        }
        return out;
      };
      db.artisan.plages = { depannage: lire("depannage"), visite: lire("visite") };
    },
    "Plages enregistrées",
  );
}

export async function enregistrerMessagesAuto(fd: FormData) {
  await agir(
    "/profil",
    (db) => {
      const a = db.artisan;
      a.rappelVeille = { actif: fd.get("rappelActif") === "on", heure: s(fd, "rappelHeure") || "18:00" };
      a.relanceDevis = { delaiJours: entier(fd, "delai", 1, 15, "Délai avant relance"), max: entier(fd, "max", 0, op.MAX_RELANCES, "Nombre de relances") };
      a.demandeAvis = fd.get("avis") === "on";
    },
    "Messages automatiques enregistrés",
  );
}

export async function lancerAutomatisations() {
  await agir("/profil", (db, ctx) => {
    op.lancerAutomatisations(db, ctx, true);
    return avecParam("/profil", "ok", `Automatisations lancées : ${db.artisan.dernierBilan}`);
  });
}

export async function reinitialiserDemo() {
  await getRepo().reinitialiser();
  revalidatePath("/", "layout");
  redirect("/?ok=" + encodeURIComponent("Démo réinitialisée"));
}
