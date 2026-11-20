import type { Cart } from '../cart';
import { h, icon } from '../dom';
import { money } from '../format';
import type { Product } from '../types';
import { setupDialog } from './dialog';
import { productMedia } from './productMedia';
import { stepper } from './stepper';

/** Hoja para elegir relleno y cantidad antes de agregar al pedido. */
export function createOptionSheet(dialog: HTMLDialogElement, cart: Cart, onAdded: (p: Product, option: string, qty: number) => void) {
  const ctl = setupDialog(dialog);

  function open(product: Product) {
    if (!product.options) return;
    const { label, choices } = product.options;
    let selected: string | null = null;
    let qty = 1;

    const error = h('p', { class: 'form-error', id: 'option-error', role: 'alert', hidden: true }, `Elige un ${label.toLowerCase()} para continuar.`);
    const total = h('span', { class: 'btn-total' }, money(product.price));
    const addBtn = h('button', { type: 'submit', class: 'btn btn-primary btn-lg btn-block' }, icon('plus'), 'Agregar al pedido', total);

    const updateTotal = () => (total.textContent = money(product.price * qty));

    const radios = choices.map((choice, i) =>
      h(
        'label',
        { class: 'option-pill' },
        h('input', {
          type: 'radio',
          name: 'option',
          value: choice,
          required: i === 0,
          onchange: () => {
            selected = choice;
            error.hidden = true;
          },
        }),
        h('span', {}, choice),
      ),
    );

    const form = h(
      'form',
      {
        class: 'sheet-body',
        method: 'dialog',
        novalidate: true,
        onsubmit: (e: Event) => {
          e.preventDefault();
          if (!selected) {
            error.hidden = false;
            (radios[0].querySelector('input') as HTMLInputElement).focus();
            return;
          }
          if (cart.add(product.id, selected, qty)) {
            onAdded(product, selected, qty);
            ctl.close();
          }
        },
      },
      h(
        'fieldset',
        { class: 'option-group', 'aria-describedby': 'option-error' },
        h('legend', { class: 'option-legend' }, `Elige tu ${label.toLowerCase()}`, h('span', { class: 'required-tag' }, 'Obligatorio')),
        h('div', { class: 'option-grid' }, radios),
        error,
      ),
      h(
        'div',
        { class: 'sheet-qty' },
        h('span', { class: 'sheet-qty-label' }, 'Cantidad'),
        stepper({
          value: 1,
          min: 1,
          label: product.name,
          size: 'lg',
          onChange: (v) => {
            qty = v;
            updateTotal();
          },
        }),
      ),
      h('div', { class: 'sheet-footer' }, addBtn),
    );

    dialog.replaceChildren(
      h(
        'div',
        { class: 'sheet-panel' },
        h('button', { type: 'button', class: 'sheet-close', 'aria-label': 'Cerrar', onclick: () => ctl.close() }, icon('close')),
        productMedia(product, 'sheet'),
        h(
          'div',
          { class: 'sheet-head' },
          h('h2', { class: 'sheet-title', id: 'option-title' }, product.name),
          h('p', { class: 'sheet-price' }, `${money(product.price)} c/u`),
          product.description ? h('p', { class: 'sheet-desc' }, product.description) : null,
        ),
        form,
      ),
    );
    ctl.open();
  }

  return { open, close: ctl.close };
}
