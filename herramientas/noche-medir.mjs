// Mide los fps de FUGAZ v13 en Chromium sin GPU (swiftshader: dibuja con la CPU, mucho más lento que una GPU real).
// Sirve para comparar niveles de calidad entre sí, no para saber los fps de un móvil de verdad.
// Uso: con el servidor en 127.0.0.1:8123 → node herramientas/noche-medir.mjs
import { chromium, devices } from 'playwright';
const nav = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const { defaultBrowserType, ...pixel5 } = devices['Pixel 5'];
const casos = [
  ['PC 1280×720', { viewport: { width: 1280, height: 720 } }, ['baja', 'media', 'alta']],
  ['PC 960×540', { viewport: { width: 960, height: 540 } }, ['baja', 'media']],
  ['Pixel 5 emulado', pixel5, ['baja', 'media']],
];
for (const [nombre, ctxOp, niveles] of casos) for (const nivel of niveles) {
  const ctx = await nav.newContext(ctxOp);
  const page = await ctx.newPage();
  await page.addInitScript((n) => { localStorage.setItem('fugazNoche.ajustes', JSON.stringify({ camara: 'cabina', control: 'pulgar', calidad: n })); localStorage.setItem('fugazNoche.guiaVista', '1'); }, nivel);
  await page.goto('http://127.0.0.1:8123/index.html?prueba=1&invulnerable=1&piloto=1&semilla=17');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3500);
  const r = await page.evaluate(() => new Promise((res) => {
    const t = []; let ant = performance.now();
    const f = (x) => { t.push(x - ant); ant = x; if (t.length < 120) requestAnimationFrame(f); else res(t); };
    requestAnimationFrame(f);
  }));
  const info = await page.evaluate(() => window.__noche.escena.info());
  r.sort((a, b) => a - b);
  const media = r.reduce((a, b) => a + b, 0) / r.length;
  console.log(`${nombre} · ${nivel}: ${(1000 / media).toFixed(1)} fps de media, p95 ${r[Math.floor(r.length * 0.95)].toFixed(0)} ms · ${info.llamadas} llamadas, ${info.triangulos} triángulos`);
  await ctx.close();
}
await nav.close();
