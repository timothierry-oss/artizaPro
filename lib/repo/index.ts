import type { Repository } from "./Repository.ts";
import { JsonRepository } from "./json.ts";

// Seul point à changer pour passer à Supabase.
const g = globalThis as unknown as { __artizaRepo?: Repository };

export function getRepo(): Repository {
  g.__artizaRepo ??= new JsonRepository();
  return g.__artizaRepo;
}
