import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Cart, type CartStorage, lineKey, MAX_QTY } from '../src/cart';
import { parseMenu } from '../src/data';
import type { CartLine } from '../src/types';

const menu = parseMenu(JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data/menu.json'), 'utf8')));

function memoryStorage(initial: CartLine[] = []): CartStorage & { data: CartLine[] } {
  return {
    data: initial,
    load() {
      return structuredClone(this.data);
    },
    save(lines) {
      this.data = structuredClone(lines);
    },
  };
}

describe('Carrito', () => {
  it('calcula el total con productos, cantidades y rellenos', () => {
    const cart = new Cart(menu);
    cart.add('quekas', 'Pastor', 2); // 80
    cart.add('quekas', 'Chorizo', 1); // 40
    cart.add('sopes', 'Asado', 3); // 90
    cart.add('tacos-maiz', null, 5); // 100
    cart.add('tacos-harina', null, 2); // 50
    cart.add('huaraches', null, 1); // 150
    expect(cart.total()).toBe(510);
    expect(cart.count()).toBe(14);
    expect(cart.items()).toHaveLength(6);
  });

  it('suma la cantidad si el mismo producto y relleno ya está en el pedido', () => {
    const cart = new Cart(menu);
    cart.add('quekas', 'Pastor');
    cart.add('quekas', 'Pastor', 2);
    expect(cart.items()).toHaveLength(1);
    expect(cart.items()[0].qty).toBe(3);
    expect(cart.qtyOf('quekas')).toBe(3);
  });

  it('exige relleno válido en Quekas y Sopes, y no lo acepta en otros productos', () => {
    const cart = new Cart(menu);
    expect(cart.add('quekas', null)).toBe(false);
    expect(cart.add('sopes', 'Jamón')).toBe(false);
    expect(cart.add('tortas', 'Pastor')).toBe(false);
    expect(cart.add('producto-inexistente', null)).toBe(false);
    expect(cart.count()).toBe(0);
  });

  it('cambia cantidades, elimina y vacía', () => {
    const cart = new Cart(menu);
    cart.add('tortas', null, 2);
    cart.add('nachos', null, 1);
    const key = lineKey('tortas', null);
    cart.setQty(key, 4);
    expect(cart.total()).toBe(4 * 40 + 120);
    cart.setQty(key, 0);
    expect(cart.items().map((l) => l.productId)).toEqual(['nachos']);
    cart.remove(lineKey('nachos', null));
    expect(cart.total()).toBe(0);
    cart.add('burritos', null);
    cart.clear();
    expect(cart.count()).toBe(0);
  });

  it(`limita la cantidad entre 1 y ${MAX_QTY}`, () => {
    const cart = new Cart(menu);
    cart.add('tortas-especiales', null, 500);
    expect(cart.count()).toBe(MAX_QTY);
    expect(cart.add('tortas', null, 0)).toBe(false);
  });

  it('no permite agregar productos agotados', () => {
    const m = structuredClone(menu);
    m.products.find((p) => p.id === 'nachos')!.available = false;
    const cart = new Cart(m);
    expect(cart.add('nachos', null)).toBe(false);
  });

  it('guarda y recupera el pedido; usa siempre el precio actual del menú', () => {
    const storage = memoryStorage();
    const a = new Cart(menu, storage);
    a.add('gringas', null, 2);
    a.add('sopes', 'Champiñón', 1);
    expect(storage.data).toHaveLength(2);

    const changed = structuredClone(menu);
    changed.products.find((p) => p.id === 'gringas')!.price = 35;
    const b = new Cart(changed, storage);
    expect(b.total()).toBe(2 * 35 + 30);
  });

  it('descarta datos guardados inválidos o de productos que ya no existen', () => {
    const storage = memoryStorage([
      { productId: 'ya-no-existe', option: null, qty: 2 },
      { productId: 'quekas', option: 'Inventado', qty: 1 },
      { productId: 'mestizas', option: null, qty: 2 },
      null as unknown as CartLine,
    ]);
    const cart = new Cart(menu, storage);
    expect(cart.items().map((l) => [l.productId, l.qty])).toEqual([['mestizas', 2]]);
  });

  it('notifica a los suscriptores en cada cambio', () => {
    const cart = new Cart(menu);
    let calls = 0;
    cart.subscribe(() => calls++);
    cart.add('tortas', null);
    cart.setQty(lineKey('tortas', null), 3);
    cart.clear();
    expect(calls).toBe(3);
  });
});
