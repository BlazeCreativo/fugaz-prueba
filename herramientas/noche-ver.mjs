// Abre el juego en Chromium sin pantalla, juega unos segundos y guarda capturas (para revisar a ojo).
// Uso: node herramientas/noche-ver.mjs <carpeta> [pc|movil] [cabina|fuera] [segundos]
import { chromium, devices } from 'playwright';
const [carpeta = 'test-results/ver', disp = 'pc', vista = 'cabina', seg = '4'] = process.argv.slice(2);
const nav = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const { defaultBrowserType, ...pixel5 } = devices['Pixel 5'];
const ctx = await nav.newContext(disp === 'movil' ? pixel5 : { viewport: { width: 1280, height: 720 } });
const page = await ctx.newPage();
const errores = [];
page.on('pageerror', (e) => errores.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
await page.addInitScript(([v, c]) => localStorage.setItem('fugazNoche.ajustes', JSON.stringify({ camara: v, control: 'pulgar', calidad: c })), [vista, process.env.CALIDAD || 'auto']);
await page.goto(`http://127.0.0.1:8123/index.html?fps=1&prueba=1&invulnerable=1&semilla=3`);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${carpeta}/menu.png` });
await page.keyboard.press('Enter');
await page.waitForTimeout(Number(seg) * 1000);
await page.screenshot({ path: `${carpeta}/juego.png` });
console.log(JSON.stringify(await page.evaluate(() => ({ estado: __noche.estado, t: __noche.mundo && __noche.mundo.t, fps: __noche.fps, nivel: __noche.nivel, info: __noche.escena.info() }))));
console.log('errores', errores);
await nav.close();
