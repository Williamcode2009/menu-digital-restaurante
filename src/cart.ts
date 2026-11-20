import type { CartLine, Menu, Product } from './types';

export const MAX_QTY = 99;

export interface ResolvedLine extends CartLine {
  key: string;
  product: Product;
  unitPrice: number;
  subtotal: number;
}

export interface CartStorage {
  load(): CartLine[];
  save(lines: CartLine[]): void;
}

export const lineKey = (productId: string, option: string | null) => `${productId}::${option ?? ''}`;

const clampQty = (n: number) => Math.max(0, Math.min(MAX_QTY, Math.floor(Number.isFinite(n) ? n : 0)));

/**
 * Carrito de pedidos. Guarda solo id + opción + cantidad; el precio siempre se toma
 * del menú vigente, así un cambio de precio en menu.json se refleja también en carritos guardados.
 */
export class Cart {
  private lines: CartLine[] = [];
  private listeners = new Set<() => void>();
  private byId: Map<string, Product>;

  constructor(
    menu: Menu,
    private storage?: CartStorage,
  ) {
    this.byId = new Map(menu.products.map((p) => [p.id, p]));
    const stored = storage?.load() ?? [];
    for (const l of stored) {
      if (l && typeof l.productId === 'string' && typeof l.qty === 'number') {
        this.add(l.productId, l.option ?? null, l.qty, false);
      }
    }
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private commit() {
    this.storage?.save(this.lines);
    this.listeners.forEach((fn) => fn());
  }

  /** Comprueba que el producto exista, esté disponible y que la opción sea válida. */
  isValid(productId: string, option: string | null): boolean {
    const p = this.byId.get(productId);
    if (!p || !p.available) return false;
    if (p.options) return option !== null && p.options.choices.includes(option);
    return option === null;
  }

  add(productId: string, option: string | null, qty = 1, notify = true): boolean {
    const q = clampQty(qty);
    if (q < 1 || !this.isValid(productId, option)) return false;
    const key = lineKey(productId, option);
    const existing = this.lines.find((l) => lineKey(l.productId, l.option) === key);
    if (existing) existing.qty = clampQty(existing.qty + q);
    else this.lines.push({ productId, option, qty: q });
    if (notify) this.commit();
    return true;
  }

  setQty(key: string, qty: number) {
    const q = clampQty(qty);
    const idx = this.lines.findIndex((l) => lineKey(l.productId, l.option) === key);
    if (idx < 0) return;
    if (q < 1) this.lines.splice(idx, 1);
    else this.lines[idx].qty = q;
    this.commit();
  }

  remove(key: string) {
    this.setQty(key, 0);
  }

  clear() {
    this.lines = [];
    this.commit();
  }

  qtyOf(productId: string): number {
    return this.lines.filter((l) => l.productId === productId).reduce((s, l) => s + l.qty, 0);
  }

  items(): ResolvedLine[] {
    return this.lines.map((l) => {
      const product = this.byId.get(l.productId)!;
      return {
        ...l,
        key: lineKey(l.productId, l.option),
        product,
        unitPrice: product.price,
        subtotal: product.price * l.qty,
      };
    });
  }

  count(): number {
    return this.lines.reduce((s, l) => s + l.qty, 0);
  }

  total(): number {
    return this.items().reduce((s, l) => s + l.subtotal, 0);
  }
}

/** Persistencia en localStorage; si el navegador la bloquea, el carrito funciona igual en memoria. */
export function localCartStorage(key = 'rincon-chiapaneco:cart:v1'): CartStorage {
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    save(lines) {
      try {
        localStorage.setItem(key, JSON.stringify(lines));
      } catch {
        /* almacenamiento no disponible: se ignora */
      }
    },
  };
}
