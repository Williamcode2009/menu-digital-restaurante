/**
 * Prueba de punta a punta sobre la versión compilada (dist/) en un teléfono y en escritorio.
 *   npm run build && npm run test:e2e
 * Requiere Playwright con Chromium (npx playwright install chromium).
 * Opcional: E2E_SCREENSHOTS=carpeta para guardar capturas.
 */
import { preview } from 'vite';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

// require() respeta NODE_PATH, útil si Playwright está instalado de forma global.
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const shots = process.env.E2E_SCREENSHOTS;
if (shots) mkdirSync(shots, { recursive: true });

const server = await preview({ preview: { port: 4179, strictPort: true }, logLevel: 'silent' });
const base = 'http://localhost:4179/';
const browser = await chromium.launch();
let failures = 0;

async function run(name, contextOptions, fn) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  try {
    await fn(page);
    assert.deepEqual(errors, [], `Errores en consola: ${errors.join(' | ')}`);
    console.log(`✔ ${name}`);
  } catch (e) {
    failures++;
    console.error(`✖ ${name}\n  ${e.message}`);
    if (shots) await page.screenshot({ path: `${shots}/fallo-${name.replace(/\W+/g, '-')}.png`, fullPage: true });
  } finally {
    await context.close();
  }
}

const shot = (page, file, full = false) => shots && page.screenshot({ path: `${shots}/${file}.png`, fullPage: full });

async function waitMenu(page) {
  await page.goto(base);
  await page.waitForSelector('.product-card');
  await page.evaluate(() => document.fonts.ready);
}

const phone = { ...devices['iPhone 13'] };

await run('Menú completo con precios exactos', phone, async (page) => {
  await waitMenu(page);
  await page.waitForTimeout(1200);
  await shot(page, 'movil-portada');
  const cards = await page.$$eval('.product-card', (els) =>
    els.map((e) => [e.querySelector('.card-title').textContent, e.querySelector('.card-price').textContent]),
  );
  assert.deepEqual(cards, [
    ['Quekas', '$40'],
    ['Sopes', '$30'],
    ['Gringas', '$30'],
    ['Mestizas', '$30'],
    ['Tacos de maíz', '$20'],
    ['Tacos de harina', '$25'],
    ['Tortas', '$40'],
    ['Tortas especiales', '$50'],
    ['Burritos', '$120'],
    ['Nachos', '$120'],
    ['Huaraches', '$150'],
  ]);
  const chips = await page.$$eval('.category-chip', (els) => els.map((e) => e.firstChild.textContent));
  assert.deepEqual(chips, ['Antojitos', 'Tacos', 'Tortas y más']);
  // Sin desbordamiento horizontal en el teléfono.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 0, `La página se desborda ${overflow}px a lo ancho`);
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#menu').offsetTop));
  await page.waitForTimeout(900);
  await shot(page, 'movil-menu');
});

await run('Pedido completo en el teléfono hasta WhatsApp', phone, async (page) => {
  await waitMenu(page);

  // "Explorar menú" lleva a la sección del menú.
  await page.click('.hero-actions a[href="#menu"]');
  await page.waitForTimeout(800);
  assert.ok(await page.evaluate(() => document.querySelector('#menu').getBoundingClientRect().top < 400));

  // Quekas: exige relleno.
  await page.click('#producto-quekas .btn-primary');
  await page.waitForSelector('[data-option-dialog][open]');
  await shot(page, 'movil-relleno');
  await page.click('[data-option-dialog] button[type=submit]');
  assert.ok(await page.isVisible('#option-error'), 'Debe pedir elegir relleno');
  await page.click('[data-option-dialog] .option-pill:has-text("Pastor")');
  await page.click('[data-option-dialog] .stepper-btn:last-child');
  assert.match(await page.textContent('[data-option-dialog] .btn-total'), /\$80/);
  await page.click('[data-option-dialog] button[type=submit]');
  await page.waitForSelector('[data-option-dialog]:not([open])', { state: 'attached' });

  // Sopes con otro relleno.
  await page.click('#producto-sopes .btn-primary');
  await page.click('[data-option-dialog] .option-pill:has-text("Champiñón")');
  await page.click('[data-option-dialog] button[type=submit]');
  await page.waitForSelector('[data-option-dialog]:not([open])', { state: 'attached' });

  // Tacos de maíz x3 con el control de cantidad de la tarjeta.
  await page.click('#producto-tacos-maiz .btn-primary');
  await page.click('#producto-tacos-maiz .stepper-btn:last-child');
  await page.click('#producto-tacos-maiz .stepper-btn:last-child');
  assert.equal(await page.textContent('#producto-tacos-maiz .stepper-value'), '3');

  // Huaraches: agregar y quitar.
  await page.click('#producto-huaraches .btn-primary');
  await page.click('#producto-huaraches .stepper-btn:first-child');
  assert.ok(await page.isVisible('#producto-huaraches .btn-primary'));

  // Insignia del carrito: 2 + 1 + 3 = 6 productos, total 80 + 30 + 60 = 170.
  assert.equal(await page.textContent('.bottom-nav [data-cart-count]'), '6');
  assert.equal(await page.textContent('[data-cart-total-short]'), '$170');

  // Abrir carrito.
  await page.click('.bottom-nav-cart');
  await page.waitForSelector('[data-cart-dialog][open] .cart-line');
  await page.waitForTimeout(400);
  await shot(page, 'movil-carrito');
  assert.equal(await page.$$eval('.cart-line', (e) => e.length), 3);
  assert.equal(await page.textContent('[data-cart-dialog] .total-value'), '$170');

  // Cambiar cantidad y eliminar dentro del carrito.
  await page.click('.cart-line[data-key="sopes::Champiñón"] .stepper-btn:last-child');
  assert.equal(await page.textContent('[data-cart-dialog] .total-value'), '$200');
  await page.click('.cart-line[data-key="tacos-maiz::"] .link-btn');
  await page.waitForFunction(() => document.querySelectorAll('.cart-line').length === 2);
  assert.equal(await page.textContent('[data-cart-dialog] .total-value'), '$140');

  // Revisar y enviar.
  await page.click('[data-cart-dialog] .drawer-footer .btn-primary');
  await page.fill('#order-name', 'Cliente de prueba');
  await page.fill('#order-notes', 'Para llevar');
  await page.click('.preview-details summary');
  await page.waitForTimeout(300);
  await shot(page, 'movil-revision');
  const href = await page.getAttribute('[data-cart-dialog] .btn-whatsapp', 'href');
  assert.ok(href.startsWith('https://wa.me/529889574541?text='), href);
  const text = new URL(href).searchParams.get('text');
  assert.equal(
    text,
    [
      '¡Hola, El Rincón Chiapaneco! Quiero hacer el siguiente pedido:',
      '',
      '• 2 x Quekas (Relleno: Pastor) — $80',
      '• 2 x Sopes (Relleno: Champiñón) — $60',
      '',
      '*Total: $140 MXN*',
      '',
      'Nombre: Cliente de prueba',
      'Notas: Para llevar',
      '',
      'Quedo atento(a) a la confirmación. ¡Gracias!',
    ].join('\n'),
  );
  assert.equal(await page.getAttribute('[data-cart-dialog] .btn-whatsapp', 'target'), '_blank');

  // El pedido sobrevive a recargar la página.
  await page.keyboard.press('Escape');
  await page.reload();
  await page.waitForSelector('.product-card');
  assert.equal(await page.textContent('[data-cart-total-short]'), '$140');

  // Botón flotante de WhatsApp con pedido: abre la revisión.
  await page.click('[data-wa-float]');
  await page.waitForSelector('[data-cart-dialog][open] .btn-whatsapp');
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-cart-dialog]:not([open])', { state: 'attached' });
});

await run('Botones de portada, contacto y WhatsApp sin pedido', phone, async (page) => {
  await waitMenu(page);
  assert.equal(await page.getAttribute('[data-wa-float]', 'href'), 'https://wa.me/529889574541?text=' + encodeURIComponent('¡Hola, El Rincón Chiapaneco! Me gustaría hacer un pedido.'));
  // "Hacer pedido" con carrito vacío abre el carrito con su estado vacío.
  await page.click('.hero-actions button[data-open-cart]');
  await page.waitForSelector('[data-cart-dialog][open] .drawer-empty');
  await shot(page, 'movil-carrito-vacio');
  await page.click('.drawer-empty .btn-primary');
  await page.waitForSelector('[data-cart-dialog]:not([open])', { state: 'attached' });
  // Contacto.
  await page.click('.bottom-nav a[href="#contacto"]');
  await page.waitForTimeout(900);
  assert.equal(await page.$$eval('.contact-card', (e) => e.length), 3);
  const waHref = await page.getAttribute('.contact-card-wa a', 'href');
  assert.ok(waHref.startsWith('https://wa.me/529889574541'));
  await shot(page, 'movil-contacto');
});

await run('Escritorio', { viewport: { width: 1366, height: 860 } }, async (page) => {
  await waitMenu(page);
  await page.waitForTimeout(900);
  await shot(page, 'escritorio-portada');
  assert.ok(await page.isVisible('.header-nav'));
  assert.ok(!(await page.isVisible('.bottom-nav')));
  await page.click('#producto-nachos .btn-primary');
  await page.click('.site-header .cart-button');
  await page.waitForSelector('[data-cart-dialog][open] .cart-line');
  await page.waitForTimeout(400);
  await shot(page, 'escritorio-carrito');
  assert.equal(await page.textContent('[data-cart-dialog] .total-value'), '$120');
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.scrollTo(0, 0));
  if (shots) {
    // Captura completa: muestra todo el contenido (las animaciones de aparición se fuerzan).
    await page.evaluate(() => document.querySelectorAll('.reveal').forEach((e) => e.classList.add('is-visible')));
    await page.waitForTimeout(900);
    await shot(page, 'escritorio-completo', true);
  }
});

await run('Herramienta de QR rechaza direcciones locales', phone, async (page) => {
  await page.goto(base + 'qr.html');
  await page.waitForTimeout(500);
  assert.equal(await page.inputValue('#qr-url'), '', 'En local no debe autocompletar la URL');
  await page.fill('#qr-url', 'http://localhost:4179/');
  await page.click('button[type=submit]');
  assert.ok(await page.isVisible('[data-url-error]'));
  await page.fill('#qr-url', 'https://menu-prueba.netlify.app/');
  await page.click('button[type=submit]');
  await page.waitForSelector('.qr-image');
  await page.waitForFunction(() => document.querySelector('.qr-image').complete);
  await page.waitForTimeout(400);
  await shot(page, 'qr-herramienta', true);
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-download="png"]')]);
  assert.match(download.suggestedFilename(), /\.png$/);
  const [svgDownload] = await Promise.all([page.waitForEvent('download'), page.click('[data-download="svg"]')]);
  assert.match(svgDownload.suggestedFilename(), /\.svg$/);
  if (shots) await download.saveAs(`${shots}/qr-descargado.png`);
});

await browser.close();
await new Promise((r) => server.httpServer.close(r));
if (failures) {
  console.error(`\n${failures} prueba(s) fallaron`);
  process.exit(1);
}
console.log('\nTodas las pruebas de punta a punta pasaron.');
