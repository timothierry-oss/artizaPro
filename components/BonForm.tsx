"use client";
import { startTransition, useActionState } from "react";
import { signerBon } from "@/lib/actions";
import { SignaturePad } from "./SignaturePad";
import { Icon } from "./Icon";

export function BonForm({ id, travaux }: { id: string; travaux?: string }) {
  const [etat, action, enCours] = useActionState(signerBon, undefined);
  return (
    <form
      className="grid"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="id" value={id} />
      <div className="field">
        <label htmlFor="travaux">Travaux réalisés</label>
        <textarea id="travaux" name="travaux" className="in" required defaultValue={travaux} placeholder="Remplacement du siphon, contrôle d'étanchéité, remise en eau…" />
      </div>
      <div className="field">
        <span className="lab">Signature du client</span>
        <SignaturePad />
        <span className="hint">Le client signe sur ton téléphone, après les travaux.</span>
      </div>
      <div className="rw g">
        <span className="ico"><Icon name="lock" /></span>
        <span className="tx">Sans prix ni TVA<small>Ce bon n'est pas une facture.</small></span>
      </div>
      {etat?.erreur && <p className="flash err" role="alert">{etat.erreur}</p>}
      <button className="pill" disabled={enCours} aria-busy={enCours}>
        {enCours ? "Envoi…" : "Valider et envoyer la copie"}
      </button>
      <p className="hint" style={{ textAlign: "center" }}>Le dossier passe en « Intervention faite ». Le client reçoit un lien vers la copie.</p>
    </form>
  );
}
