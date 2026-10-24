// Capturas del prototipo para el informe: node herramientas/capturas.mjs [carpeta]
// Necesita el servidor local en marcha: python3 -m http.server 8123 --bind 127.0.0.1
import { chromium, devices } from 'playwright';
import { piloto } from './piloto.mjs';

const dir = process.argv[2] || 'ENCARGOS/informes/capturas';
const URL = 'http://127.0.0.1:8123/escape/index.html';
const navegador = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function sesion(nombre, contexto, pasos) {
  const ctx = await navegador.newContext(contexto);
  const page = await ctx.newPage();
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await page.goto(URL + (contexto.query || ''));
  await page.waitForTimeout(800);
  await pasos(page, async (n) => page.screenshot({ path: `${dir}/${nombre}-${n}.png` }));
  if (errores.length) console.log(nombre, 'ERRORES', errores);
  await ctx.close();
}

const pilotoTexto = `(${piloto.toString()})`;
const avanzar = (page, s) => page.evaluate(([s, p]) => {
  const C = { carriles: [-6, -2, 2, 6] };
  const piloto = eval(p);
  return window.__escape.avanzar(s, piloto);
}, [s, pilotoTexto]);

await sesion('movil', { ...devices['Pixel 5'] }, async (page, foto) => {
  await foto('1-inicio');
  await page.locator('#jugar').tap({ force: true });
  await page.waitForTimeout(400);
  await foto('2-cuenta');
  await page.waitForTimeout(1400);
  await foto('3-tutorial');
  await avanzar(page, 9);
  await page.waitForTimeout(300);
  await foto('4-persecucion');
  await avanzar(page, 14);
  await page.waitForTimeout(300);
  await foto('5-mas-tarde');
  await page.evaluate(() => window.__escape.avanzar(120));
  await page.waitForTimeout(2500);
  await foto('6-final');
  await page.waitForTimeout(9000);
  await foto('7-final-clip');
});

await sesion('pc', { viewport: { width: 1280, height: 720 } }, async (page, foto) => {
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1500);
  await avanzar(page, 25);
  await page.waitForTimeout(300);
  await foto('1-persecucion');
  await page.evaluate(() => window.__escape.avanzar(120));
  await page.waitForTimeout(1000);
  await foto('2-final');
  await page.keyboard.press('Shift+M');
  await page.waitForTimeout(300);
  await foto('3-metricas');
});

await navegador.close();
