import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { connection } from "next/server";
import { getRepo } from "./repo/index.ts";
import type { Ctx } from "./domain/operations.ts";
import type { Db } from "./domain/types.ts";

/** Lecture des données pour un rendu de page (toujours à la demande, jamais en cache). */
export async function lireDb(): Promise<{ db: Db; now: Date }> {
  await connection();
  return { db: await getRepo().lire(), now: new Date() };
}

/** Adresse de l'app telle que le navigateur la voit (localhost ou IP du Wi-Fi), pour les liens des SMS. */
export async function baseUrl(): Promise<string> {
  const h = await headers();
  const hote = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (hote.startsWith("localhost") || /^\d/.test(hote) ? "http" : "https");
  return `${proto}://${hote}`;
}

export async function ctxServeur(): Promise<Ctx> {
  const url = await baseUrl();
  return {
    now: new Date(),
    baseUrl: url,
    id: (p) => `${p}${randomUUID().slice(0, 8)}`,
    token: () => randomBytes(6).toString("base64url"),
    code: () => String(randomInt(100000, 1000000)),
  };
}
