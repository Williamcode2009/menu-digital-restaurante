import type { Cart } from '../cart';
import { h } from '../dom';
import type { Menu, Product } from '../types';
import { productCard, type ProductCardHandle } from './productCard';

interface MenuOptions {
  root: HTMLElement;
  nav: HTMLElement;
  menu: Menu;
  cart: Cart;
  openOptions: (product: Product) => void;
  onAdded: (product: Product, option: string | null) => void;
}

/** Pinta las categorías, sus productos y la barra de categorías con resaltado según el scroll. */
export function renderMenu({ root, nav, menu, cart, openOptions, onAdded }: MenuOptions) {
  const cards: ProductCardHandle[] = [];
  const sections: HTMLElement[] = [];
  const navLinks = new Map<string, HTMLAnchorElement>();

  for (const cat of menu.categories) {
    const products = menu.products.filter((p) => p.category === cat.id);
    if (!products.length) continue;

    const link = h('a', { class: 'category-chip', href: `#cat-${cat.id}` }, cat.name, h('span', { class: 'category-chip-count' }, products.length));
    navLinks.set(cat.id, link);

    const grid = h('div', { class: 'product-grid' });
    for (const p of products) {
      const card = productCard(p, { cart, openOptions, onAdded });
      cards.push(card);
      grid.append(card.el);
    }

    const section = h(
      'section',
      { class: 'category', id: `cat-${cat.id}`, 'aria-labelledby': `cat-title-${cat.id}`, 'data-category': cat.id },
      h(
        'header',
        { class: 'category-head reveal' },
        h('h3', { class: 'plaque', id: `cat-title-${cat.id}` }, h('span', { class: 'plaque-flourish', 'aria-hidden': 'true' }), cat.name, h('span', { class: 'plaque-flourish is-right', 'aria-hidden': 'true' })),
        cat.description ? h('p', { class: 'category-desc' }, cat.description) : null,
      ),
      grid,
    );
    sections.push(section);
  }

  nav.replaceChildren(...navLinks.values());
  root.replaceChildren(...sections);

  // Resalta en la barra la categoría visible.
  const setActive = (id: string) => {
    navLinks.forEach((a, key) => {
      const active = key === id;
      a.classList.toggle('is-active', active);
      if (active) {
        a.setAttribute('aria-current', 'true');
        // Mantiene visible el chip activo en pantallas pequeñas, sin mover la página.
        const parent = a.parentElement!;
        const left = a.offsetLeft - parent.clientWidth / 2 + a.clientWidth / 2;
        parent.scrollTo({ left, behavior: 'smooth' });
      } else a.removeAttribute('aria-current');
    });
  };
  if ('IntersectionObserver' in window) {
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set((e.target as HTMLElement).dataset.category!, e.isIntersecting ? e.intersectionRatio : 0);
        let best = '';
        let bestRatio = 0;
        visible.forEach((r, id) => {
          if (r > bestRatio) [best, bestRatio] = [id, r];
        });
        if (best) setActive(best);
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.01, 0.5, 1] },
    );
    sections.forEach((s) => io.observe(s));
  }
  if (menu.categories[0]) setActive(menu.categories[0].id);

  return {
    refresh: () => cards.forEach((c) => c.refresh()),
  };
}
