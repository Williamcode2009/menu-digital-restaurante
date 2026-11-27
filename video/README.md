# Video promocional — El Rincón Chiapaneco

`rincon-chiapaneco-promo.mp4`: vertical 1080×1920, 30 fps, 36 s, con voz en off, subtítulos y marimba de fondo.

## Cómo se hizo (carpeta `fuente/`)

- **Animación:** `index.html` con GSAP (línea de tiempo pausada que se avanza cuadro por cuadro).
- **Render:** `render.mjs` abre la página en Chromium (Playwright) y guarda cada cuadro; luego ffmpeg une cuadros y audio.
- **Voz:** `voz/tts.py` genera cada frase de `voz/guion.json` con [Kokoro](https://github.com/thewh1teagle/kokoro-onnx) (voz `em_alex`).
- **Audio final:** `voz/mix.py` coloca la voz en su tiempo y agrega una marimba sintetizada que baja cuando habla la voz.
- `data.js` contiene las duraciones de cada frase, el guion y el QR de WhatsApp.

## Regenerar

```bash
cd fuente && npm install
# voz (requiere kokoro-v1.0.int8.onnx y voices-v1.0.bin en voz/)
cd voz && python tts.py em_alex 1.0 em_alex && python mix.py && cd ..
node render.mjs frames frames
ffmpeg -framerate 30 -i frames/f%05d.jpg -i voz/mix.wav -af loudnorm=I=-14:TP=-1.5 \
  -c:v libx264 -crf 19 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart promo.mp4
```

Si cambias el guion, actualiza `DURS` en `data.js` con las duraciones que imprime `tts.py`.
