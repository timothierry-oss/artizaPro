"use client";

export default function Erreur({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="app">
      <main className="screen client" style={{ paddingTop: 80 }}>
        <div className="ok">
          <h1 className="titre-client">Quelque chose s'est mal passé</h1>
          <p className="hint" style={{ fontSize: 14 }}>L'action n'a pas abouti. Réessayez ; si le problème continue, relancez le serveur.</p>
        </div>
        <button className="pill" onClick={reset}>Réessayer</button>
      </main>
    </div>
  );
}
