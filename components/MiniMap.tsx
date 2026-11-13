// Carte stylisée des lieux de rendez-vous. Sans fournisseur de cartographie pour l'instant :
// la position de chaque épingle est dérivée de l'adresse (stable, mais pas géographique).

export interface PointCarte {
  adresse: string;
  label?: string;
  sombre?: boolean;
  actif?: boolean;
  heure?: string;
}

const W = 340;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function MiniMap({ points, hauteur = 150, noms = false, trajet = true }: { points: PointCarte[]; hauteur?: number; noms?: boolean; trajet?: boolean }) {
  const H = hauteur;
  const pos: [number, number][] = [];
  for (const p of points) {
    const h = hash(p.adresse.toLowerCase());
    let x = 34 + (h % (W - 68 - (p.heure ? 60 : 0)));
    let y = 26 + ((h >>> 12) % (H - 52));
    for (let k = 0; k < 8 && pos.some(([a, b]) => Math.hypot(a - x, b - y) < 44); k++) {
      x = 34 + ((x + 57) % (W - 68));
      y = 26 + ((y + 37) % (H - 52));
    }
    pos.push([x, y]);
  }
  const route = pos.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const f = (k: number) => Math.round(k);
  return (
    <div className="mm">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Carte de ${points.length} lieu${points.length > 1 ? "x" : ""} de rendez-vous`}>
        <rect width={W} height={H} fill="#EEF0F2" />
        <rect x={f(W * 0.64)} y={f(H * 0.07)} width={f(W * 0.27)} height={f(H * 0.26)} rx="12" fill="#E1EBD2" />
        <path d={`M-10 ${f(H * 0.8)} C ${f(W * 0.25)} ${f(H * 0.62)}, ${f(W * 0.4)} ${f(H * 0.98)}, ${f(W * 0.7)} ${f(H * 0.78)} S ${W} ${f(H * 0.72)}, ${W + 10} ${f(H * 0.84)}`} stroke="#D2E3F2" strokeWidth={f(H * 0.1)} fill="none" />
        <g stroke="#FFFFFF" fill="none" strokeLinecap="round">
          <path d={`M-10 ${f(H * 0.33)} L ${W + 10} ${f(H * 0.22)}`} strokeWidth="11" />
          <path d={`M-10 ${f(H * 0.6)} L ${W + 10} ${f(H * 0.5)}`} strokeWidth="7" />
          <path d={`M${f(W * 0.3)} -10 L ${f(W * 0.37)} ${H + 10}`} strokeWidth="9" />
          <path d={`M${f(W * 0.7)} -10 L ${f(W * 0.62)} ${H + 10}`} strokeWidth="6" />
          <path d={`M${f(W * 0.08)} ${H + 10} L ${f(W * 0.55)} ${f(H * 0.3)}`} strokeWidth="4" />
        </g>
        {noms && (
          <g fontSize="9" fill="#9AA0AB" fontFamily="inherit">
            <text x={f(W * 0.05)} y={f(H * 0.3)} transform={`rotate(-6 ${f(W * 0.05)} ${f(H * 0.3)})`}>Boulevard Jean Monnet</text>
            <text x={f(W * 0.4)} y={f(H * 0.57)} transform={`rotate(-6 ${f(W * 0.4)} ${f(H * 0.57)})`}>Rue de la Paix</text>
            <text x={f(W * 0.05)} y={f(H * 0.9)}>La Loire</text>
          </g>
        )}
        {trajet && pos.length > 1 && <path d={route} fill="none" stroke="#202020" strokeWidth="2.5" strokeDasharray="6 6" strokeLinecap="round" />}
        {points.map((p, i) => {
          const [x, y] = pos[i];
          return (
            <g key={i}>
              {p.actif && <circle cx={x} cy={y} r="23" fill="#FFFFFF" fillOpacity=".75" />}
              <circle cx={x} cy={y} r="15" fill={p.sombre ? "#202020" : "#C9F158"} stroke="#202020" strokeWidth="2" />
              <text x={x} y={y + 4.5} textAnchor="middle" fontSize="13" fontWeight="700" fill={p.sombre ? "#FFFFFF" : "#202020"} fontFamily="inherit">
                {p.label ?? i + 1}
              </text>
              {p.heure && (
                <>
                  <rect x={x + 20} y={y - 12} width={10 + p.heure.length * 7.2} height="24" rx="12" fill="#FFFFFF" />
                  <text x={x + 25} y={y + 4.5} fontSize="12" fontWeight="600" fill="#202020" fontFamily="inherit">{p.heure}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function lienItineraire(adresse: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;
}
