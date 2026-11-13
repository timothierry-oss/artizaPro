import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import type { Db } from "../domain/types.ts";
import { creerDemo } from "../domain/seed.ts";
import type { Repository } from "./Repository.ts";

const DOSSIER = path.join(process.cwd(), "data");
const FICHIER = path.join(DOSSIER, "db.json");
const FICHIERS = path.join(DOSSIER, "fichiers");
const NOM_VALIDE = /^[a-zA-Z0-9_-]+\.(pdf|jpg|jpeg|png|webp|heic)$/;

export class JsonRepository implements Repository {
  // File d'attente : une seule transaction à la fois dans ce processus.
  private file: Promise<unknown> = Promise.resolve();

  private enFile<T>(travail: () => Promise<T>): Promise<T> {
    const suite = this.file.then(travail, travail);
    this.file = suite.catch(() => undefined);
    return suite;
  }

  private async charger(): Promise<Db> {
    try {
      return JSON.parse(await fs.readFile(FICHIER, "utf8")) as Db;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      return this.semer();
    }
  }

  private async ecrire(db: Db) {
    await fs.mkdir(DOSSIER, { recursive: true });
    const tmp = `${FICHIER}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 1));
    await fs.rename(tmp, FICHIER);
  }

  private async semer(): Promise<Db> {
    const { db, fichiers } = creerDemo(new Date());
    await fs.mkdir(FICHIERS, { recursive: true });
    await Promise.all(fichiers.map((f) => fs.writeFile(path.join(FICHIERS, f.nom), f.contenu)));
    await this.ecrire(db);
    return db;
  }

  lire(): Promise<Db> {
    return this.enFile(() => this.charger());
  }

  modifier<T>(fn: (db: Db) => T): Promise<T> {
    return this.enFile(async () => {
      const db = await this.charger();
      const resultat = fn(db);
      await this.ecrire(db);
      return resultat;
    });
  }

  reinitialiser(): Promise<void> {
    return this.enFile(async () => {
      await fs.rm(FICHIERS, { recursive: true, force: true });
      await this.semer();
    });
  }

  async stockerFichier(contenu: Uint8Array, extension: string): Promise<string> {
    const nom = `${randomBytes(12).toString("base64url")}.${extension.toLowerCase()}`;
    if (!NOM_VALIDE.test(nom)) throw new Error("Extension de fichier refusée.");
    await fs.mkdir(FICHIERS, { recursive: true });
    await fs.writeFile(path.join(FICHIERS, nom), contenu);
    return nom;
  }

  async lireFichier(nom: string): Promise<Uint8Array | null> {
    if (!NOM_VALIDE.test(nom)) return null;
    try {
      return await fs.readFile(path.join(FICHIERS, nom));
    } catch {
      return null;
    }
  }
}
