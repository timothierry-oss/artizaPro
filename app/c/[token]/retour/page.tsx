import { Flash } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { Merci, PageClient } from "@/components/PageClient";
import { SubmitButton } from "@/components/SubmitButton";
import { envoyerRetour } from "@/lib/actions";
import { dateLongue } from "@/lib/domain/format";
import { pageClient } from "@/lib/client";
import { premier, resume } from "@/lib/vue";

export const metadata = { title: "Un souci ?" };

export default async function Retour({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { d, a, token } = await pageClient(params);
  const sp = await searchParams;
  const props = { titre: a.entreprise, entreprise: a.entreprise, tel: a.telephone };
  if (premier(sp.envoye)) {
    return (
      <PageClient {...props}>
        <Merci titre="Message envoyé"><p className="hint" style={{ fontSize: 14 }}>{a.entreprise} a reçu votre message et vous rappelle rapidement.</p></Merci>
      </PageClient>
    );
  }
  return (
    <PageClient {...props}>
      <div className="hero-ill">
        <svg viewBox="0 0 120 120" fill="none" stroke="#C9F158" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 30h80v50H55l-20 18V80H20z" />
          <path d="M40 50h40M40 62h24" />
          <circle cx="95" cy="22" r="10" fill="#C9F158" stroke="none" />
        </svg>
      </div>
      <div>
        <p className="hint">Bonjour {d.client.nom},</p>
        <h2 className="titre-client">Un souci avec l'intervention ?</h2>
        <p className="hint" style={{ fontSize: 14, marginTop: 4 }}>Dites-nous ce qui ne va pas, nous vous rappelons. Ce message est privé : il n'est pas publié et ne remplace pas votre avis Google.</p>
      </div>
      <Flash erreur={premier(sp.erreur)} />
      <form action={envoyerRetour} className="grid">
        <input type="hidden" name="token" value={token} />
        <div className="field">
          <label htmlFor="message">Votre message</label>
          <textarea id="message" name="message" className="in" required minLength={3} maxLength={2000} />
        </div>
        <div className="rw g">
          <span className="ico"><Icon name="doc" /></span>
          <span className="tx">Intervention concernée<small>{resume(d.description, 40)}{d.termineLe ? ` · ${dateLongue(d.termineLe)}` : ""}</small></span>
        </div>
        <SubmitButton enCours="Envoi…">Envoyer à {a.entreprise}</SubmitButton>
      </form>
    </PageClient>
  );
}
