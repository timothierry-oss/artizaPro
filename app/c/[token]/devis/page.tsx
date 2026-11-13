import { Flash } from "@/components/Flash";
import { Icon } from "@/components/Icon";
import { Merci, PageClient } from "@/components/PageClient";
import { SubmitButton } from "@/components/SubmitButton";
import { signerDevis } from "@/lib/actions";
import { dateCourte, dateLongue, heure, telephone } from "@/lib/domain/format";
import { pageClient } from "@/lib/client";
import { premier } from "@/lib/vue";

export const metadata = { title: "Votre devis" };

export default async function Devis({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { d, a, token } = await pageClient(params);
  const sp = await searchParams;
  const dv = d.devis;
  const props = { titre: "Votre devis", entreprise: a.entreprise, tel: a.telephone };
  if (!dv) return <PageClient {...props}><p className="vide-etat">Aucun devis n'est disponible pour ce dossier.</p></PageClient>;
  const pdf = `/api/fichiers/${dv.fichier}`;
  const lienPdf = (
    <a className="rw" href={pdf} target="_blank" rel="noopener noreferrer">
      <span className="ico"><Icon name="doc" /></span>
      <span className="tx">{dv.nomFichier}<small>Ouvrir le PDF en plein écran</small></span>
      <span className="chev">›</span>
    </a>
  );
  if (dv.signeLe) {
    return (
      <PageClient {...props}>
        <Merci titre="Devis signé">
          <p className="hint" style={{ fontSize: 14 }}>Signé le {dateLongue(dv.signeLe)} à {heure(dv.signeLe)}. {a.entreprise} vous contacte pour planifier les travaux.</p>
        </Merci>
        {lienPdf}
      </PageClient>
    );
  }
  if (d.statut === "perdu") return <PageClient {...props}><p className="vide-etat">Ce devis n'est plus valable. Contactez {a.entreprise}.</p></PageClient>;
  return (
    <PageClient {...props}>
      <p className="hint" style={{ textAlign: "center" }}>{a.entreprise} · devis n° {d.numero} · envoyé le {dateCourte(dv.envoyeLe)}</p>
      <iframe className="pdfv" src={pdf} title={`Devis ${d.numero}`} />
      {lienPdf}
      <Flash ok={premier(sp.ok)} erreur={premier(sp.erreur)} />
      <form action={signerDevis} className="grid">
        <input type="hidden" name="token" value={token} />
        <div className="field">
          <label htmlFor="code">Code reçu par SMS au {telephone(d.client.telephone)}</label>
          <input id="code" name="code" className="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required placeholder="······" />
        </div>
        <SubmitButton enCours="Signature…">Signer le devis</SubmitButton>
      </form>
      <p className="hint">
        En signant, vous acceptez ce devis. Signature électronique simple avec horodatage et identification par votre numéro de mobile. Le contenu du devis est de la responsabilité de {a.entreprise}.
      </p>
      <p className="hint">Démo : le code figure dans le SMS simulé, onglet Messages de l'artisan.</p>
    </PageClient>
  );
}
