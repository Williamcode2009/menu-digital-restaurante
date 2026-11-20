/**
 * Regenera los íconos y la imagen para redes sociales a partir de los archivos de public/.
 *   npm run assets
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const pub = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const favicon = await readFile(resolve(pub, 'favicon.svg'));
for (const size of [180, 192, 512]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  // Ícono sobre fondo sólido (iOS no admite transparencia en el ícono de inicio).
  const icon = await sharp(favicon, { density: 72 * (size / 64) * 0.8 }).resize(Math.round(size * 0.8)).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: '#140e0b' } })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(resolve(pub, name));
  console.log(`✔ public/${name}`);
}

// Imagen para compartir en WhatsApp/Facebook (1200×630).
const W = 1200;
const H = 630;
const photo = await sharp(resolve(pub, 'images/productos/tacos.webp')).resize(W, H, { fit: 'cover' }).toBuffer();
const shade = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#140e0b" stop-opacity=".1"/><stop offset="1" stop-color="#140e0b" stop-opacity=".45"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/>
  </svg>`,
);
const emblem = await sharp(favicon, { density: 72 * (200 / 64) }).resize(200).png().toBuffer();
await sharp(photo)
  .composite([
    { input: shade, top: 0, left: 0 },
    { input: emblem, top: H - 240, left: W - 240 },
  ])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(resolve(pub, 'images/og-image.jpg'));
console.log('✔ public/images/og-image.jpg');
