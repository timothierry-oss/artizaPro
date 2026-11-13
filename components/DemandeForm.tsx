"use client";
import { startTransition, useActionState, useState } from "react";
import { creerDemande } from "@/lib/actions";
import type { TypeMission } from "@/lib/domain/types";
import type { SlotVue } from "./SpeedDialForm";
import { Icon } from "./Icon";

export function DemandeForm({ slug, slots, durees }: { slug: string; slots: Record<TypeMission, SlotVue[]>; durees: Record<TypeMission, string> }) {
  const [etat, action, enCours] = useActionState(creerDemande, undefined);
  const [type, setType] = useState<TypeMission | null>(null);
  const [creneau, setCreneau] = useState("");
  const [apercus, setApercus] = useState<string[]>([]);

  return (
    <form
      className="grid"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="slug" value={slug} />
      <div className="typesel" role="radiogroup" aria-label="Type de demande">
        <label className="tsq lime">
          <input className="sr" type="radio" name="type" value="depannage" required checked={type === "depannage"} onChange={() => { setType("depannage"); setCreneau(""); }} />
          <span className="o"><Icon name="bolt" /></span>
          <span><b>Dépannage</b><small>Fuite, panne, urgence</small></span>
        </label>
        <label className="tsq dark">
          <input className="sr" type="radio" name="type" value="visite" checked={type === "visite"} onChange={() => { setType("visite"); setCreneau(""); }} />
          <span className="o"><Icon name="doc" /></span>
          <span><b>Visite pour devis</b><small>Travaux, remplacement</small></span>
        </label>
      </div>
      <div className="field">
        <label htmlFor="description">Le problème</label>
        <textarea id="description" name="description" className="in" required placeholder="Décrivez ce qui se passe, depuis quand, ce que vous avez déjà essayé…" />
      </div>
      <div className="field">
        <span className="lab">Photos (2 maximum)</span>
        <div className="photos">
          {apercus.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="Photo jointe" />
          ))}
          {apercus.length < 2 && (
            <label className="add">
              + Ajouter
              <input
                className="sr"
                type="file"
                name="photos"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const f = Array.from(e.currentTarget.files ?? []).slice(0, 2);
                  setApercus(f.map((x) => URL.createObjectURL(x)));
                }}
              />
            </label>
          )}
        </div>
      </div>
      <div className="field">
        <label htmlFor="nom">Votre nom</label>
        <input id="nom" name="nom" className="in" autoComplete="name" required />
      </div>
      <div className="field">
        <label htmlFor="telephone">Votre téléphone</label>
        <input id="telephone" name="telephone" className="in" type="tel" inputMode="tel" autoComplete="tel" required />
      </div>
      <div className="field">
        <label htmlFor="adresse">Adresse de l'intervention</label>
        <input id="adresse" name="adresse" className="in" autoComplete="street-address" required placeholder="Numéro, rue, code postal, ville" />
        <span className="hint">Vérifiez bien l'adresse : c'est là que l'artisan se déplacera.</span>
      </div>
      <div className="field">
        <span className="lab">{type ? `Créneau ${type === "visite" ? "de visite" : "de dépannage"} (${durees[type]})` : "Créneau"}</span>
        {type ? (
          <div className="slots" role="radiogroup" aria-label="Créneau">
            {slots[type].map((s) => (
              <label key={s.iso} className="slot">
                <input className="sr" type="radio" name="creneau" value={s.iso} checked={creneau === s.iso} onChange={() => setCreneau(s.iso)} />
                {s.label}
              </label>
            ))}
            <label className="slot">
              <input className="sr" type="radio" name="creneau" value="autre" checked={creneau === "autre"} onChange={() => setCreneau("autre")} />
              Autre moment
            </label>
          </div>
        ) : (
          <span className="hint">Choisissez d'abord le type de demande.</span>
        )}
        {creneau === "autre" && <input name="souhait" className="in" placeholder="Ex. : mardi après 17 h, ou rappelez-moi" />}
      </div>
      {etat?.erreur && <p className="flash err" role="alert">{etat.erreur}</p>}
      <button className="pill" disabled={enCours} aria-busy={enCours}>
        {enCours ? "Envoi…" : "Envoyer ma demande"}
      </button>
      <p className="hint">Vos informations sont transmises à l'artisan uniquement, pour traiter votre demande. Hébergement en Union européenne. L'artisan vous confirme le créneau par SMS.</p>
    </form>
  );
}
