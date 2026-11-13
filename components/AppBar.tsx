import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

/** En-tête : titre centré, bouton retour à gauche, action à droite. */
export function AppBar({ titre, retour, droite }: { titre: string; retour?: string; droite?: ReactNode }) {
  return (
    <header className="appbar">
      {retour ? (
        <Link href={retour} className="sq" aria-label="Retour">
          <Icon name="back" />
        </Link>
      ) : (
        <span className="sq ph" />
      )}
      <h1 className="ttl">{titre}</h1>
      {droite ?? <span className="sq ph" />}
    </header>
  );
}

export function BoutonCarre({ href, icone, label, point }: { href: string; icone: string; label: string; point?: boolean }) {
  return (
    <Link href={href} className="sq" aria-label={label}>
      <Icon name={icone} />
      {point && <span className="d" />}
    </Link>
  );
}
