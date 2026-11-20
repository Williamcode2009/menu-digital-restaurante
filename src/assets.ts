/** Resuelve la ruta de una imagen de menu.json respecto a la base pública del sitio. */
export function assetUrl(path: string): string {
  if (!path) return '';
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path;
  const base = import.meta.env.BASE_URL;
  return `${base}${path.replace(/^\.?\//, '')}`;
}
