"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function SubmitButton({ children, className = "pill", enCours, disabled, name, value }: { children: ReactNode; className?: string; enCours?: string; disabled?: boolean; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending || disabled} aria-busy={pending} name={name} value={value}>
      {pending && enCours ? enCours : children}
    </button>
  );
}
