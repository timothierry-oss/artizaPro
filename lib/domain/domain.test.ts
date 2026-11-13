import { test } from "node:test";
import assert from "node:assert/strict";
import { peutPasser } from "./statuts.ts";
import { creneauxLibres, conflits, dansPlage } from "./agenda.ts";
import * as op from "./operations.ts";
import { creerDemo, artisanDemo } from "./seed.ts";
import { aDecider } from "./alertes.ts";
import { aHeure, hm, ajouterJours, jourOuvre } from "./temps.ts";
import type { Db } from "./types.ts";

const lundi10 = new Date(2026, 10, 16, 10, 0); // lundi 16 novembre 2026, 10:00
let n = 0;
const ctx = (now: Date): op.Ctx => ({ now, baseUrl: "http://test", id: (p) => `${p}${++n}`, token: () => `t${++n}`, code: () => "123456" });
const dbVide = (): Db => ({ version: 1, compteurDossiers: 1, compteurBons: 1, artisan: artisanDemo(), dossiers: [], rdvs: [], messages: [], retours: [] });
const client = { nom: "Mme Test", telephone: "06 00 00 00 01", adresse: "1 rue du Test" };

test("transitions : étape suivante, Perdu depuis un dossier actif, restauration", () => {
  assert.ok(peutPasser("depannage", "a_traiter", "rdv_planifie"));
  assert.ok(!peutPasser("depannage", "a_traiter", "termine"));
  assert.ok(!peutPasser("visite", "devis_envoye", "termine"));
  assert.ok(peutPasser("visite", "devis_envoye", "perdu"));
  assert.ok(!peutPasser("visite", "termine", "perdu"));
  assert.ok(peutPasser("visite", "perdu", "a_traiter"));
});

test("créneaux libres : dans la plage, sans chevauchement, trajet compris", () => {
  const a = artisanDemo();
  const rdvs = [{ id: "x", nature: "depannage" as const, debut: aHeure(lundi10, hm("14:00")).toISOString(), fin: aHeure(lundi10, hm("15:30")).toISOString(), confirmation: "confirme" as const }];
  const c = creneauxLibres(a, rdvs, "depannage", lundi10, 1, lundi10, 5);
  assert.deepEqual(c.map((x) => x.debut.getHours() * 60 + x.debut.getMinutes()), [hm("15:50")]);
  assert.ok(c.every((x) => dansPlage(a, "depannage", x.debut, x.fin)));
  assert.ok(c.every((x) => conflits(rdvs, x.debut, x.fin, a.trajet).length === 0));
  const visites = creneauxLibres(a, [], "visite", lundi10, 1, lundi10, 5);
  assert.ok(visites.every((x) => x.debut.getTime() >= lundi10.getTime() + 30 * 60_000), "pas de créneau dans le passé");
});

test("parcours dépannage : confirmation, bon, terminé, une seule demande d'avis", () => {
  const db = dbVide();
  const d = op.creerDossier(db, ctx(lundi10), { type: "depannage", client, description: "Fuite", source: "speed_dial" });
  op.planifier(db, ctx(lundi10), d.id, aHeure(lundi10, hm("14:00")));
  assert.equal(d.statut, "rdv_planifie");
  assert.equal(db.messages.filter((m) => m.genre === "confirmation_rdv").length, 1);
  op.signerBon(db, ctx(lundi10), d.id, "Joint changé", "data:image/png;base64,AAAA");
  assert.equal(d.statut, "intervention_faite");
  op.terminer(db, ctx(lundi10), d.id);
  assert.equal(d.statut, "termine");
  assert.equal(db.messages.filter((m) => m.genre === "demande_avis").length, 1);
  assert.throws(() => op.terminer(db, ctx(lundi10), d.id), op.ErreurMetier);
  assert.equal(db.messages.filter((m) => m.genre === "demande_avis").length, 1);
});

test("Perdu : aucune demande d'avis, rendez-vous futurs annulés", () => {
  const db = dbVide();
  const d = op.creerDossier(db, ctx(lundi10), { type: "depannage", client, description: "Fuite", source: "speed_dial" });
  op.planifier(db, ctx(lundi10), d.id, aHeure(lundi10, hm("14:00")));
  op.passerPerdu(db, ctx(lundi10), d.id, "injoignable");
  assert.equal(d.statut, "perdu");
  assert.equal(db.rdvs[0].confirmation, "annule");
  assert.equal(db.messages.filter((m) => m.genre === "demande_avis").length, 0);
});

test("devis : relance automatique après le délai, jamais au-delà du maximum, signature par code", () => {
  const db = dbVide();
  db.artisan.relanceDevis = { delaiJours: 4, max: 2 };
  const d = op.creerDossier(db, ctx(lundi10), { type: "visite", client, description: "Chaudière", source: "speed_dial" });
  op.planifier(db, ctx(lundi10), d.id, aHeure(lundi10, hm("11:00")));
  op.importerDevis(db, ctx(lundi10), d.id, { fichier: "f.pdf", nomFichier: "f.pdf", empreinte: "abc" });
  assert.equal(d.statut, "devis_envoye");
  assert.equal(op.lancerAutomatisations(db, ctx(ajouterJours(lundi10, 3)), true).relances, 0);
  assert.equal(op.lancerAutomatisations(db, ctx(ajouterJours(lundi10, 4)), true).relances, 1);
  assert.equal(op.lancerAutomatisations(db, ctx(ajouterJours(lundi10, 8)), true).relances, 1);
  assert.equal(op.lancerAutomatisations(db, ctx(ajouterJours(lundi10, 30)), true).relances, 0);
  assert.equal(d.devis!.relances, 2);
  assert.throws(() => op.signerDevis(db, ctx(lundi10), d.publicToken, "000000"), op.ErreurMetier);
  op.signerDevis(db, ctx(lundi10), d.publicToken, "123 456");
  assert.equal(d.statut, "signe");
  assert.ok(d.devis!.preuve);
});

test("rappel de la veille : envoyé une fois, seulement après l'heure réglée en mode automatique", () => {
  const db = dbVide();
  const d = op.creerDossier(db, ctx(lundi10), { type: "depannage", client, description: "Fuite", source: "speed_dial" });
  op.planifier(db, ctx(lundi10), d.id, aHeure(ajouterJours(lundi10, 1), hm("14:00")));
  assert.equal(op.lancerAutomatisations(db, ctx(lundi10), false).rappels, 0);
  const soir = aHeure(lundi10, hm("18:05"));
  assert.ok(op.automatisationsEnAttente(db, soir));
  assert.equal(op.lancerAutomatisations(db, ctx(soir), false).rappels, 1);
  assert.equal(op.lancerAutomatisations(db, ctx(soir), true).rappels, 0);
});

test("désinscription : plus de relance ni de demande d'avis", () => {
  const db = dbVide();
  const d = op.creerDossier(db, ctx(lundi10), { type: "depannage", client, description: "Fuite", source: "speed_dial" });
  op.planifier(db, ctx(lundi10), d.id, aHeure(lundi10, hm("14:00")));
  op.desinscrire(db, ctx(lundi10), d.publicToken);
  op.signerBon(db, ctx(lundi10), d.id, "Joint changé", "data:image/png;base64,AAAA");
  op.terminer(db, ctx(lundi10), d.id);
  assert.equal(db.messages.filter((m) => m.genre === "demande_avis").length, 0);
});

test("la démo se construit à toute heure et chaque jour de la semaine", () => {
  for (let jour = 0; jour < 7; jour++) {
    for (const h of [7, 12, 19, 23]) {
      const now = new Date(2026, 10, 15 + jour, h, 10);
      const { db, fichiers } = creerDemo(now);
      assert.ok(db.dossiers.length >= 18);
      assert.ok(fichiers.length >= 5);
      assert.ok(aDecider(db, now).total > 0);
    }
  }
  assert.ok(jourOuvre(new Date(2026, 10, 14), 1).getDay() === 1);
});
