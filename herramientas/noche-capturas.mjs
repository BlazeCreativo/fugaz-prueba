// Capturas y clip de FUGAZ v13 para el informe (ENCARGOS/informes/v13/).
// Va en modo manual (fotogramas a ritmo fijo): así el clip sale fluido aunque la GPU por software sea lenta.
// Uso: con el servidor en 127.0.0.1:8123 → node herramientas/noche-capturas.mjs
import { chromium, devices } from 'playwright';
import { execFileSync } from 'child_process';
import fs from 'fs';
const SAL = 'ENCARGOS/informes/v13';
fs.mkdirSync(SAL, { recursive: true });
const BASE = 'http://127.0.0.1:8123/index.html';
const SOLO_CLIP = process.env.SOLO_CLIP === '1';
const nav = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const { defaultBrowserType, ...pixel5 } = devices['Pixel 5'];

async function abrir(ctxOp, ajustes, consulta) {
  const ctx = await nav.newContext(ctxOp);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('ERROR', e.message));
  await page.addInitScript((a) => { localStorage.setItem('fugazNoche.ajustes', JSON.stringify(a)); localStorage.setItem('fugazNoche.guiaVista', '1'); localStorage.setItem('fugazNoche.record', '48210'); }, ajustes);
  await page.goto(`${BASE}?prueba=1&manual=1&${consulta}`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__noche.fotogramas(12));
  return { ctx, page };
}
const empezar = (page) => page.evaluate(() => { document.getElementById('jugar').click(); window.__noche.fotogramas(40); });
const PC = { viewport: { width: 1280, height: 720 } };

// 1) menú
if (!SOLO_CLIP) {
  const { ctx, page } = await abrir(PC, { camara: 'cabina', control: 'pulgar', calidad: 'alta' }, 'semilla=3');
  await page.screenshot({ path: `${SAL}/1-menu.png` });
  await ctx.close();
}
// 2) cabina a toda velocidad, justo después de un roce y con otro coche a punto de pasar
if (!SOLO_CLIP) {
  const { ctx, page } = await abrir(PC, { camara: 'cabina', control: 'pulgar', calidad: 'alta' }, 'semilla=8&invulnerable=1');
  await empezar(page);
  await page.evaluate(() => { const m = window.__noche.mundo; m.t = 40; window.__noche.avanzar(4); window.__noche.fotogramas(12); });
  await page.evaluate(() => {
    const m = window.__noche.mundo;
    m.coches = m.coches.filter((c) => c.s - m.jug.s > 60 || c.s < m.jug.s);
    m.ponerCoche(12, -2.15); const otro = m.ponerCoche(30, 2.25, 1);
    for (let i = 0; i < 60 && m.jug.s < otro.s - 8; i++) window.__noche.fotogramas(1);
  });
  await page.screenshot({ path: `${SAL}/2-cabina-roce.png` });
  await ctx.close();
}
// 3) túnel en cabina
if (!SOLO_CLIP) {
  const { ctx, page } = await abrir(PC, { camara: 'cabina', control: 'pulgar', calidad: 'alta' }, 'semilla=12&invulnerable=1');
  await empezar(page);
  await page.evaluate(() => {
    const m = window.__noche.mundo, t = m.pista.tuneles[0];
    const d = t.s0 + 45 - m.jug.s; m.jug.s += d; for (const c of m.coches) c.s += d; m.t = 30;
    window.__noche.fotogramas(14);
  });
  await page.screenshot({ path: `${SAL}/3-tunel.png` });
  await ctx.close();
}
// 4) móvil en vertical con la cámara exterior
if (!SOLO_CLIP) {
  const { ctx, page } = await abrir(pixel5, { camara: 'fuera', control: 'pulgar', calidad: 'media' }, 'semilla=5&invulnerable=1&piloto=1');
  await empezar(page);
  await page.evaluate(() => { window.__noche.mundo.t = 35; window.__noche.avanzar(6); window.__noche.fotogramas(14); });
  await page.screenshot({ path: `${SAL}/4-movil-fuera.png` });
  await ctx.close();
}
// 5) pantalla final con récord
if (!SOLO_CLIP) {
  const { ctx, page } = await abrir(PC, { camara: 'cabina', control: 'pulgar', calidad: 'media' }, 'semilla=9&invulnerable=1&piloto=1&duracion=40');
  await empezar(page);
  await page.evaluate(() => { const m = window.__noche.mundo; m.puntos += 60000; window.__noche.avanzar(45); window.__noche.fotogramas(10); });
  await page.screenshot({ path: `${SAL}/5-final.png` });
  await ctx.close();
}
// clip: 10 s de cabina pasando al límite entre coches colocados a izquierda y derecha (30 fps, 960×540)
{
  const { ctx, page } = await abrir({ viewport: { width: 960, height: 540 } }, { camara: 'cabina', control: 'pulgar', calidad: 'alta' }, 'semilla=31&invulnerable=1');
  await empezar(page);
  await page.evaluate(() => { window.__noche.mundo.t = 45; window.__noche.avanzar(3); window.__noche.fotogramas(14); });
  const dir = 'test-results/clip';
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < 300; i++) {
    if (i === 180) await page.keyboard.press('c'); // los últimos 4 s desde fuera
    await page.evaluate((i) => {
      const m = window.__noche.mundo;
      if (i % 28 === 0) { // un coche nuevo cada ~0,9 s, alternando lado, y el carril del jugador despejado
        m.coches = m.coches.filter((c) => c.fijo || Math.abs(c.x - m.jug.x) > 3.2 || c.s < m.jug.s);
        m.ponerCoche(55, (i / 28) % 2 ? 2.25 : -2.2, i % 84 === 56 ? 1 : 0);
      }
      window.__noche.fotogramas(1);
    }, i);
    await page.screenshot({ path: `${dir}/f${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 88 });
  }
  const r = await page.evaluate(() => ({ roces: window.__noche.mundo.roces, puntos: window.__noche.mundo.puntos }));
  console.log('clip', r);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '30', '-i', `${dir}/f%04d.jpg`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'slow', '-movflags', '+faststart', `${SAL}/clip.mp4`]);
  await ctx.close();
}
await nav.close();
console.log('hecho');
