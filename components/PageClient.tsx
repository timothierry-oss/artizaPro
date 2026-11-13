import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { telephone } from "@/lib/domain/format";

/** Cadre des pages client : sans compte, sans barre d'onglets, téléphone de l'artisan toujours visible. */
export function PageClient({ titre, entreprise, tel, children }: { titre: string; entreprise: string; tel: string; children: ReactNode }) {
  return (
    <div className="app">
      <header className="appbar">
        <span className="sq ph" />
        <h1 className="ttl">{titre}</h1>
        <span className="sq ph" />
      </header>
      <main className="screen client">
        {children}
        <a className="rw" href={`tel:${tel.replace(/\s/g, "")}`} style={{ marginTop: 8 }}>
          <span className="ico"><Icon name="phone" /></span>
          <span className="tx">Une question ? Appelez {entreprise}<small>{telephone(tel)}</small></span>
          <span className="chev">›</span>
        </a>
      </main>
    </div>
  );
}

export function Merci({ titre, children }: { titre: string; children?: ReactNode }) {
  return (
    <div className="ok">
      <div className="ck"><Icon name="ok" /></div>
      <h2 className="titre-client">{titre}</h2>
      {children}
    </div>
  );
}
