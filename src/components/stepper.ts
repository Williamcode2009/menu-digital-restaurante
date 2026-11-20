import { MAX_QTY } from '../cart';
import { h, icon } from '../dom';

interface StepperOptions {
  value: number;
  min?: number;
  label: string;
  onChange: (value: number) => void;
  size?: 'md' | 'lg';
}

/** Control de cantidad (− n +) con botones grandes para el pulgar. */
export type StepperElement = HTMLElement & { setValue: (value: number) => void };

export function stepper({ value, min = 0, label, onChange, size = 'md' }: StepperOptions): StepperElement {
  let current = value;
  const out = h('output', { class: 'stepper-value', 'aria-live': 'polite' }, current);
  const minus = h(
    'button',
    { type: 'button', class: 'stepper-btn', 'aria-label': `Quitar uno: ${label}` },
    icon('minus'),
  );
  const plus = h('button', { type: 'button', class: 'stepper-btn', 'aria-label': `Agregar uno: ${label}` }, icon('plus'));

  const sync = () => {
    out.textContent = String(current);
    minus.disabled = current <= min;
    plus.disabled = current >= MAX_QTY;
    minus.replaceChildren(icon(current <= 1 && min < 1 ? 'trash' : 'minus'));
  };
  minus.addEventListener('click', () => {
    if (current <= min) return;
    current -= 1;
    sync();
    onChange(current);
  });
  plus.addEventListener('click', () => {
    if (current >= MAX_QTY) return;
    current += 1;
    sync();
    onChange(current);
  });
  sync();
  const el = h('div', { class: `stepper stepper-${size}`, role: 'group', 'aria-label': `Cantidad de ${label}` }, minus, out, plus);
  return Object.assign(el, {
    setValue(v: number) {
      if (v === current) return;
      current = v;
      sync();
    },
  });
}
