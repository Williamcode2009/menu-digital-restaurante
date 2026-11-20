const nf = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });

/** Formatea un precio: 1200 -> "$1,200". */
export function money(value: number): string {
  return `$${nf.format(value)}`;
}
