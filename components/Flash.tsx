export function Flash({ ok, erreur }: { ok?: string | string[]; erreur?: string | string[] }) {
  const o = Array.isArray(ok) ? ok[0] : ok;
  const e = Array.isArray(erreur) ? erreur[0] : erreur;
  if (e) return <p className="flash err" role="alert">{e}</p>;
  if (o) return <p className="flash ok" role="status">{o}</p>;
  return null;
}
