// Générateur de PDF minimal (une page A4, Helvetica), pour les devis d'exemple de la démo.

export interface LignePdf {
  texte: string;
  taille?: number;
  gras?: boolean;
  /** Espace avant la ligne, en points. */
  avant?: number;
}

// Caractères hors Latin-1 présents dans WinAnsiEncoding.
const WIN_ANSI: Record<string, string> = { "€": "\x80", "–": "\x96", "—": "\x97", "’": "\x92", "œ": "\x9c", "Œ": "\x8c", "…": "\x85" };

function encoder(s: string): string {
  return s
    .replace(/[€–—’œŒ…]/g, (c) => WIN_ANSI[c])
    .replace(/[^\x00-\xff]/g, "?")
    .replace(/([\\()])/g, "\\$1");
}

export function pdfSimple(lignes: LignePdf[]): Uint8Array {
  let y = 790;
  const ops: string[] = [];
  for (const l of lignes) {
    const taille = l.taille ?? 11;
    y -= (l.avant ?? 0) + taille * 1.45;
    ops.push(`BT /${l.gras ? "F2" : "F1"} ${taille} Tf 56 ${y.toFixed(1)} Td (${encoder(l.texte)}) Tj ET`);
  }
  const flux = ops.join("\n");
  const objets = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`,
  ];
  let sortie = "%PDF-1.4\n";
  const positions: number[] = [];
  objets.forEach((o, i) => {
    positions.push(sortie.length);
    sortie += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = sortie.length;
  sortie += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const p of positions) sortie += `${String(p).padStart(10, "0")} 00000 n \n`;
  sortie += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const octets = new Uint8Array(sortie.length);
  for (let i = 0; i < sortie.length; i++) octets[i] = sortie.charCodeAt(i) & 0xff;
  return octets;
}
