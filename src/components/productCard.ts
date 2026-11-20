import { type Cart, lineKey } from '../cart';
import { h, icon } from '../dom';
import { money } from '../format';
import type { Product } from '../types';
import { productMedia } from './productMedia';
import { stepper, type StepperElement } from './stepper';

export interface CardContext {
  cart: Cart;
  openOptions: (product: Product) => void;
  onAdded: (product: Product, option: string | null) => void;
}

export interface ProductCardHandle {
  el: HTMLElement;
  refresh: () => void;
}

export function productCard(product: Product, ctx: CardContext): ProductCardHandle {
  const { cart } = ctx;
  const actions = h('div', { class: 'card-actions' });
  const media = productMedia(product, 'card');
  const priceTag = h('span', { class: 'card-price', 'aria-label': `Precio: ${money(product.price)}` }, money(product.price));
  media.append(priceTag);
  if (!product.available) media.append(h('span', { class: 'card-soldout' }, 'Agotado'));

  const titleId = `t-${product.id}`;
  const el = h(
    'article',
    {
      class: `product-card reveal${product.available ? '' : ' is-unavailable'}`,
      id: `producto-${product.id}`,
      'aria-labelledby': titleId,
    },
    media,
    h(
      'div',
      { class: 'card-body' },
      h('h3', { class: 'card-title', id: titleId }, product.name),
      product.description ? h('p', { class: 'card-desc' }, product.description) : null,
      product.options
        ? h(
            'ul',
            { class: 'chip-list', 'aria-label': `${product.options.label} disponibles` },
            product.options.choices.map((c) => h('li', { class: 'chip' }, c)),
          )
        : null,
      actions,
    ),
  );

  if (product.available && product.options) {
    media.classList.add('is-clickable');
    media.addEventListener('click', () => ctx.openOptions(product));
  }

  let activeStepper: StepperElement | null = null;

  const refresh = () => {
    const qty = cart.qtyOf(product.id);
    el.classList.toggle('in-cart', qty > 0);
    if (!product.available) {
      actions.replaceChildren(h('button', { type: 'button', class: 'btn btn-block btn-disabled', disabled: true }, 'No disponible por ahora'));
      return;
    }
    if (product.options) {
      actions.replaceChildren(
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary btn-block',
            onclick: () => ctx.openOptions(product),
          },
          icon('plus'),
          `Agregar · elegir ${product.options.label.toLowerCase()}`,
        ),
        ...(qty > 0 ? [h('p', { class: 'card-in-cart' }, icon('check'), `${qty} en tu pedido`)] : []),
      );
      return;
    }
    if (qty > 0 && activeStepper) {
      // Actualiza el número sin reconstruir: así el foco del teclado no se pierde.
      activeStepper.setValue(qty);
      return;
    }
    activeStepper = null;
    if (qty === 0) {
      const hadFocus = actions.contains(document.activeElement);
      queueMicrotask(() => hadFocus && actions.querySelector('button')?.focus({ preventScroll: true }));
      actions.replaceChildren(
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary btn-block',
            'aria-label': `Agregar ${product.name} al pedido`,
            onclick: () => {
              if (cart.add(product.id, null, 1)) ctx.onAdded(product, null);
            },
          },
          icon('plus'),
          'Agregar',
        ),
      );
    } else {
      const key = lineKey(product.id, null);
      const hadFocus = actions.contains(document.activeElement);
      activeStepper = stepper({ value: qty, label: product.name, onChange: (v) => cart.setQty(key, v) });
      actions.replaceChildren(
        h('div', { class: 'card-stepper-row' }, h('span', { class: 'card-in-cart' }, icon('check'), 'En tu pedido'), activeStepper),
      );
      // Tras pulsar "Agregar" el botón desaparece: el foco pasa al "+" para seguir con el teclado.
      if (hadFocus) activeStepper.querySelector<HTMLButtonElement>('.stepper-btn:last-child')?.focus({ preventScroll: true });
    }
  };

  refresh();
  return { el, refresh };
}
