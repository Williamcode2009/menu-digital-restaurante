import '@fontsource/lobster/latin-400.css';
import '@fontsource-variable/fraunces/wght.css';
import '@fontsource-variable/dm-sans/wght.css';
import './styles/main.css';

import { Cart, localCartStorage } from './cart';
import { createCartDrawer } from './components/cartDrawer';
import { renderContact } from './components/contact';
import { renderMenu } from './components/menu';
import { createOptionSheet } from './components/optionSheet';
import { showToast } from './components/toast';
import { loadData } from './data';
import { $, $$, h, prefersReducedMotion } from './dom';
import { money } from './format';
import type { Product } from './types';
import { whatsappUrl } from './whatsapp';

function setupReveal() {
  const els = $$('.reveal:not(.is-visible)');
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  els.forEach((el) => io.observe(el));
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

function setupHeader() {
  const header = $('.site-header')!;
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Marca la sección activa en la barra inferior.
  const navLinks = $$<HTMLAnchorElement>('.bottom-nav [data-nav]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          navLinks.forEach((a) => {
            const active = a.dataset.nav === e.target.id;
            a.classList.toggle('is-active', active);
            if (active) a.setAttribute('aria-current', 'page');
            else a.removeAttribute('aria-current');
          });
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    ['inicio', 'menu', 'contacto'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }
}

async function start() {
  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = `© ${new Date().getFullYear()} El Rincón Chiapaneco`;
  setupHeader();
  setupReveal();

  const menuRoot = $('[data-menu-root]')!;
  let data;
  try {
    data = await loadData(import.meta.env.BASE_URL);
  } catch (err) {
    console.error(err);
    menuRoot.replaceChildren(
      h(
        'div',
        { class: 'menu-error', role: 'alert' },
        h('p', {}, 'No pudimos cargar el menú en este momento.'),
        h('button', { type: 'button', class: 'btn btn-primary', onclick: () => location.reload() }, 'Reintentar'),
      ),
    );
    return;
  }
  const { menu, config } = data;

  const cart = new Cart(menu, localCartStorage());
  const toastEl = $('[data-toast]')!;
  const drawer = createCartDrawer($<HTMLDialogElement>('[data-cart-dialog]')!, cart, config, () => scrollToId('menu'));

  const added = (p: Product, option: string | null, qty = 1) =>
    showToast(toastEl, `${qty > 1 ? `${qty} × ` : ''}${p.name}${option ? ` (${option})` : ''} agregado`, {
      label: 'Ver pedido',
      onClick: () => drawer.open('cart'),
    });

  const sheet = createOptionSheet($<HTMLDialogElement>('[data-option-dialog]')!, cart, added);
  const menuView = renderMenu({
    root: menuRoot,
    nav: $('[data-category-nav]')!,
    menu,
    cart,
    openOptions: (p) => sheet.open(p),
    onAdded: (p, o) => added(p, o),
  });
  renderContact($('[data-contact-root]')!, config);

  // Precio "desde" del héroe, tomado de los datos (nunca escrito a mano).
  const tacoPrices = menu.products.filter((p) => p.category === 'tacos' && p.available).map((p) => p.price);
  const heroPrice = $('[data-hero-price]');
  if (heroPrice && tacoPrices.length) heroPrice.textContent = money(Math.min(...tacoPrices));
  else heroPrice?.closest('.hero-price-tag')?.remove();

  // Botones "Hacer pedido" / carrito.
  $$('[data-open-cart]').forEach((b) => b.addEventListener('click', () => drawer.open('cart')));

  // Botón flotante de WhatsApp: con pedido, abre la revisión; sin pedido, abre un chat con saludo.
  const waFloat = $<HTMLAnchorElement>('[data-wa-float]')!;
  waFloat.href = whatsappUrl(config.whatsapp.number, config.whatsapp.greeting);
  waFloat.addEventListener('click', (e) => {
    if (cart.count() > 0) {
      e.preventDefault();
      drawer.open('review');
    }
  });

  const counters = $$('[data-cart-count]');
  const shortTotal = $('[data-cart-total-short]');
  const syncBadges = () => {
    const count = cart.count();
    counters.forEach((c) => {
      c.textContent = String(count);
      c.hidden = count === 0;
      c.classList.remove('bump');
      void c.offsetWidth; // reinicia la animación
      c.classList.add('bump');
    });
    if (shortTotal) shortTotal.textContent = count ? money(cart.total()) : 'Pedido';
    document.body.classList.toggle('has-cart', count > 0);
    waFloat.setAttribute('aria-label', count ? `Enviar mi pedido por WhatsApp (${money(cart.total())})` : 'Pedir por WhatsApp');
    const label = waFloat.querySelector('.wa-float-label');
    if (label) label.textContent = count ? `Enviar pedido · ${money(cart.total())}` : 'Pedir por WhatsApp';
  };
  cart.subscribe(() => {
    menuView.refresh();
    syncBadges();
  });
  syncBadges();
  setupReveal();

  // Si se abrió con #cat-... o #producto-..., ubica el contenido ya renderizado.
  if (location.hash.length > 1) {
    const id = decodeURIComponent(location.hash.slice(1));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView());
  }
}

start();
