import { chromium } from 'playwright';
import fs from 'fs';
const [mode, arg] = process.argv.slice(2); // "stills" "1,5,9"  |  "frames" outdir
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGE ERROR', e.message));
await page.goto('file://' + process.cwd() + '/index.html');
await page.evaluate(() => window.ready);
const T = await page.evaluate(() => window.TIMING);
console.log(JSON.stringify(T));
if (mode === 'stills') {
  for (const s of arg.split(',').map(Number)) {
    await page.evaluate(s => window.seek(s), s);
    await page.screenshot({ path: `still_${String(s).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 80 });
  }
} else {
  fs.mkdirSync(arg, { recursive: true });
  const FPS = 30, n = Math.ceil(T.TOTAL * FPS);
  for (let f = 0; f < n; f++) {
    await page.evaluate(s => window.seek(s), f / FPS);
    await page.screenshot({ path: `${arg}/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    if (f % 150 === 0) console.log('frame', f, '/', n);
  }
}
await browser.close();
