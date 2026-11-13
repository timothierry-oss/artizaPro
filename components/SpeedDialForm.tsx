"use client";
import { startTransition, useActionState, useState } from "react";
import { creerSpeedDial } from "@/lib/actions";
import type { TypeMission } from "@/lib/domain/types";
import { Icon } from "./Icon";

export interface SlotVue {
  iso: string;
  label: string;
  horsPlage: boolean;
}
export type OptionCreneau = "aujourdhui" | "demain_matin" | "demain_aprem";
export type Suggestions = Record<TypeMission, Record<OptionCreneau, SlotVue[]>>;

const OPTIONS: { cle: OptionCreneau; titre: string; icone: string }[] = [
  { cle: "aujourdhui", titre: "Aujourd'hui", icone: "bolt" },
  { cle: "demain_aprem", titre: "Demain après-midi", icone: "clock" },
  { cle: "demain_matin", titre: "Demain matin", icone: "clock" },
];

export function SpeedDialForm({ suggestions, durees, demainLabel }: { suggestions: Suggestions; durees: Record<TypeMission, string>; demainLabel: string }) {
  const [etat, action, enCours] = useActionState(creerSpeedDial, undefined);
  const [type, setType] = useState<TypeMission>("depannage");
  const [option, setOption] = useState<OptionCreneau | "calendrier" | "plus_tard">("aujourdhui");
  const [choix, setChoix] = useState<string>("");
  const slots = option === "calendrier" || option === "plus_tard" ? [] : suggestions[type][option];
  const debut = choix && slots.some((s) => s.iso === choix) ? choix : slots[0]?.iso ?? "";
  const planifie = option === "calendrier" || (option !== "plus_tard" && debut);
  const hp = slots.find((s) => s.iso === debut)?.horsPlage;

  return (
    <form
      className="grid"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <div className="sect">Type de mission</div>
      <div className="typesel" role="radiogroup" aria-label="Type de mission">
        {(["depannage", "visite"] as TypeMission[]).map((t) => (
          <label key={t} className={`tsq ${t === "depannage" ? "lime" : "dark"}`}>
            <input className="sr" type="radio" name="type" value={t} checked={type === t} onChange={() => { setType(t); setChoix(""); }} />
            <span className="o"><Icon name={t === "depannage" ? "bolt" : "doc"} /></span>
            <span><b>{t === "depannage" ? "Dépannage" : "Visite devis"}</b><small>{durees[t]} par défaut</small></span>
          </label>
        ))}
      </div>
      <div className="field">
        <label htmlFor="telephone">Numéro du client</label>
        <input id="telephone" name="telephone" className="in" type="tel" inputMode="tel" autoComplete="off" placeholder="06 12 34 56 78" required />
      </div>
      <div className="field">
        <label htmlFor="nom">Nom</label>
        <input id="nom" name="nom" className="in" autoComplete="off" placeholder="Mme Bernard" required />
      </div>
      <div className="field">
        <label htmlFor="adresse">Adresse</label>
        <input id="adresse" name="adresse" className="in" autoComplete="off" placeholder="12 rue de la Paix, Rezé" required />
      </div>
      <div className="field">
        <label htmlFor="description">Problème (facultatif)</label>
        <textarea id="description" name="description" className="in" placeholder="Fuite sous évier…" rows={2} />
      </div>

      <div className="sect">Créneau</div>
      <div className="rows" role="radiogroup" aria-label="Créneau">
        {OPTIONS.map((o) => {
          const s = suggestions[type][o.cle];
          const titre = o.cle === "aujourdhui" ? o.titre : o.titre.replace("Demain", demainLabel);
          return (
            <label key={o.cle} className="rw">
              <input className="sr" type="radio" name="option" checked={option === o.cle} onChange={() => { setOption(o.cle); setChoix(""); }} />
              <span className="ico"><Icon name={o.icone} /></span>
              <span className="tx">
                {titre}
                <small>
                  {s.length ? s.map((x) => x.label).join(" · ") : "Aucun créneau libre"}
                  {s.length > 0 && s.every((x) => x.horsPlage) ? " · hors plage" : ""}
                </small>
              </span>
              {option === o.cle && debut ? <span className="tag lime">{slots.find((x) => x.iso === debut)?.label}</span> : <span className="chev">›</span>}
            </label>
          );
        })}
        <label className="rw">
          <input className="sr" type="radio" name="option" checked={option === "calendrier"} onChange={() => setOption("calendrier")} />
          <span className="ico"><Icon name="cal" /></span>
          <span className="tx">Calendrier<small>Choisir une date et une heure</small></span>
          <span className="chev">›</span>
        </label>
        <label className="rw">
          <input className="sr" type="radio" name="option" checked={option === "plus_tard"} onChange={() => setOption("plus_tard")} />
          <span className="ico"><Icon name="folder" /></span>
          <span className="tx">Plus tard<small>Le dossier reste « À traiter »</small></span>
          <span className="chev">›</span>
        </label>
      </div>
      {slots.length > 1 && (
        <div className="slots" role="radiogroup" aria-label="Heure">
          {slots.map((s) => (
            <label key={s.iso} className={`slot${s.horsPlage ? " hp" : ""}`}>
              <input className="sr" type="radio" name="heure" checked={debut === s.iso} onChange={() => setChoix(s.iso)} />
              {s.label}
            </label>
          ))}
        </div>
      )}
      {option === "calendrier" && (
        <div className="field">
          <label htmlFor="quand">Date et heure</label>
          <input id="quand" name="quand" type="datetime-local" className="in" required step={300} />
        </div>
      )}
      {option !== "calendrier" && option !== "plus_tard" && <input type="hidden" name="debut" value={debut} />}
      {hp && <p className="hint">Ce créneau est hors de tes plages pour ce type de mission. Tu peux le garder.</p>}
      {etat?.erreur && <p className="flash err" role="alert">{etat.erreur}</p>}
      <button className="pill" disabled={enCours} aria-busy={enCours}>
        {enCours ? "Création…" : planifie ? "Créer le dossier et planifier" : "Créer le dossier"}
      </button>
      <p className="hint" style={{ textAlign: "center" }}>Le SMS de confirmation est généré après cette validation.</p>
    </form>
  );
}
