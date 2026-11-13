import Link from "next/link";

/** Affiche le texte d'un SMS simulé avec des liens cliquables. Les liens vers les pages client restent relatifs
 * pour fonctionner depuis n'importe quelle adresse (localhost ou téléphone sur le Wi-Fi). */
export function TexteSms({ texte }: { texte: string }) {
  const morceaux = texte.split(/(https?:\/\/[^\s]+?)(?=[.,;:!?)]?(?:\s|$))/g);
  return (
    <>
      {morceaux.map((m, i) => {
        if (!/^https?:\/\//.test(m)) return <span key={i}>{m}</span>;
        const u = new URL(m);
        if (/^\/(c|demande)\//.test(u.pathname)) {
          return (
            <Link key={i} href={u.pathname}>
              {u.host}
              {u.pathname}
            </Link>
          );
        }
        return (
          <a key={i} href={m} target="_blank" rel="noopener noreferrer">
            {u.host}
            {u.pathname === "/" ? "" : u.pathname}
          </a>
        );
      })}
    </>
  );
}
