"use client";
import { useEffect, useRef, useState } from "react";

/** Signature au doigt. Écrit l'image PNG dans un champ caché `name`. */
export function SignaturePad({ name = "signature" }: { name?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  const [vide, setVide] = useState(true);
  const trace = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const c = canvas.current!;
    const ajuster = () => {
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      const ctx = c.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#202020";
      setVide(true);
      if (champ.current) champ.current.value = "";
    };
    ajuster();
    window.addEventListener("resize", ajuster);
    return () => window.removeEventListener("resize", ajuster);
  }, []);

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div className="sig">
      <canvas
        ref={canvas}
        aria-label="Zone de signature"
        onPointerDown={(e) => {
          canvas.current!.setPointerCapture(e.pointerId);
          trace.current = point(e);
        }}
        onPointerMove={(e) => {
          if (!trace.current) return;
          const ctx = canvas.current!.getContext("2d")!;
          const p = point(e);
          ctx.beginPath();
          ctx.moveTo(trace.current.x, trace.current.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          trace.current = p;
          if (vide) setVide(false);
        }}
        onPointerUp={() => {
          trace.current = null;
          if (!vide && champ.current) champ.current.value = canvas.current!.toDataURL("image/png");
        }}
        onPointerCancel={() => (trace.current = null)}
      />
      {vide && <span className="vide">Le client signe ici avec le doigt</span>}
      <button
        type="button"
        className="tag grey eff"
        onClick={() => {
          const c = canvas.current!;
          c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
          setVide(true);
          if (champ.current) champ.current.value = "";
        }}
      >
        Effacer
      </button>
      <input ref={champ} type="hidden" name={name} />
    </div>
  );
}
