import { assetUrl } from '../assets';
import { h } from '../dom';
import type { Product } from '../types';

/**
 * Foto del producto. Si en menu.json no hay foto, muestra una tarjeta ilustrada con el
 * nombre del platillo, para que el menú se vea completo mientras llegan las fotos reales.
 */
export function productMedia(product: Product, variant: 'card' | 'sheet' | 'thumb' = 'card'): HTMLElement {
  if (!product.image) {
    return h(
      'div',
      { class: `media media-${variant} media-placeholder`, 'aria-hidden': 'true' },
      h('span', { class: 'media-placeholder-name' }, product.name),
    );
  }
  const full = assetUrl(product.image);
  const small = product.imageSmall ? assetUrl(product.imageSmall) : '';
  const img = h('img', {
    src: variant === 'thumb' && small ? small : full,
    srcset: small && variant !== 'thumb' ? `${small} 400w, ${full} 800w` : null,
    sizes: variant === 'card' ? '(min-width: 1100px) 360px, (min-width: 700px) 45vw, 92vw' : variant === 'sheet' ? '(min-width: 700px) 520px, 100vw' : null,
    alt: variant === 'thumb' ? '' : `Fotografía de ${product.name}`,
    loading: variant === 'sheet' ? 'eager' : 'lazy',
    decoding: 'async',
  });
  img.addEventListener('load', () => img.classList.add('is-loaded'), { once: true });
  img.addEventListener('error', () => {
    img.replaceWith(h('span', { class: 'media-placeholder-name' }, product.name));
    wrap.classList.add('media-placeholder');
  });
  const wrap = h('div', { class: `media media-${variant}` }, img);
  return wrap;
}
