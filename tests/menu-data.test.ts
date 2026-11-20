import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseConfig, parseMenu } from '../src/data';

const root = resolve(import.meta.dirname, '..');
const menu = parseMenu(JSON.parse(readFileSync(resolve(root, 'public/data/menu.json'), 'utf8')));
const config = parseConfig(JSON.parse(readFileSync(resolve(root, 'public/data/config.json'), 'utf8')));

describe('menu.json coincide exactamente con el menú del restaurante', () => {
  it('tiene las categorías en orden', () => {
    expect(menu.categories.map((c) => c.name)).toEqual(['Antojitos', 'Tacos', 'Tortas y más']);
  });

  it('tiene exactamente estos productos, categorías y precios', () => {
    const byCat = (id: string) =>
      menu.products.filter((p) => p.category === id).map((p) => [p.name, p.price]);
    expect(byCat('antojitos')).toEqual([
      ['Quekas', 40],
      ['Sopes', 30],
      ['Gringas', 30],
      ['Mestizas', 30],
    ]);
    expect(byCat('tacos')).toEqual([
      ['Tacos de maíz', 20],
      ['Tacos de harina', 25],
    ]);
    expect(byCat('tortas-y-mas')).toEqual([
      ['Tortas', 40],
      ['Tortas especiales', 50],
      ['Burritos', 120],
      ['Nachos', 120],
      ['Huaraches', 150],
    ]);
    expect(menu.products).toHaveLength(11);
  });

  it('solo Quekas y Sopes piden relleno, con los 4 rellenos', () => {
    const withOptions = menu.products.filter((p) => p.options);
    expect(withOptions.map((p) => p.name)).toEqual(['Quekas', 'Sopes']);
    for (const p of withOptions) {
      expect(p.options!.label).toBe('Relleno');
      expect(p.options!.choices).toEqual(['Pastor', 'Asado', 'Champiñón', 'Chorizo']);
    }
  });

  it('todas las imágenes indicadas existen', () => {
    for (const p of menu.products) {
      for (const img of [p.image, p.imageSmall].filter(Boolean) as string[]) {
        expect(() => readFileSync(resolve(root, 'public', img)), img).not.toThrow();
      }
    }
  });

  it('config.json usa el WhatsApp real y no inventa dirección ni horario', () => {
    expect(config.whatsapp.number).toBe('529889574541');
    expect(config.name).toBe('El Rincón Chiapaneco');
    expect(config.slogan).toBe('Sabor tradicional en cada bocado');
  });
});

describe('validación de datos', () => {
  const base = { categories: [{ id: 'a', name: 'A' }], products: [] as unknown[] };

  it('rechaza precios inválidos', () => {
    expect(() => parseMenu({ ...base, products: [{ id: 'x', name: 'X', category: 'a', price: '40' }] })).toThrow(/precio/);
    expect(() => parseMenu({ ...base, products: [{ id: 'x', name: 'X', category: 'a', price: -1 }] })).toThrow(/precio/);
  });

  it('rechaza categorías inexistentes e ids repetidos', () => {
    expect(() => parseMenu({ ...base, products: [{ id: 'x', name: 'X', category: 'zz', price: 1 }] })).toThrow(/categoría/);
    expect(() =>
      parseMenu({
        ...base,
        products: [
          { id: 'x', name: 'X', category: 'a', price: 1 },
          { id: 'x', name: 'Y', category: 'a', price: 1 },
        ],
      }),
    ).toThrow(/repetido/);
  });

  it('available: false marca el producto como agotado; si falta, está disponible', () => {
    const m = parseMenu({
      ...base,
      products: [
        { id: 'x', name: 'X', category: 'a', price: 1, available: false },
        { id: 'y', name: 'Y', category: 'a', price: 1 },
      ],
    });
    expect(m.products.map((p) => p.available)).toEqual([false, true]);
  });

  it('config vacía no inventa horarios ni dirección', () => {
    const c = parseConfig({});
    expect(c.hours).toEqual([]);
    expect(c.address).toEqual({ line1: '', line2: '', references: '', mapsUrl: '' });
  });
});
