import { h, icon } from '../dom';

let timer: ReturnType<typeof setTimeout> | undefined;

/** Aviso breve en la parte inferior ("Agregado a tu pedido"). */
export function showToast(el: HTMLElement, message: string, action?: { label: string; onClick: () => void }) {
  clearTimeout(timer);
  el.replaceChildren(
    icon('check', 'icon toast-icon'),
    h('span', { class: 'toast-text' }, message),
    ...(action
      ? [h(
          'button',
          {
            type: 'button',
            class: 'toast-action',
            onclick: () => {
              hide();
              action.onClick();
            },
          },
          action.label,
        )]
      : []),
  );
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-visible'));
  const hide = () => {
    el.classList.remove('is-visible');
    timer = setTimeout(() => (el.hidden = true), 250);
  };
  timer = setTimeout(hide, 3200);
}
