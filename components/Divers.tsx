"use client";
import { useEffect, useState } from "react";

export function BoutonCopier({ texte, label = "Copier" }: { texte: string; label?: string }) {
  const [fait, setFait] = useState(false);
  return (
    <button
      type="button"
      className="pill w sm"
      onClick={async () => {
        const complet = texte.startsWith("/") ? window.location.origin + texte : texte;
        try {
          await navigator.clipboard.writeText(complet);
          setFait(true);
          setTimeout(() => setFait(false), 1800);
        } catch {
          window.prompt("Copiez ce lien :", complet);
        }
      }}
    >
      {fait ? "Copié" : label}
    </button>
  );
}

export function BoutonImprimer() {
  return (
    <button type="button" className="pill sm" onClick={() => window.print()}>
      Imprimer ou enregistrer en PDF
    </button>
  );
}

/** Affiche l'adresse complète de la page (utile pour ouvrir un lien sur un autre appareil). */
export function AdresseComplete({ chemin }: { chemin: string }) {
  const [url, setUrl] = useState(chemin);
  useEffect(() => setUrl(window.location.origin + chemin), [chemin]);
  return <>{url.replace(/^https?:\/\//, "")}</>;
}

export function EnregistrerServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);
  return null;
}
