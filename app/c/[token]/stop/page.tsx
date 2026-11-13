import { Flash } from "@/components/Flash";
import { Merci, PageClient } from "@/components/PageClient";
import { SubmitButton } from "@/components/SubmitButton";
import { desinscrire, reactiver } from "@/lib/actions";
import { estDesinscrit } from "@/lib/domain/operations";
import { telephone } from "@/lib/domain/format";
import { pageClient } from "@/lib/client";
import { premier } from "@/lib/vue";

export const metadata = { title: "Vos préférences SMS" };

export default async function Stop({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { db, d, a, token } = await pageClient(params);
  const sp = await searchParams;
  const props = { titre: "Vos préférences SMS", entreprise: a.entreprise, tel: a.telephone };
  const champ = <input type="hidden" name="token" value={token} />;
  if (estDesinscrit(db, d.client.telephone)) {
    return (
      <PageClient {...props}>
        <Merci titre="C'est noté">
          <p className="hint" style={{ fontSize: 14 }}>Vous ne recevrez plus de relance de devis ni de demande d'avis de la part de {a.entreprise} au {telephone(d.client.telephone)}.</p>
          <p className="hint">Les messages liés à un rendez-vous déjà pris (confirmation, rappel) continuent d'être envoyés.</p>
        </Merci>
        <form action={reactiver}>{champ}<SubmitButton className="pill w">Réactiver les messages</SubmitButton></form>
      </PageClient>
    );
  }
  return (
    <PageClient {...props}>
      <Flash ok={premier(sp.ok)} erreur={premier(sp.erreur)} />
      <h2 className="titre-client">Ne plus recevoir de relance ni de demande d'avis ?</h2>
      <p className="hint" style={{ fontSize: 14 }}>Concerne le numéro {telephone(d.client.telephone)} pour {a.entreprise}. Vous recevrez toujours les confirmations et rappels de rendez-vous.</p>
      <form action={desinscrire}>{champ}<SubmitButton enCours="Enregistrement…">Me désinscrire</SubmitButton></form>
    </PageClient>
  );
}
