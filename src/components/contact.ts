import { h, icon } from '../dom';
import type { SiteConfig } from '../types';
import { whatsappUrl } from '../whatsapp';

/** Enlace a Google Maps: usa mapsUrl si existe, si no busca la dirección escrita. */
export function mapsLink(address: SiteConfig['address']): string {
  if (address.mapsUrl && /^https:\/\//.test(address.mapsUrl)) return address.mapsUrl;
  const q = [address.line1, address.line2].filter(Boolean).join(', ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
}

export function renderContact(root: HTMLElement, config: SiteConfig) {
  const { whatsapp, address, hours } = config;
  const maps = mapsLink(address);
  const hasAddress = Boolean(address.line1 || address.line2);

  const waCard = h(
    'article',
    { class: 'contact-card contact-card-wa reveal' },
    h('span', { class: 'contact-icon is-wa', 'aria-hidden': 'true' }, icon('whatsapp')),
    h('h3', {}, 'WhatsApp'),
    h('p', { class: 'contact-big' }, whatsapp.display),
    h('p', { class: 'contact-text' }, 'Haz tu pedido o resuelve tus dudas por mensaje.'),
    h(
      'a',
      { class: 'btn btn-whatsapp btn-block', href: whatsappUrl(whatsapp.number, whatsapp.greeting), target: '_blank', rel: 'noopener noreferrer' },
      icon('whatsapp'),
      'Enviar mensaje',
    ),
  );

  const hoursCard = h(
    'article',
    { class: 'contact-card reveal' },
    h('span', { class: 'contact-icon', 'aria-hidden': 'true' }, icon('clock')),
    h('h3', {}, 'Horario'),
    hours.length
      ? h(
          'dl',
          { class: 'hours-list' },
          hours.map((e) => h('div', { class: 'hours-row' }, h('dt', {}, e.days), h('dd', {}, e.hours))),
        )
      : h('p', { class: 'contact-text' }, 'Escríbenos por WhatsApp para confirmar nuestro horario de hoy.'),
  );

  const addressCard = h(
    'article',
    { class: 'contact-card reveal' },
    h('span', { class: 'contact-icon', 'aria-hidden': 'true' }, icon('pin')),
    h('h3', {}, 'Ubicación'),
    hasAddress
      ? h(
          'address',
          { class: 'contact-address' },
          address.line1 ? h('span', {}, address.line1) : null,
          address.line2 ? h('span', {}, address.line2) : null,
          address.references ? h('small', {}, address.references) : null,
        )
      : h('p', { class: 'contact-text' }, 'Pregúntanos por WhatsApp cómo llegar.'),
    maps
      ? h('a', { class: 'btn btn-primary btn-block', href: maps, target: '_blank', rel: 'noopener noreferrer' }, icon('pin'), 'Abrir en Google Maps')
      : null,
  );

  root.replaceChildren(waCard, hoursCard, addressCard);

  if (!hours.length || !hasAddress) {
    console.info(
      '[El Rincón Chiapaneco] Completa "hours" y "address" en public/data/config.json para mostrar el horario y la dirección.',
    );
  }
}
