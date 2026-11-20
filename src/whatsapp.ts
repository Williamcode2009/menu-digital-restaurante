import type { ResolvedLine } from './cart';
import { money } from './format';
import type { OrderDetails, SiteConfig } from './types';

/** Construye el texto del pedido que se enviará por WhatsApp. */
export function buildOrderMessage(
  config: Pick<SiteConfig, 'name'>,
  lines: ResolvedLine[],
  total: number,
  details: OrderDetails = { name: '', notes: '' },
): string {
  const out: string[] = [];
  out.push(`¡Hola, ${config.name}! Quiero hacer el siguiente pedido:`);
  out.push('');
  for (const l of lines) {
    const opt = l.option ? ` (${l.product.options?.label ?? 'Opción'}: ${l.option})` : '';
    out.push(`• ${l.qty} x ${l.product.name}${opt} — ${money(l.subtotal)}`);
  }
  out.push('');
  out.push(`*Total: ${money(total)} MXN*`);
  const name = details.name.trim();
  const notes = details.notes.trim();
  if (name || notes) out.push('');
  if (name) out.push(`Nombre: ${name}`);
  if (notes) out.push(`Notas: ${notes}`);
  out.push('');
  out.push('Quedo atento(a) a la confirmación. ¡Gracias!');
  return out.join('\n');
}

/** Enlace wa.me con el mensaje ya escrito; el cliente solo pulsa "Enviar". */
export function whatsappUrl(number: string, text?: string): string {
  const clean = number.replace(/\D/g, '');
  const base = `https://wa.me/${clean}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
