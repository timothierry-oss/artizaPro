import Link from "next/link";

export default function Introuvable() {
  return (
    <div className="app">
      <main className="screen client" style={{ paddingTop: 80 }}>
        <div className="ok">
          <h1 className="titre-client">Page introuvable</h1>
          <p className="hint" style={{ fontSize: 14 }}>Ce lien n'existe pas ou n'est plus valable.</p>
        </div>
        <Link href="/" className="pill w">Retour à l'accueil</Link>
      </main>
    </div>
  );
}
