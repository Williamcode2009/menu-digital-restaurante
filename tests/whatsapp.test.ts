import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Cart } from '../src/cart';
import { parseMenu } from '../src/data';
import { buildOrderMessage, whatsappUrl } from '../src/whatsapp';

const menu = parseMenu(JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data/menu.json'), 'utf8')));
const config = { name: 'El Rincón Chiapaneco' };

describe('Mensaje de WhatsApp', () => {
  it('incluye productos, rellenos, cantidades, subtotales y total', () => {
    const cart = new Cart(menu);
    cart.add('quekas', 'Pastor', 2);
    cart.add('tacos-maiz', null, 4);
    cart.add('burritos', null, 1);
    const msg = buildOrderMessage(config, cart.items(), cart.total(), { name: '  Ana  ', notes: 'Para llevar' });
    expect(msg).toBe(
      [
        '¡Hola, El Rincón Chiapaneco! Quiero hacer el siguiente pedido:',
        '',
        '• 2 x Quekas (Relleno: Pastor) — $80',
        '• 4 x Tacos de maíz — $80',
        '• 1 x Burritos — $120',
        '',
        '*Total: $280 MXN*',
        '',
        'Nombre: Ana',
        'Notas: Para llevar',
        '',
        'Quedo atento(a) a la confirmación. ¡Gracias!',
      ].join('\n'),
    );
  });

  it('omite nombre y notas vacíos', () => {
    const cart = new Cart(menu);
    cart.add('huaraches', null, 1);
    const msg = buildOrderMessage(config, cart.items(), cart.total());
    expect(msg).not.toContain('Nombre:');
    expect(msg).not.toContain('Notas:');
    expect(msg).toContain('*Total: $150 MXN*');
  });

  it('genera el enlace wa.me al número del restaurante con el texto codificado', () => {
    const url = whatsappUrl('529889574541', 'Hola & adiós #1\n• 2 x Sopes (Relleno: Champiñón)');
    expect(url.startsWith('https://wa.me/529889574541?text=')).toBe(true);
    const text = new URL(url).searchParams.get('text');
    expect(text).toBe('Hola & adiós #1\n• 2 x Sopes (Relleno: Champiñón)');
    expect(whatsappUrl('+52 988 957 4541')).toBe('https://wa.me/529889574541');
  });

  it('da formato con separador de miles a montos grandes', () => {
    const cart = new Cart(menu);
    cart.add('huaraches', null, 10);
    expect(buildOrderMessage(config, cart.items(), cart.total())).toContain('$1,500');
  });
});
