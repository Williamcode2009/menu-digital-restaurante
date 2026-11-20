import '@fontsource/lobster/latin-400.css';
import '@fontsource-variable/fraunces/wght.css';
import '@fontsource-variable/dm-sans/wght.css';
import '../styles/main.css';
import './qr.css';

import lobsterUrl from '@fontsource/lobster/files/lobster-latin-400-normal.woff2?url';
import frauncesUrl from '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2?url';
import dmSansUrl from '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?url';

import { parseConfig } from '../data';
import { buildQrSvg, checkPublicUrl, type QrLayout, type QrTheme } from './brandedQr';

const form = document.querySelector<HTMLFormElement>('[data-qr-form]')!;
const urlInput = form.querySelector<HTMLInputElement>('#qr-url')!;
const errorEl = form.querySelector<HTMLElement>('[data-url-error]')!;
const hintEl = form.querySelector<HTMLElement>('[data-url-hint]')!;
const preview = document.querySelector<HTMLElement>('[data-preview]')!;
const downloads = form.querySelector<HTMLElement>('[data-downloads]')!;
const themeField = form.querySelector<HTMLElement>('[data-theme-field]')!;

let currentSvg = '';
let currentLayout: QrLayout = 'card';
let footer = 'Pide por WhatsApp · 988 957 4541';
let name = 'El Rincón Chiapaneco';
let slogan = 'Sabor tradicional en cada bocado';

/** Dirección del menú a partir de la página actual (quita "qr.html"). */
function detectMenuUrl(): string {
  const u = new URL('./', location.href);
  u.search = '';
  u.hash = '';
  return u.href;
}

async function toDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

let fontCssPromise: Promise<string> | null = null;
function embeddedFonts(): Promise<string> {
  fontCssPromise ??= Promise.all([toDataUrl(lobsterUrl), toDataUrl(frauncesUrl), toDataUrl(dmSansUrl)])
    .then(
      ([lob, fra, dm]) =>
        `@font-face{font-family:'Lobster';src:url(${lob}) format('woff2');font-weight:400}` +
        `@font-face{font-family:'Fraunces Variable';src:url(${fra}) format('woff2');font-weight:100 900}` +
        `@font-face{font-family:'DM Sans Variable';src:url(${dm}) format('woff2');font-weight:100 1000}`,
    )
    .catch(() => '');
  return fontCssPromise;
}

function download(blob: Blob, filename: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

async function svgToPng(svg: string, scale = 2): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('No se pudo dibujar el QR'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Pequeña espera para asegurar que las fuentes embebidas ya se pintaron.
    return await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG vacío'))), 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function generate() {
  const url = urlInput.value.trim();
  const problem = checkPublicUrl(url);
  errorEl.hidden = !problem;
  errorEl.textContent = problem ?? '';
  if (problem) {
    urlInput.focus();
    downloads.hidden = true;
    preview.replaceChildren(Object.assign(document.createElement('p'), { className: 'qr-empty', textContent: 'La vista previa aparecerá aquí.' }));
    return;
  }
  const data = new FormData(form);
  currentLayout = (data.get('layout') as QrLayout) ?? 'card';
  const theme = (data.get('theme') as QrTheme) ?? 'dark';
  currentSvg = buildQrSvg({ url, layout: currentLayout, theme, name, slogan, footer, fontCss: await embeddedFonts() });

  const img = new Image();
  img.alt = `Código QR que abre ${url}`;
  img.src = URL.createObjectURL(new Blob([currentSvg], { type: 'image/svg+xml' }));
  img.className = 'qr-image';
  preview.replaceChildren(img, Object.assign(document.createElement('p'), { className: 'qr-url', textContent: url }));
  downloads.hidden = false;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  generate();
});
form.addEventListener('change', (e) => {
  const t = e.target as HTMLInputElement;
  if (t.name === 'layout') themeField.hidden = t.value === 'code';
  if (currentSvg && t.type === 'radio') generate();
});

form.querySelectorAll<HTMLButtonElement>('[data-download]').forEach((btn) =>
  btn.addEventListener('click', async () => {
    if (!currentSvg) return;
    const base = currentLayout === 'card' ? 'qr-el-rincon-chiapaneco' : 'qr-codigo-el-rincon-chiapaneco';
    if (btn.dataset.download === 'svg') {
      download(new Blob([currentSvg], { type: 'image/svg+xml' }), `${base}.svg`);
    } else {
      btn.disabled = true;
      try {
        download(await svgToPng(currentSvg, currentLayout === 'card' ? 2 : 3), `${base}.png`);
      } finally {
        btn.disabled = false;
      }
    }
  }),
);

form.querySelector('[data-print]')!.addEventListener('click', () => window.print());

// Datos del restaurante desde config.json (nombre, eslogan, WhatsApp).
fetch(new URL('./data/config.json', location.href), { cache: 'no-cache' })
  .then((r) => (r.ok ? r.json() : {}))
  .then((raw) => {
    const c = parseConfig(raw);
    name = c.name;
    slogan = c.slogan;
    footer = `Pide por WhatsApp · ${c.whatsapp.display}`;
    if (!urlInput.value && c.siteUrl) urlInput.value = c.siteUrl;
  })
  .catch(() => {})
  .finally(() => {
    const detected = detectMenuUrl();
    if (!urlInput.value && !checkPublicUrl(detected)) {
      urlInput.value = detected;
      hintEl.textContent = 'Dirección detectada automáticamente desde la página publicada. Verifícala antes de imprimir.';
      generate();
    } else if (!urlInput.value) {
      hintEl.textContent =
        'Estás en una versión local o de prueba. Publica la página y abre esta herramienta desde la dirección pública, o escribe la dirección real aquí.';
    } else {
      generate();
    }
  });
