import jsQR from 'jsqr';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { buildQrSvg, checkPublicUrl } from '../src/qr/brandedQr';

// URL de prueba: solo se usa para verificar que el código se lee; no se guarda ningún QR.
const TEST_URL = 'https://menu-prueba.netlify.app/';

async function decode(svg: string, width: number) {
  const { data, info } = await sharp(Buffer.from(svg), { density: 144 })
    .resize({ width })
    .flatten({ background: '#ffffff' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data ?? null;
}

describe('Código QR', () => {
  it('el código simple se lee correctamente (incluso pequeño)', async () => {
    const svg = buildQrSvg({ url: TEST_URL, layout: 'code' });
    expect(await decode(svg, 1000)).toBe(TEST_URL);
    expect(await decode(svg, 240)).toBe(TEST_URL);
  });

  it('la tarjeta con marca (oscura y clara) se lee correctamente', async () => {
    for (const theme of ['dark', 'light'] as const) {
      const svg = buildQrSvg({ url: TEST_URL, theme });
      expect(svg).toContain('El Rincón');
      expect(svg).toContain('CHIAPANECO');
      expect(await decode(svg, 1200)).toBe(TEST_URL);
    }
  });

  it('escapa el texto para que el SVG sea válido', () => {
    const svg = buildQrSvg({ url: TEST_URL, slogan: 'Tacos & <más>' });
    expect(svg).toContain('Tacos &amp; &lt;más&gt;');
  });

  it('solo acepta direcciones públicas con https', () => {
    expect(checkPublicUrl('https://elrinconchiapaneco.com/')).toBeNull();
    expect(checkPublicUrl('https://usuario.github.io/menu/')).toBeNull();
    expect(checkPublicUrl('http://elrinconchiapaneco.com/')).not.toBeNull();
    expect(checkPublicUrl('https://localhost:5173/')).not.toBeNull();
    expect(checkPublicUrl('https://192.168.1.10/')).not.toBeNull();
    expect(checkPublicUrl('https://www.example.com/')).not.toBeNull();
    expect(checkPublicUrl('menu')).not.toBeNull();
  });
});
