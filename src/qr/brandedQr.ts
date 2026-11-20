import QRCode from 'qrcode';

/**
 * Generador del QR con la marca de El Rincón Chiapaneco.
 * Funciona igual en el navegador (página qr.html) y en Node (npm run qr).
 */

export type QrTheme = 'dark' | 'light';
export type QrLayout = 'card' | 'code';

export interface QrOptions {
  url: string;
  theme?: QrTheme;
  layout?: QrLayout;
  name?: string;
  slogan?: string;
  cta?: string;
  footer?: string;
  /** Reglas @font-face (con fuentes en base64) para que el SVG se vea igual en cualquier equipo. */
  fontCss?: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Valida que la URL sea pública y real (https y no localhost). Devuelve un mensaje de error o null. */
export function checkPublicUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return 'La dirección no es válida. Debe empezar con https://';
  }
  if (u.protocol !== 'https:') return 'Usa la dirección pública con https:// (la que ves al abrir la página publicada).';
  const host = u.hostname;
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === '0.0.0.0' ||
    host.endsWith('example.com')
  )
    return 'Esa dirección no es pública. Publica la página primero y usa su dirección real.';
  return null;
}

interface Matrix {
  size: number;
  dark: (x: number, y: number) => boolean;
}

function matrix(url: string): Matrix {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const { size, data } = qr.modules;
  return { size, dark: (x, y) => data[y * size + x] === 1 };
}

const inFinder = (x: number, y: number, size: number) =>
  (x < 7 && y < 7) || (x >= size - 7 && y < 7) || (x < 7 && y >= size - 7);

/** Dibuja el código (módulos + marcadores redondeados + emblema) dentro de un cuadro de `px` unidades. */
function qrGroup(url: string, x0: number, y0: number, px: number, ink: string, accent: string): string {
  const m = matrix(url);
  const quiet = 4; // margen de silencio estándar
  const total = m.size + quiet * 2;
  const u = px / total;
  const ox = x0 + quiet * u;
  const oy = y0 + quiet * u;

  // Zona central reservada para el emblema (≈ 4 % del área; la corrección "H" recupera hasta el 30 %).
  const emblemModules = Math.round(m.size * 0.2) | 1;
  const eStart = (m.size - emblemModules) / 2;
  const inEmblem = (x: number, y: number) =>
    x >= eStart - 0.5 && x < eStart + emblemModules + 0.5 && y >= eStart - 0.5 && y < eStart + emblemModules + 0.5;

  let d = '';
  for (let y = 0; y < m.size; y++) {
    for (let x = 0; x < m.size; x++) {
      if (!m.dark(x, y) || inFinder(x, y, m.size) || inEmblem(x, y)) continue;
      d += `M${(ox + x * u).toFixed(2)} ${(oy + y * u).toFixed(2)}h${u.toFixed(2)}v${u.toFixed(2)}h${(-u).toFixed(2)}z`;
    }
  }

  const finder = (fx: number, fy: number) => {
    const X = ox + fx * u;
    const Y = oy + fy * u;
    return (
      `<rect x="${X + u / 2}" y="${Y + u / 2}" width="${6 * u}" height="${6 * u}" rx="${1.8 * u}" fill="none" stroke="${accent}" stroke-width="${u}"/>` +
      `<rect x="${X + 2 * u}" y="${Y + 2 * u}" width="${3 * u}" height="${3 * u}" rx="${0.9 * u}" fill="${ink}"/>`
    );
  };

  const ec = ox + (m.size / 2) * u;
  const ecy = oy + (m.size / 2) * u;
  const er = (emblemModules / 2) * u;
  const petals = [0, 72, 144, 216, 288]
    .map((a) => `<ellipse rx="${er * 0.22}" ry="${er * 0.42}" cy="${-er * 0.36}" transform="rotate(${a})" fill="#d7261e"/>`)
    .join('');
  const emblem =
    `<g transform="translate(${ec} ${ecy})">` +
    `<circle r="${er}" fill="#1a120e"/>` +
    `<circle r="${er * 0.86}" fill="none" stroke="#f6b81a" stroke-width="${er * 0.07}" stroke-dasharray="${er * 0.14} ${er * 0.1}"/>` +
    petals +
    `<circle r="${er * 0.22}" fill="#f6b81a"/><circle r="${er * 0.1}" fill="#ef7d1a"/>` +
    `</g>`;

  return (
    `<rect x="${x0}" y="${y0}" width="${px}" height="${px}" rx="${u * 2.5}" fill="#ffffff"/>` +
    `<path d="${d}" fill="${ink}" shape-rendering="crispEdges"/>` +
    finder(0, 0) +
    finder(m.size - 7, 0) +
    finder(0, m.size - 7) +
    emblem
  );
}

const textilePattern = (id: string) => `
  <pattern id="${id}" width="64" height="28" patternUnits="userSpaceOnUse">
    <rect width="64" height="28" fill="#7a1410"/>
    <rect width="64" height="3" fill="#f6b81a"/><rect y="25" width="64" height="3" fill="#f6b81a"/>
    <path d="M0 14 L8 6 L16 14 L8 22 Z M32 14 L40 6 L48 14 L40 22 Z" fill="#ef7d1a"/>
    <path d="M4 14 L8 10 L12 14 L8 18 Z M36 14 L40 10 L44 14 L40 18 Z" fill="#fbefd9"/>
    <path d="M16 14 L24 6 L32 14 L24 22 Z M48 14 L56 6 L64 14 L56 22 Z" fill="#2f8f3a"/>
    <path d="M20 14 L24 10 L28 14 L24 18 Z M52 14 L56 10 L60 14 L56 18 Z" fill="#f6b81a"/>
  </pattern>`;

/** Devuelve el SVG completo (texto) listo para descargar o imprimir. */
export function buildQrSvg(opts: QrOptions): string {
  const {
    url,
    theme = 'dark',
    layout = 'card',
    name = 'El Rincón Chiapaneco',
    slogan = 'Sabor tradicional en cada bocado',
    cta = 'Escanea y mira nuestro menú',
    footer = 'Pide por WhatsApp · 988 957 4541',
    fontCss = '',
  } = opts;
  const ink = '#1a120e';
  const accent = '#7a1410';

  if (layout === 'code') {
    const S = 1000;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">` +
      `<title>${esc(`Código QR — ${name}`)}</title>` +
      qrGroup(url, 0, 0, S, ink, accent) +
      `</svg>`
    );
  }

  const W = 1200;
  const H = 1650;
  const dark = theme === 'dark';
  const bg = dark ? '#140e0b' : '#fbefd9';
  const textMain = dark ? '#fbefd9' : '#1a120e';
  const textMuted = dark ? '#cdb89c' : '#5a4636';

  // Divide el nombre: "El Rincón" en letra manuscrita y "CHIAPANECO" en grande.
  const parts = name.split(' ');
  const scriptPart = parts.length > 2 ? parts.slice(0, -1).join(' ') : parts[0];
  const mainPart = parts.length > 1 ? parts[parts.length - 1] : '';

  const qrSize = 760;
  const qrX = (W - qrSize) / 2;
  const qrY = 520;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<title>${esc(`Código QR — ${name}`)}</title>
<defs>
  ${textilePattern('tx')}
  <linearGradient id="title" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0.1" stop-color="#ffcf3f"/><stop offset="0.55" stop-color="#ef7d1a"/><stop offset="0.95" stop-color="#d7261e"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
    <stop offset="0" stop-color="#ef7d1a" stop-opacity="${dark ? 0.35 : 0.25}"/><stop offset="1" stop-color="#ef7d1a" stop-opacity="0"/>
  </radialGradient>
  <style>
    ${fontCss}
    .script{font-family:'Lobster','Brush Script MT',cursive}
    .display{font-family:'Fraunces Variable','Fraunces','Georgia',serif;font-weight:900}
    .body{font-family:'DM Sans Variable','DM Sans','Helvetica Neue',Arial,sans-serif}
  </style>
</defs>
<rect width="${W}" height="${H}" fill="${bg}"/>
<rect width="${W}" height="56" fill="url(#tx)"/>
<rect y="${H - 56}" width="${W}" height="56" fill="url(#tx)"/>
<circle cx="${W / 2}" cy="${qrY + qrSize / 2}" r="560" fill="url(#glow)"/>
<text x="${W / 2}" y="210" text-anchor="middle" class="script" font-size="112" fill="#f6b81a"${dark ? ' stroke="#7a1410" stroke-width="2"' : ''}>${esc(scriptPart)}</text>
<text x="${W / 2}" y="345" text-anchor="middle" class="display" font-size="${mainPart.length > 10 ? 118 : 136}" letter-spacing="2" fill="url(#title)"${dark ? '' : ' stroke="#7a1410" stroke-width="1.5"'}>${esc(mainPart.toUpperCase())}</text>
<text x="${W / 2}" y="430" text-anchor="middle" class="display" font-style="italic" font-weight="500" font-size="46" fill="${textMain}" style="font-weight:500">${esc(slogan)}</text>
<rect x="${qrX - 18}" y="${qrY - 18}" width="${qrSize + 36}" height="${qrSize + 36}" rx="44" fill="#f6b81a"/>
${qrGroup(url, qrX, qrY, qrSize, ink, accent)}
<text x="${W / 2}" y="${qrY + qrSize + 120}" text-anchor="middle" class="body" font-weight="800" font-size="58" fill="${textMain}">${esc(cta)}</text>
<text x="${W / 2}" y="${qrY + qrSize + 190}" text-anchor="middle" class="body" font-weight="500" font-size="40" fill="${textMuted}">${esc(footer)}</text>
</svg>`;
}
