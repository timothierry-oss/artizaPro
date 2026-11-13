"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

const ONGLETS = [
  { href: "/", label: "Accueil", icone: "home" },
  { href: "/agenda", label: "Agenda", icone: "cal" },
  { href: "/dossiers", label: "Dossiers", icone: "folder" },
  { href: "/messages", label: "Messages", icone: "msg" },
];

export function TabBar({ initiales, nonLus }: { initiales: string; nonLus: number }) {
  const p = usePathname();
  // Écrans de saisie plein écran : pas de barre d'onglets.
  if (/^\/dossiers\/(nouveau|[^/]+\/bon)$/.test(p)) return null;
  const actif = (href: string) => (href === "/" ? p === "/" : p.startsWith(href) || (href === "/dossiers" && p.startsWith("/perdus")));
  return (
    <nav className="tabbar" aria-label="Navigation principale">
      {ONGLETS.map((o) => (
        <Link key={o.href} href={o.href} className={actif(o.href) ? "on" : ""} aria-current={actif(o.href) ? "page" : undefined}>
          <Icon name={o.icone} />
          {o.label}
          {o.href === "/messages" && nonLus > 0 && <span className="pastille">{nonLus}</span>}
        </Link>
      ))}
      <Link href="/profil" className={actif("/profil") ? "on" : ""} aria-current={actif("/profil") ? "page" : undefined}>
        <span className="av">{initiales}</span>
        Profil
      </Link>
    </nav>
  );
}
