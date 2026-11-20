# El Rincón Chiapaneco — Menú digital

*Sabor tradicional en cada bocado.*

Menú digital con carrito de pedidos y envío por WhatsApp (988 957 4541). Funciona en teléfonos, tabletas y computadoras.

- **Portada** con fotografía, botones *Explorar menú* y *Hacer pedido*.
- **Menú por categorías** (Antojitos, Tacos, Tortas y más) con fotos, descripciones y precios.
- **Carrito**: agregar, elegir relleno (Quekas y Sopes), cambiar cantidades, eliminar, ver el total y revisar antes de enviar. El pedido se guarda en el teléfono del cliente aunque recargue la página.
- **WhatsApp**: genera el mensaje con productos, rellenos, cantidades, subtotales y total; el cliente solo pulsa *Enviar*.
- **Contacto**: WhatsApp, horario, dirección y botón de Google Maps (configurables).
- **Generador de QR** en `/qr.html` (PNG y SVG), y por terminal con `npm run qr`.

Tecnología: [Vite](https://vite.dev) + TypeScript, sin frameworks pesados (≈ 8 KB de JavaScript comprimido). Fuentes incluidas en el proyecto (sin llamadas a terceros).

---

## 1. Cambiar precios, productos y fotos (sin reconstruir)

Todo el contenido está en dos archivos de datos:

| Archivo | Qué contiene |
| --- | --- |
| `public/data/menu.json` | Categorías y productos |
| `public/data/config.json` | Nombre, eslogan, WhatsApp, dirección, horario y URL pública |

La página lee estos archivos al abrirse, así que **un cambio de precio no requiere reconstruir el sitio**:

- Si publicas con GitHub Pages / Netlify / Vercel conectados al repositorio: edita el archivo en GitHub (ícono del lápiz), guarda, y el sitio se actualiza solo en 1–2 minutos.
- Si subiste la carpeta `dist/` a un hosting: edita directamente `data/menu.json` en el servidor.

### Campos de un producto (`menu.json`)

```json
{
  "id": "quekas",                       // identificador único, sin espacios
  "category": "antojitos",              // id de la categoría
  "name": "Quekas",
  "price": 40,                          // número, sin el signo $
  "description": "Elige tu relleno…",
  "image": "images/productos/quekas.webp",
  "imageSmall": "images/productos/quekas-sm.webp",   // opcional
  "available": true,                    // false = se muestra "Agotado"
  "options": {                          // opcional: el cliente debe elegir una
    "label": "Relleno",
    "choices": ["Pastor", "Asado", "Champiñón", "Chorizo"]
  }
}
```

- **Ocultar temporalmente** un platillo: `"available": false`.
- **Nueva categoría**: agrégala en `categories` y usa su `id` en los productos.
- **Fotos**: copia la imagen a `public/images/productos/` (formato `.webp` o `.jpg`, unos 800 px de ancho) y escribe su ruta en `image`. Si `image` está vacío se muestra una tarjeta ilustrada con el nombre del platillo.

> Las fotos actuales se recortaron del menú impreso del restaurante. Gringas, Mestizas, Tacos de harina, Tortas especiales, Burritos y Huaraches no tenían foto propia: cuando tengas fotografías reales, agrégalas como se indica arriba.

### Dirección y horario (`config.json`)

No se inventaron. Mientras estén vacíos, la página invita a preguntar por WhatsApp. Ejemplo:

```json
"address": {
  "line1": "Calle 00 #000, Colonia",
  "line2": "Ciudad, Estado",
  "references": "Frente a …",
  "mapsUrl": "https://maps.app.goo.gl/…"
},
"hours": [
  { "days": "Lunes a viernes", "hours": "8:00 – 22:00" },
  { "days": "Sábado y domingo", "hours": "9:00 – 23:00" }
]
```

Para `mapsUrl`: abre Google Maps, busca el restaurante, pulsa **Compartir → Copiar vínculo**. Si lo dejas vacío pero hay dirección, el botón busca la dirección escrita.

---

## 2. Trabajar en tu computadora

Requiere [Node.js](https://nodejs.org) 22.18 o superior.

```bash
npm install
npm run dev        # vista previa en http://localhost:5173
npm test           # pruebas: precios exactos, carrito, mensaje de WhatsApp, QR legible
npm run build      # genera la carpeta dist/ lista para publicar
npm run test:e2e   # (opcional) prueba completa en navegador; requiere Playwright
```

---

## 3. Publicar la página

### Opción A — GitHub Pages (gratis, ya configurado)

1. Une esta rama a `main` (o haz *merge* del pull request).
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada vez que se actualice `main`, el flujo `.github/workflows/deploy.yml` prueba, compila y publica.
4. La dirección será `https://<tu-usuario>.github.io/menu-digital-restaurante/` (aparece en *Settings → Pages* y en la pestaña *Actions*).

### Opción B — Netlify o Vercel (gratis, permite dominio propio fácilmente)

1. Crea una cuenta e importa este repositorio de GitHub.
2. Comando de compilación: `npm run build` · Carpeta a publicar: `dist`.
3. Opcional: conecta tu dominio (por ejemplo `elrinconchiapaneco.com`).

### Opción C — Cualquier hosting

Ejecuta `npm run build` y sube el **contenido** de la carpeta `dist/` (funciona en la raíz del dominio o en una subcarpeta).

Después de publicar, escribe la dirección en `config.json → "siteUrl"` (sirve para el QR por terminal).

---

## 4. Generar el código QR definitivo

> El QR debe crearse **después de publicar**, con la dirección pública real. Ambas herramientas rechazan direcciones locales (`localhost`, `192.168…`) o sin `https`.

### Desde el navegador (recomendado)

1. Abre `https://TU-DIRECCION-PUBLICA/qr.html`.
2. La dirección se detecta sola; verifícala.
3. Elige *Tarjeta con marca* o *Solo el código*, y fondo oscuro o claro (ahorra tinta).
4. Pulsa **Descargar PNG** (2400 × 3300 px) o **Descargar SVG** (vectorial, ideal para imprenta), o **Imprimir**.

### Desde la terminal

```bash
npm run qr -- https://tu-direccion-publica/
```

Crea en `qr/`: tarjeta oscura, tarjeta clara y solo-código, cada una en SVG y PNG. (El SVG lleva las tipografías de la marca; el PNG por terminal usa las fuentes del equipo, por eso para PNG se recomienda la página `qr.html`.)

### Consejos de impresión

- Escanéalo con un iPhone y un Android antes de imprimir.
- Tamaño mínimo del código: **3 × 3 cm** en mesas; **8 cm o más** en carteles.
- El QR usa corrección de errores alta (nivel H): sigue funcionando aunque se manche o raye un poco.
- Si cambias de dominio, genera un QR nuevo.

---

## Estructura

```
index.html               Página principal (portada, menú, contacto)
qr.html                  Generador de QR
public/data/             menu.json y config.json  ← lo que se edita
public/images/           Fotos, íconos e imagen para redes
src/main.ts              Arranque de la página
src/cart.ts              Lógica del carrito
src/whatsapp.ts          Mensaje y enlace de WhatsApp
src/data.ts              Carga y validación de los datos
src/components/          Tarjetas, carrito, selector de relleno, contacto…
src/qr/                  Generador de QR (navegador y terminal)
src/styles/main.css      Diseño
scripts/                 QR por terminal, íconos, prueba de punta a punta
tests/                   Pruebas automáticas
```
