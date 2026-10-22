// Mide el coste de la lógica (node) y los fps en Chromium sin GPU (swiftshader, mucho más lento que un móvil real).
// Uso: node herramientas/medir.mjs   (con el servidor local en 127.0.0.1:8123)
import { chromium, devices } from 'playwright';
import { crearMundo } from '../escape/js/mundo.js';
import { piloto } from './piloto.mjs';

// 1) Lógica: una partida entera a 60 pasos por segundo.
let pasos = 0, ms = 0;
for (let i = 0; i < 10; i++) {
  const m = crearMundo({ semilla: 100 + i, invulnerable: true });
  const t0 = performance.now();
  while (!m.fin) { m.paso(1 / 60, piloto(m)); pasos++; }
  ms += performance.now() - t0;
}
console.log(`lógica: ${(ms / pasos * 1000).toFixed(1)} µs por paso (${pasos} pasos)`);

// 2) Dibujo: fps en un Pixel 5 emulado con GPU por software.
const nav = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const { defaultBrowserType, ...pixel5 } = devices['Pixel 5'];
for (const [nombre, ctx] of [['Pixel 5 (emulado)', pixel5], ['PC 1280×720', { viewport: { width: 1280, height: 720 } }]]) {
  const c = await nav.newContext(ctx);
  const page = await c.newPage();
  await page.addInitScript(() => localStorage.setItem('fugazEscape.tutorialSuperado', '1'));
  await page.goto('http://127.0.0.1:8123/escape/index.html?prueba=1&invulnerable=1&duracion=60');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => new Promise((res) => {
    const tiempos = []; let ant = performance.now();
    const f = (t) => { tiempos.push(t - ant); ant = t; if (tiempos.length < 240) requestAnimationFrame(f); else res(tiempos); };
    requestAnimationFrame(f);
  }));
  r.sort((a, b) => a - b);
  const media = r.reduce((a, b) => a + b, 0) / r.length;
  console.log(`${nombre}: ${(1000 / media).toFixed(1)} fps de media, p95 ${r[Math.floor(r.length * 0.95)].toFixed(1)} ms por fotograma`);
  await c.close();
}
await nav.close();
