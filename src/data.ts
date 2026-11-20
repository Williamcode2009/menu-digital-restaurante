import type { Category, Menu, Product, SiteConfig } from './types';

const isStr = (v: unknown): v is string => typeof v === 'string';

function fail(msg: string): never {
  throw new Error(`Error en los datos del menú: ${msg}`);
}

/** Valida y normaliza el contenido de menu.json. Lanza un error descriptivo si algo está mal. */
export function parseMenu(raw: unknown): Menu {
  if (!raw || typeof raw !== 'object') fail('el archivo no es un objeto JSON');
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.categories)) fail('falta la lista "categories"');
  if (!Array.isArray(r.products)) fail('falta la lista "products"');

  const categories: Category[] = r.categories.map((c, i) => {
    const cat = (c ?? {}) as Record<string, unknown>;
    if (!isStr(cat.id) || !cat.id) fail(`la categoría #${i + 1} no tiene "id"`);
    if (!isStr(cat.name) || !cat.name) fail(`la categoría "${cat.id}" no tiene "name"`);
    return { id: cat.id, name: cat.name, description: isStr(cat.description) ? cat.description : '' };
  });
  const catIds = new Set(categories.map((c) => c.id));
  const seen = new Set<string>();

  const products: Product[] = r.products.map((p, i) => {
    const prod = (p ?? {}) as Record<string, unknown>;
    const label = isStr(prod.id) ? `"${prod.id}"` : `#${i + 1}`;
    if (!isStr(prod.id) || !prod.id) fail(`el producto ${label} no tiene "id"`);
    if (seen.has(prod.id)) fail(`el id "${prod.id}" está repetido`);
    seen.add(prod.id);
    if (!isStr(prod.name) || !prod.name) fail(`el producto ${label} no tiene "name"`);
    if (!isStr(prod.category) || !catIds.has(prod.category))
      fail(`el producto ${label} tiene una categoría inexistente: "${String(prod.category)}"`);
    if (typeof prod.price !== 'number' || !Number.isFinite(prod.price) || prod.price < 0)
      fail(`el producto ${label} tiene un precio inválido`);

    let options: Product['options'];
    if (prod.options != null) {
      const o = prod.options as Record<string, unknown>;
      if (!Array.isArray(o.choices) || !o.choices.length || !o.choices.every(isStr))
        fail(`las opciones del producto ${label} deben ser una lista de textos`);
      options = { label: isStr(o.label) && o.label ? o.label : 'Opción', choices: o.choices as string[] };
    }

    return {
      id: prod.id,
      category: prod.category,
      name: prod.name,
      price: prod.price,
      description: isStr(prod.description) ? prod.description : '',
      image: isStr(prod.image) ? prod.image : '',
      imageSmall: isStr(prod.imageSmall) && prod.imageSmall ? prod.imageSmall : undefined,
      available: prod.available !== false,
      options,
    };
  });

  return { currency: isStr(r.currency) ? r.currency : 'MXN', categories, products };
}

/** Normaliza config.json. Los campos vacíos se quedan vacíos: la interfaz los oculta. */
export function parseConfig(raw: unknown): SiteConfig {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const s = (v: unknown, d = '') => (isStr(v) ? v.trim() : d);
  const number = s(r.whatsapp?.number, '529889574541').replace(/\D/g, '') || '529889574541';
  const hours: SiteConfig['hours'] = Array.isArray(r.hours)
    ? r.hours
        .filter((h: unknown) => {
          const e = h as Record<string, unknown> | null;
          return !!e && isStr(e.days) && isStr(e.hours) && e.days.trim() !== '';
        })
        .map((h: { days: string; hours: string }) => ({ days: h.days.trim(), hours: h.hours.trim() }))
    : [];
  return {
    name: s(r.name, 'El Rincón Chiapaneco') || 'El Rincón Chiapaneco',
    slogan: s(r.slogan, 'Sabor tradicional en cada bocado'),
    siteUrl: s(r.siteUrl),
    whatsapp: {
      number,
      display: s(r.whatsapp?.display) || number,
      greeting: s(r.whatsapp?.greeting) || '¡Hola! Me gustaría hacer un pedido.',
    },
    address: {
      line1: s(r.address?.line1),
      line2: s(r.address?.line2),
      references: s(r.address?.references),
      mapsUrl: s(r.address?.mapsUrl),
    },
    hours,
  };
}

async function getJson(url: string): Promise<unknown> {
  // no-cache: el navegador revalida con el servidor, así un cambio de precio se ve de inmediato.
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (${res.status})`);
  return res.json();
}

export async function loadData(base: string): Promise<{ menu: Menu; config: SiteConfig }> {
  const [menuRaw, configRaw] = await Promise.all([
    getJson(`${base}data/menu.json`),
    getJson(`${base}data/config.json`).catch((e) => {
      console.warn(e);
      return {};
    }),
  ]);
  return { menu: parseMenu(menuRaw), config: parseConfig(configRaw) };
}
