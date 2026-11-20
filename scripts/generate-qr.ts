/**
 * Genera el QR definitivo desde la terminal:
 *
 *   npm run qr -- https://tu-dominio-real.com/
 *
 * Crea en la carpeta qr/:
 *   - qr-el-rincon-chiapaneco.svg / .png         (tarjeta con marca, fondo oscuro)
 *   - qr-el-rincon-chiapaneco-claro.svg / .png   (tarjeta con marca, fondo claro)
 *   - qr-codigo.svg / .png                       (solo el código, para imprenta)
 *
 * Si no pasas la URL, usa "siteUrl" de public/data/config.json.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parseConfig } from '../src/data.ts';
import { buildQrSvg, checkPublicUrl } from '../src/qr/brandedQr.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

async function fontCss(): Promise<string> {
  const fonts: [string, string, string][] = [
    ['Lobster', '@fontsource/lobster/files/lobster-latin-400-normal.woff2', '400'],
    ['Fraunces Variable', '@fontsource-variable/fraunces/files/fraunces-latin-wght-normal.woff2', '100 900'],
    ['DM Sans Variable', '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2', '100 1000'],
  ];
  const rules = await Promise.all(
    fonts.map(async ([family, path, weight]) => {
      const data = await readFile(require.resolve(path));
      return `@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2');font-weight:${weight}}`;
    }),
  );
  return rules.join('');
}

async function main() {
  const config = parseConfig(JSON.parse(await readFile(resolve(root, 'public/data/config.json'), 'utf8')));
  const url = (process.argv[2] || config.siteUrl || '').trim();
  if (!url) {
    console.error('Indica la dirección pública del menú:\n  npm run qr -- https://tu-dominio-real.com/');
    process.exit(1);
  }
  const problem = checkPublicUrl(url);
  if (problem) {
    console.error(`✖ ${problem}\n  Recibido: ${url}`);
    process.exit(1);
  }

  const outDir = process.env.QR_OUT ? resolve(process.env.QR_OUT) : resolve(root, 'qr');
  await mkdir(outDir, { recursive: true });
  const css = await fontCss();
  const common = {
    url,
    name: config.name,
    slogan: config.slogan,
    footer: `Pide por WhatsApp · ${config.whatsapp.display}`,
  };

  const variants = [
    { file: 'qr-el-rincon-chiapaneco', svg: buildQrSvg({ ...common, theme: 'dark', fontCss: css }), png: buildQrSvg({ ...common, theme: 'dark' }), width: 2400 },
    { file: 'qr-el-rincon-chiapaneco-claro', svg: buildQrSvg({ ...common, theme: 'light', fontCss: css }), png: buildQrSvg({ ...common, theme: 'light' }), width: 2400 },
    { file: 'qr-codigo', svg: buildQrSvg({ ...common, layout: 'code' }), png: buildQrSvg({ ...common, layout: 'code' }), width: 3000 },
  ];

  for (const v of variants) {
    await writeFile(resolve(outDir, `${v.file}.svg`), v.svg);
    // El rasterizador de Node no lee fuentes embebidas: el PNG usa las fuentes instaladas en el equipo.
    // Para un PNG con la tipografía exacta usa la página /qr.html del sitio publicado.
    await sharp(Buffer.from(v.png), { density: 72 * (v.width / 1200) })
      .resize({ width: v.width })
      .png()
      .toFile(resolve(outDir, `${v.file}.png`));
    console.log(`✔ qr/${v.file}.svg  ·  qr/${v.file}.png`);
  }
  console.log(`\nQR generado para: ${url}\nEscanéalo con tu teléfono antes de imprimir.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
