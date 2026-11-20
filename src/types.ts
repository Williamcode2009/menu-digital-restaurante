export interface ProductOptions {
  /** Etiqueta visible, por ejemplo "Relleno". */
  label: string;
  /** Opciones disponibles. El cliente debe elegir una. */
  choices: string[];
}

export interface Product {
  id: string;
  category: string;
  name: string;
  price: number;
  description: string;
  image: string;
  imageSmall?: string;
  available: boolean;
  options?: ProductOptions;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Menu {
  currency: string;
  categories: Category[];
  products: Product[];
}

export interface HoursEntry {
  days: string;
  hours: string;
}

export interface SiteConfig {
  name: string;
  slogan: string;
  siteUrl: string;
  whatsapp: {
    number: string;
    display: string;
    greeting: string;
  };
  address: {
    line1: string;
    line2: string;
    references: string;
    mapsUrl: string;
  };
  hours: HoursEntry[];
}

export interface CartLine {
  productId: string;
  option: string | null;
  qty: number;
}

export interface OrderDetails {
  name: string;
  notes: string;
}
