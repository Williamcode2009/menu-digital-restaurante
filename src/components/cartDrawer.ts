import type { Cart, ResolvedLine } from '../cart';
import { h, icon } from '../dom';
import { money } from '../format';
import type { OrderDetails, SiteConfig } from '../types';
import { buildOrderMessage, whatsappUrl } from '../whatsapp';
import { setupDialog } from './dialog';
import { productMedia } from './productMedia';
import { stepper, type StepperElement } from './stepper';

type Step = 'cart' | 'review';

const DETAILS_KEY = 'rincon-chiapaneco:details:v1';

function loadDetails(): OrderDetails {
  try {
    const d = JSON.parse(localStorage.getItem(DETAILS_KEY) || '{}');
    return { name: typeof d.name === 'string' ? d.name : '', notes: '' };
  } catch {
    return { name: '', notes: '' };
  }
}
function saveDetails(d: OrderDetails) {
  try {
    localStorage.setItem(DETAILS_KEY, JSON.stringify({ name: d.name }));
  } catch {
    /* sin almacenamiento */
  }
}

const optionText = (l: ResolvedLine) => (l.option ? `${l.product.options?.label ?? 'Opción'}: ${l.option}` : '');

export function createCartDrawer(dialog: HTMLDialogElement, cart: Cart, config: SiteConfig, goToMenu: () => void) {
  let step: Step = 'cart';
  const details = loadDetails();
  const ctl = setupDialog(dialog, () => {
    step = 'cart';
  });

  // Filas del carrito indexadas por clave, para actualizar sin perder el foco.
  let rows = new Map<string, { row: HTMLElement; stepper: StepperElement; subtotal: HTMLElement }>();
  let totalEls: HTMLElement[] = [];

  const message = () => buildOrderMessage(config, cart.items(), cart.total(), details);

  function header(title: string, back?: () => void) {
    return h(
      'header',
      { class: 'drawer-head' },
      back
        ? h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Volver al pedido', onclick: back }, icon('arrow-left'))
        : h('span', { class: 'drawer-head-icon', 'aria-hidden': 'true' }, icon('bag')),
      h('h2', { class: 'drawer-title', id: 'cart-title' }, title),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Cerrar', onclick: () => ctl.close() }, icon('close')),
    );
  }

  function totalRow(label = 'Total') {
    const value = h('strong', { class: 'total-value' }, money(cart.total()));
    totalEls.push(value);
    return h('div', { class: 'total-row' }, h('span', {}, label), value);
  }

  function renderEmpty() {
    return h(
      'div',
      { class: 'drawer-empty' },
      h('div', { class: 'empty-illustration', 'aria-hidden': 'true' }, icon('bag')),
      h('p', { class: 'empty-title' }, 'Tu pedido está vacío'),
      h('p', { class: 'empty-text' }, 'Explora el menú y agrega tus antojitos favoritos.'),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-primary btn-lg btn-block',
          onclick: () => {
            ctl.close();
            goToMenu();
          },
        },
        'Ver el menú',
      ),
      h(
        'a',
        {
          class: 'btn btn-ghost btn-block',
          href: whatsappUrl(config.whatsapp.number, config.whatsapp.greeting),
          target: '_blank',
          rel: 'noopener noreferrer',
        },
        icon('whatsapp'),
        'Escribir por WhatsApp',
      ),
    );
  }

  function renderLine(l: ResolvedLine) {
    const subtotal = h('strong', { class: 'line-subtotal' }, money(l.subtotal));
    const st = stepper({ value: l.qty, label: `${l.product.name} ${l.option ?? ''}`.trim(), onChange: (v) => cart.setQty(l.key, v) });
    const row = h(
      'li',
      { class: 'cart-line', 'data-key': l.key },
      productMedia(l.product, 'thumb'),
      h(
        'div',
        { class: 'line-info' },
        h('p', { class: 'line-name' }, l.product.name),
        l.option ? h('p', { class: 'line-option' }, optionText(l)) : null,
        h('p', { class: 'line-unit' }, `${money(l.unitPrice)} c/u`),
      ),
      h(
        'div',
        { class: 'line-controls' },
        st,
        h(
          'div',
          { class: 'line-bottom' },
          subtotal,
          h(
            'button',
            {
              type: 'button',
              class: 'link-btn',
              'aria-label': `Eliminar ${l.product.name} ${l.option ?? ''} del pedido`.replace(/\s+/g, ' '),
              onclick: () => cart.remove(l.key),
            },
            icon('trash'),
            'Eliminar',
          ),
        ),
      ),
    );
    rows.set(l.key, { row, stepper: st, subtotal });
    return row;
  }

  function renderCartStep() {
    const items = cart.items();
    rows = new Map();
    totalEls = [];
    if (!items.length) {
      dialog.replaceChildren(h('div', { class: 'drawer-panel' }, header('Tu pedido'), renderEmpty()));
      return;
    }
    dialog.replaceChildren(
      h(
        'div',
        { class: 'drawer-panel' },
        header('Tu pedido'),
        h('ul', { class: 'cart-lines', 'aria-label': 'Productos en tu pedido' }, items.map(renderLine)),
        h(
          'footer',
          { class: 'drawer-footer' },
          totalRow(),
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-primary btn-lg btn-block',
              onclick: () => {
                step = 'review';
                render();
                dialog.querySelector<HTMLElement>('.drawer-title')?.focus();
              },
            },
            'Revisar pedido',
            icon('check'),
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'link-btn link-btn-muted',
              onclick: () => {
                if (confirm('¿Vaciar todo el pedido?')) cart.clear();
              },
            },
            'Vaciar pedido',
          ),
        ),
      ),
    );
  }

  function renderReviewStep() {
    const items = cart.items();
    totalEls = [];
    rows = new Map();
    if (!items.length) {
      step = 'cart';
      return renderCartStep();
    }
    const preview = h('pre', { class: 'message-preview' }, message());
    const sendLink = h(
      'a',
      {
        class: 'btn btn-whatsapp btn-lg btn-block',
        href: whatsappUrl(config.whatsapp.number, message()),
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      icon('whatsapp'),
      'Enviar pedido por WhatsApp',
    );
    const afterSend = h(
      'div',
      { class: 'after-send', hidden: true },
      h('p', {}, '¿Ya enviaste tu pedido en WhatsApp?'),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn-ghost btn-block',
          onclick: () => {
            cart.clear();
            ctl.close();
          },
        },
        'Sí, vaciar mi pedido',
      ),
    );
    const update = () => {
      saveDetails(details);
      preview.textContent = message();
      sendLink.setAttribute('href', whatsappUrl(config.whatsapp.number, message()));
    };
    sendLink.addEventListener('click', () => {
      sendLink.setAttribute('href', whatsappUrl(config.whatsapp.number, message()));
      afterSend.hidden = false;
    });

    dialog.replaceChildren(
      h(
        'div',
        { class: 'drawer-panel' },
        header('Revisa y envía', () => {
          step = 'cart';
          render();
        }),
        h(
          'div',
          { class: 'review-body' },
          h(
            'ul',
            { class: 'review-lines', 'aria-label': 'Resumen del pedido' },
            items.map((l) =>
              h(
                'li',
                {},
                h('span', { class: 'review-qty' }, `${l.qty}×`),
                h('span', { class: 'review-name' }, l.product.name, l.option ? h('small', {}, optionText(l)) : null),
                h('span', { class: 'review-sub' }, money(l.subtotal)),
              ),
            ),
          ),
          totalRow('Total a pagar'),
          h(
            'div',
            { class: 'field' },
            h('label', { for: 'order-name' }, 'Tu nombre ', h('span', { class: 'optional' }, '(opcional)')),
            h('input', {
              id: 'order-name',
              type: 'text',
              autocomplete: 'name',
              maxlength: 60,
              value: details.name,
              oninput: (e: Event) => {
                details.name = (e.target as HTMLInputElement).value;
                update();
              },
            }),
          ),
          h(
            'div',
            { class: 'field' },
            h('label', { for: 'order-notes' }, 'Notas para el restaurante ', h('span', { class: 'optional' }, '(opcional)')),
            h(
              'textarea',
              {
                id: 'order-notes',
                rows: 2,
                maxlength: 300,
                placeholder: 'Ej. para llevar, sin cebolla, hora en que pasarás…',
                oninput: (e: Event) => {
                  details.notes = (e.target as HTMLTextAreaElement).value;
                  update();
                },
              },
              details.notes,
            ),
          ),
          h('details', { class: 'preview-details' }, h('summary', {}, 'Ver el mensaje que se enviará'), preview),
        ),
        h(
          'footer',
          { class: 'drawer-footer' },
          sendLink,
          h('p', { class: 'send-hint' }, 'Se abrirá WhatsApp con tu pedido ya escrito. Solo pulsa ', h('strong', {}, 'Enviar'), '.'),
          afterSend,
        ),
      ),
    );
  }

  function render() {
    if (step === 'review') renderReviewStep();
    else renderCartStep();
    const title = dialog.querySelector<HTMLElement>('.drawer-title');
    title?.setAttribute('tabindex', '-1');
  }

  // Actualiza el carrito abierto sin reconstruirlo si solo cambiaron cantidades.
  cart.subscribe(() => {
    if (!dialog.open) return;
    if (step === 'review') return render();
    const items = cart.items();
    const sameKeys = items.length === rows.size && items.every((l) => rows.has(l.key));
    if (!sameKeys) {
      const focusedKey = (document.activeElement?.closest('.cart-line') as HTMLElement | null)?.dataset.key;
      render();
      if (focusedKey && !rows.has(focusedKey)) dialog.querySelector<HTMLElement>('.drawer-title')?.focus();
      return;
    }
    for (const l of items) {
      const r = rows.get(l.key)!;
      r.stepper.setValue(l.qty);
      r.subtotal.textContent = money(l.subtotal);
    }
    totalEls.forEach((el) => (el.textContent = money(cart.total())));
  });

  return {
    open(at: Step = 'cart') {
      step = at;
      render();
      ctl.open();
    },
    close: ctl.close,
  };
}
