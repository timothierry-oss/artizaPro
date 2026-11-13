import type { Db } from "../domain/types.ts";

/**
 * Dépôt de données. L'implémentation actuelle écrit un fichier JSON local (data/db.json).
 * Une implémentation Supabase remplacera `JsonRepository` sans changer les écrans ni le domaine.
 */
export interface Repository {
  /** Instantané en lecture seule. */
  lire(): Promise<Db>;
  /** Transaction : charge, applique `fn`, enregistre. Si `fn` lève une erreur, rien n'est enregistré. */
  modifier<T>(fn: (db: Db) => T): Promise<T>;
  /** Remplace toutes les données par la démo, recalculée autour de maintenant. */
  reinitialiser(): Promise<void>;
  /** Fichiers joints (PDF de devis, photos). Renvoie le nom stocké. */
  stockerFichier(contenu: Uint8Array, extension: string): Promise<string>;
  lireFichier(nom: string): Promise<Uint8Array | null>;
}
