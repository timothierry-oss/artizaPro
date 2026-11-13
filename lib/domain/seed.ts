// Données de démonstration, recalculées autour de la date du jour.
// Le scénario rejoue les vraies opérations métier : historique, SMS et statuts restent cohérents.
import { createHash, randomBytes } from "node:crypto";
import type { Artisan, Db, MotifPerdu, TypeMission } from "./types.ts";
import * as op from "./operations.ts";
import { pdfSimple } from "./pdf.ts";
import { aHeure, ajouterMinutes, hm, jourOuvre } from "./temps.ts";

export interface FichierDemo {
  nom: string;
  contenu: Uint8Array;
}

export const BASE_DEMO = "http://localhost:3000";

export function artisanDemo(): Artisan {
  return {
    slug: "dupont",
    prenom: "Thomas",
    nom: "Dupont",
    entreprise: "Dupont Plomberie",
    telephone: "06 11 22 33 44",
    expediteur: "DUPONT-PLOMB",
    lienGoogle: "https://g.page/dupont-plomberie",
    adresse: "5 rue du Port, 44400 Rezé",
    siret: "123 456 789 00012",
    durees: { depannage: 90, visite: 40 },
    trajet: 20,
    plages: {
      depannage: [
        { jours: [1, 2, 3, 4, 5], debut: "13:30", fin: "18:30" },
        { jours: [6], debut: "09:00", fin: "12:00" },
      ],
      visite: [{ jours: [1, 2, 3, 4, 5], debut: "08:00", fin: "12:00" }],
    },
    rappelVeille: { actif: true, heure: "18:00" },
    relanceDevis: { delaiJours: 4, max: 1 },
    demandeAvis: true,
    icalKey: randomBytes(9).toString("base64url"),
    desinscrits: [],
  };
}

// Trait de signature d'exemple (les vraies signatures sont des PNG dessinés au doigt).
const SIGNATURE_DEMO =
  "data:image/svg+xml;base64," +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 160"><path d="M30 105 C 60 45, 90 135, 120 85 S 170 45, 190 100 S 240 115, 260 75 S 300 65, 315 95" fill="none" stroke="#202020" stroke-width="3" stroke-linecap="round"/></svg>',
  ).toString("base64");

export function creerDemo(now: Date): { db: Db; fichiers: FichierDemo[] } {
  const db: Db = {
    version: 1,
    compteurDossiers: 101,
    compteurBons: 31,
    artisan: artisanDemo(),
    dossiers: [],
    rdvs: [],
    messages: [],
    retours: [],
  };
  const fichiers: FichierDemo[] = [];
  let n = 0;
  const ctx = (t: Date): op.Ctx => ({
    now: t,
    baseUrl: BASE_DEMO,
    id: (p) => `${p}${(++n).toString(36)}${randomBytes(2).toString("hex")}`,
    token: () => randomBytes(6).toString("base64url"),
    code: () => String(100000 + (randomBytes(3).readUIntBE(0, 3) % 900000)),
  });
  /** Jour ouvré relatif à aujourd'hui, à l'heure donnée. */
  const J = (k: number, h: string) => aHeure(jourOuvre(now, k), hm(h));
  const client = (nom: string, telephone: string, adresse: string) => ({ nom, telephone, adresse });
  const nouveau = (t: Date, type: TypeMission, c: ReturnType<typeof client>, description: string, extra: Partial<op.NouveauDossier> = {}) =>
    op.creerDossier(db, ctx(t), { type, client: c, description, source: "speed_dial", ...extra });
  const devisPdf = (dossier: { id: string; numero: string; client: { nom: string; adresse: string } }, t: Date, lignes: [string, string][]) => {
    const total = lignes.reduce((s, [, p]) => s + Number(p.replace(/\s/g, "").replace(",", ".")), 0);
    const euros = (x: number) => x.toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " €";
    const contenu = pdfSimple([
      { texte: "Dupont Plomberie", taille: 18, gras: true },
      { texte: "5 rue du Port, 44400 Rezé · 06 11 22 33 44 · SIRET 123 456 789 00012", taille: 9 },
      { texte: `Devis n° ${dossier.numero}`, taille: 16, gras: true, avant: 24 },
      { texte: `Client : ${dossier.client.nom}, ${dossier.client.adresse}` },
      { texte: `Date : ${t.toLocaleDateString("fr-FR")} · Validité : 30 jours` },
      ...lignes.map(([l, p]) => ({ texte: `${l} ..... ${euros(Number(p.replace(",", ".")))} HT`, avant: 6 })),
      { texte: `Total HT : ${euros(total)}`, gras: true, avant: 14 },
      { texte: `TVA 10 % : ${euros(total * 0.1)}` },
      { texte: `Total TTC : ${euros(total * 1.1)}`, gras: true },
      { texte: "Devis d'exemple généré pour la démonstration d'ArtizaPro.", taille: 9, avant: 30 },
    ]);
    const nom = `devis-${dossier.numero}-${dossier.id}.pdf`;
    fichiers.push({ nom, contenu });
    return { fichier: nom, nomFichier: `devis-${dossier.numero}.pdf`, empreinte: createHash("sha256").update(contenu).digest("hex") };
  };
  const perdu = (id: string, t: Date, motif: MotifPerdu) => op.passerPerdu(db, ctx(t), id, motif);

  // --- Terminé (visite, il y a un mois) ---
  const caradec = nouveau(J(-24, "10:00"), "visite", client("Mme Caradec", "06 72 18 44 90", "11 rue Jean Jaurès, 44400 Rezé"), "Remplacement d'un ballon d'eau chaude de 200 L.");
  op.planifier(db, ctx(J(-24, "10:05")), caradec.id, J(-22, "09:00"));
  op.importerDevis(db, ctx(J(-21, "18:00")), caradec.id, devisPdf(caradec, J(-21, "18:00"), [["Chauffe-eau thermodynamique 200 L", "2150"], ["Pose et mise en service", "480"]]));
  op.marquerSigne(db, ctx(J(-19, "12:00")), caradec.id);
  op.planifier(db, ctx(J(-19, "12:05")), caradec.id, J(-15, "08:00"), 240);
  op.terminer(db, ctx(J(-15, "13:00")), caradec.id);

  // --- Perdus ---
  const mouettes = nouveau(J(-21, "09:30"), "depannage", client("SCI Les Mouettes", "02 40 12 34 56", "2 quai de la Fosse, 44000 Nantes"), "Fuite sur colonne d'eau dans les communs.");
  perdu(mouettes.id, J(-19, "17:00"), "injoignable");
  const dubois = nouveau(J(-18, "11:00"), "visite", client("M. Dubois", "06 33 21 87 65", "28 rue Paul Bellamy, 44000 Nantes"), "Création d'une salle d'eau à l'étage.");
  op.planifier(db, ctx(J(-18, "11:05")), dubois.id, J(-17, "09:00"));
  op.importerDevis(db, ctx(J(-16, "18:30")), dubois.id, devisPdf(dubois, J(-16, "18:30"), [["Douche à l'italienne, receveur extra-plat", "1890"], ["Plomberie et évacuations", "1240"]]));
  op.relancerDevis(db, ctx(J(-13, "10:00")), dubois.id);
  op.relancerDevis(db, ctx(J(-10, "10:00")), dubois.id);
  perdu(dubois.id, J(-7, "09:00"), "devis_non_signe");
  const nguyen = nouveau(J(-17, "08:40"), "visite", client("M. Nguyen", "07 81 45 22 10", "9 allée des Tilleuls, 44340 Bouguenais"), "Remplacement de la chaudière fioul par une pompe à chaleur.");
  op.planifier(db, ctx(J(-17, "08:45")), nguyen.id, J(-16, "10:00"));
  op.importerDevis(db, ctx(J(-15, "19:00")), nguyen.id, devisPdf(nguyen, J(-15, "19:00"), [["Pompe à chaleur air/eau 8 kW", "7900"], ["Dépose de la chaudière fioul", "650"]]));
  perdu(nguyen.id, J(-11, "16:00"), "autre_artisan");
  const simon = nouveau(J(-12, "14:20"), "depannage", client("Mme Simon", "06 50 14 92 37", "14 rue de la Commune, 44400 Rezé"), "Robinet de cuisine qui fuit au pied.");
  op.planifier(db, ctx(J(-12, "14:25")), simon.id, J(-10, "14:00"));
  op.annulerParClient(db, ctx(J(-11, "20:10")), simon.publicToken);

  // --- Terminé (dépannage) avec retour privé ---
  const fabre = nouveau(J(-8, "08:15"), "depannage", client("M. Fabre", "06 98 76 54 32", "3 rue des Lilas, 44400 Rezé"), "Robinet de cuisine qui goutte en continu.", { pieces: "Cartouche céramique 35 mm" });
  op.planifier(db, ctx(J(-8, "08:20")), fabre.id, J(-7, "14:00"));
  op.confirmerPresence(db, ctx(J(-8, "18:30")), fabre.publicToken);
  op.signerBon(db, ctx(J(-7, "15:20")), fabre.id, "Remplacement de la cartouche du mitigeur, contrôle d'étanchéité, remise en eau.", SIGNATURE_DEMO);
  op.terminer(db, ctx(J(-7, "15:30")), fabre.id);
  op.ajouterRetour(db, ctx(ajouterMinutes(now, -95)), fabre.publicToken, "Bonjour, le robinet goutte encore légèrement quand on le ferme fort. Pouvez-vous repasser ?");

  // --- Devis signés et chantiers ---
  const joly = nouveau(J(-12, "09:00"), "visite", client("Mme Joly", "06 24 68 13 57", "40 boulevard Jean Monnet, 44400 Rezé"), "Rénovation complète de la salle de bains.");
  op.planifier(db, ctx(J(-12, "09:05")), joly.id, J(-11, "09:00"));
  op.importerDevis(db, ctx(J(-9, "18:00")), joly.id, devisPdf(joly, J(-9, "18:00"), [["Dépose et évacuation de l'existant", "620"], ["Baignoire vers douche, faïence", "3480"], ["Meuble vasque et robinetterie", "890"]]));
  op.signerDevis(db, ctx(J(-8, "21:00")), joly.publicToken, db.dossiers.find((d) => d.id === joly.id)!.devis!.code, "Démo");
  op.planifier(db, ctx(J(-8, "21:05")), joly.id, J(3, "08:00"), 240);
  const hamon = nouveau(J(-6, "10:30"), "visite", client("M. Hamon", "07 45 90 12 33", "6 impasse des Vignes, 44230 Saint-Sébastien-sur-Loire"), "Remplacement d'un adoucisseur et du réducteur de pression.");
  op.planifier(db, ctx(J(-6, "10:35")), hamon.id, J(-5, "10:00"));
  op.importerDevis(db, ctx(J(-4, "17:00")), hamon.id, devisPdf(hamon, J(-4, "17:00"), [["Adoucisseur 20 L, bypass", "1290"], ["Réducteur de pression et pose", "310"]]));
  op.signerDevis(db, ctx(ajouterMinutes(now, -60 * 20)), hamon.publicToken, db.dossiers.find((d) => d.id === hamon.id)!.devis!.code, "Démo");

  // --- Devis envoyé, en attente ---
  const lefevre = nouveau(J(-5, "11:00"), "visite", client("M. Lefèvre", "07 65 43 21 09", "17 rue Carnot, 44340 Bouguenais"), "Chaudière gaz de 2004 à remplacer, logement de 85 m².", { source: "page_client" });
  op.planifier(db, ctx(J(-5, "11:10")), lefevre.id, J(-4, "09:00"));
  op.confirmerPresence(db, ctx(J(-5, "18:40")), lefevre.publicToken);
  op.importerDevis(db, ctx(J(-3, "17:20")), lefevre.id, devisPdf(lefevre, J(-3, "17:20"), [["Chaudière gaz à condensation 25 kW", "3290"], ["Dépose de l'ancienne chaudière", "380"], ["Pose, raccordements, mise en service", "920"]]));

  // --- Intervention faite, à terminer ---
  const leroy = nouveau(J(-2, "09:10"), "depannage", client("Mme Leroy", "06 87 32 10 45", "21 rue Victor Hugo, 44400 Rezé"), "Ballon d'eau chaude qui ne chauffe plus.", { pieces: "Thermostat, résistance stéatite" });
  op.planifier(db, ctx(J(-2, "09:15")), leroy.id, J(-1, "14:00"));
  op.confirmerPresence(db, ctx(J(-2, "19:00")), leroy.publicToken);
  op.signerBon(db, ctx(J(-1, "15:40")), leroy.id, "Remplacement du thermostat et de la résistance, contrôle du groupe de sécurité.", SIGNATURE_DEMO);

  // --- Rendez-vous d'aujourd'hui et des prochains jours ---
  const morel = nouveau(J(-2, "16:00"), "visite", client("M. Morel", "06 14 25 36 47", "4 rue Mercœur, 44000 Nantes"), "Devis pour déplacer la cuisine et ses évacuations.");
  op.planifier(db, ctx(J(-2, "16:05")), morel.id, J(0, "09:00"));
  op.confirmerPresence(db, ctx(J(-1, "18:20")), morel.publicToken);
  const roux = nouveau(J(-1, "11:00"), "depannage", client("Mme Roux", "06 41 52 63 74", "9 rue Victor Hugo, 44400 Rezé"), "Plus de pression à l'évier et à la douche.");
  op.planifier(db, ctx(J(-1, "11:05")), roux.id, J(0, "16:00"));
  op.confirmerPresence(db, ctx(J(-1, "18:45")), roux.publicToken);
  const lemoine = nouveau(J(-3, "17:30"), "visite", client("Mme Lemoine", "06 36 47 58 69", "15 rue de Strasbourg, 44000 Nantes"), "Remplacement des radiateurs du séjour.");
  op.planifier(db, ctx(J(-3, "17:35")), lemoine.id, J(1, "09:00"));
  op.confirmerPresence(db, ctx(J(-2, "08:00")), lemoine.publicToken);
  const bernard = nouveau(J(-1, "18:42"), "depannage", client("Mme Bernard", "06 12 34 56 78", "12 rue de la Paix, 44400 Rezé"), "Fuite sous l'évier de la cuisine, goutte en continu depuis hier soir, arrivée d'eau coupée.", { pieces: "Siphon, joint de bonde" });
  op.planifier(db, ctx(J(-1, "18:44")), bernard.id, J(1, "14:00"));
  op.ajouterIndispo(db, ctx(J(-1, "19:00")), J(1, "16:30"), J(1, "17:30"), "Fournisseur");
  const bati = nouveau(J(-1, "10:00"), "depannage", client("Sté Bâti Ouest", "02 40 98 76 54", "Zone de la Brosse, 44400 Rezé"), "Robinet d'arrêt général bloqué dans le local technique.");
  op.planifier(db, ctx(J(-1, "10:05")), bati.id, J(2, "15:30"));
  op.confirmerPresence(db, ctx(J(-1, "12:00")), bati.publicToken);

  // --- À traiter ---
  nouveau(J(-1, "20:15"), "visite", client("Mme Garnier", "06 77 88 99 00", "3 rue des Lilas, 44000 Nantes"), "Chaudière gaz de 2004 à remplacer, appartement de 85 m², je voudrais un devis pour une chaudière à condensation.", {
    source: "page_client",
    creneauDemande: J(2, "10:30"),
  });
  nouveau(ajouterMinutes(now, -45), "depannage", client("M. Petit", "06 58 69 70 81", "22 boulevard Jean Monnet, 44400 Rezé"), "WC bouché, chasse d'eau qui déborde.", { creneauSouhaite: "Demain matin si possible" });
  nouveau(ajouterMinutes(now, -120), "depannage", client("M. Rocher", "06 45 12 78 90", "8 avenue de la Libération, 44400 Rezé"), "Chauffe-eau en panne, plus d'eau chaude depuis ce matin.", {
    source: "page_client",
    creneauDemande: aHeure(now, hm("19:00")),
  });

  db.messages.sort((a, b) => a.envoyeLe.localeCompare(b.envoyeLe));
  return { db, fichiers };
}
