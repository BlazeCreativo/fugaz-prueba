// Pruebas de FUGAZ v13 «Noche en autopista» (index.html de la raíz).
const { test, expect, devices } = require('@playwright/test');

const URL = '/index.html';
function vigilar(page) {
  const v = { errores: [], externas: [] };
  page.on('pageerror', (e) => v.errores.push(e.message));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('http://127.0.0.1') && !u.startsWith('data:') && !u.startsWith('blob:')) v.externas.push(u);
  });
  return v;
}
const estado = (page) => page.evaluate(() => window.__noche.estado);
const jug = (page) => page.evaluate(() => { const j = window.__noche.mundo.jug; return { x: j.x, v: j.v, vidas: j.vidas }; });
const mundo = (page) => page.evaluate(() => { const m = window.__noche.mundo; return { roces: m.roces, mult: m.mult, combo: m.combo, puntos: m.puntos, choques: m.choques, fin: m.fin }; });

test('PC: arranca con un clic, se juega con teclado, termina, guarda récord y «una más» en menos de 2 s', async ({ page }) => {
  const v = vigilar(page);
  await page.goto(`${URL}?prueba=1&duracion=5&invulnerable=1&semilla=4`);
  await expect(page.locator('#jugar')).toBeVisible();
  await page.locator('#jugar').click();
  await expect.poll(() => estado(page), { timeout: 4000 }).toBe('jugando');
  await expect(page.locator('#guia')).toBeVisible(); // primera partida: guía de teclas
  // derecha mueve el coche a la derecha
  const a = await jug(page);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(400); await page.keyboard.up('ArrowRight');
  const b = await jug(page);
  expect(b.x).toBeGreaterThan(a.x + 0.5);
  // abajo frena
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(500);
  const c = await jug(page);
  await page.keyboard.up('ArrowDown');
  expect(c.v).toBeLessThan(b.v - 2);
  // hasta el final
  await page.evaluate(() => window.__noche.avanzar(8));
  await expect(page.locator('#fin')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#finTitulo')).toHaveText('FIN DEL TIEMPO');
  await expect(page.locator('#finRecord')).toBeVisible();
  const record = await page.evaluate(() => Number(localStorage.getItem('fugazNoche.record')));
  expect(record).toBeGreaterThan(0);
  // una más con Intro
  await page.waitForTimeout(400);
  const t0 = Date.now();
  await page.keyboard.press('Enter');
  await expect.poll(() => estado(page), { timeout: 2000, intervals: [50] }).toBe('jugando');
  expect(Date.now() - t0).toBeLessThan(2000);
  await expect(page.locator('#guia')).toBeHidden(); // la guía solo sale la primera vez
  expect(v.errores).toEqual([]);
  expect(v.externas).toEqual([]);
});

test('partida completa sin trucos: algo la termina (tiempo o siniestro) y la pantalla final lo dice', async ({ page }) => {
  const v = vigilar(page);
  await page.goto(`${URL}?prueba=1&semilla=21`);
  await page.keyboard.press('Enter');
  await expect.poll(() => estado(page), { timeout: 4000 }).toBe('jugando');
  await page.evaluate(() => window.__noche.avanzar(100)); // sin tocar nada
  await expect(page.locator('#fin')).toBeVisible({ timeout: 4000 });
  const m = await mundo(page);
  expect(['tiempo', 'choque']).toContain(m.fin.final);
  await expect(page.locator('#finTitulo')).toHaveText(m.fin.final === 'choque' ? 'SINIESTRO' : 'FIN DEL TIEMPO');
  expect(v.errores).toEqual([]);
});

test('roce: pasar rozando suma puntos y sube el multiplicador; frenar pierde el combo', async ({ page }) => {
  const v = vigilar(page);
  await page.goto(`${URL}?prueba=1&sinTrafico=1&semilla=5`);
  await page.keyboard.press('Enter');
  await expect.poll(() => estado(page), { timeout: 4000 }).toBe('jugando');
  await page.evaluate(() => { window.__noche.mundo.ponerCoche(30, 2.1); window.__noche.avanzar(2); });
  let m = await mundo(page);
  expect(m.roces).toBe(1);
  expect(m.mult).toBeGreaterThan(1);
  expect(m.combo).toBe(1);
  await expect(page.locator('#avisos')).toHaveAttribute('data-ultimo', /AL LÍMITE|ROCE/);
  // pasar lejos no cuenta
  await page.evaluate(() => { window.__noche.mundo.ponerCoche(30, 4.5); window.__noche.avanzar(2); });
  expect((await mundo(page)).roces).toBe(1);
  await page.keyboard.down('ArrowDown'); await page.waitForTimeout(500); await page.keyboard.up('ArrowDown');
  m = await mundo(page);
  expect(m.combo).toBe(0);
  expect(m.mult).toBe(1);
  expect(v.errores).toEqual([]);
});

test('choques: cada golpe quita una vida y el tercero acaba la partida', async ({ page }) => {
  const v = vigilar(page);
  await page.goto(`${URL}?prueba=1&sinTrafico=1&semilla=6`);
  await page.keyboard.press('Enter');
  await expect.poll(() => estado(page), { timeout: 4000 }).toBe('jugando');
  for (let i = 1; i <= 3; i++) {
    await page.evaluate(() => { window.__noche.mundo.ponerCoche(25, 0); window.__noche.avanzar(2.5); });
    if (i < 3) expect((await jug(page)).vidas).toBe(3 - i);
  }
  await expect(page.locator('#fin')).toBeVisible({ timeout: 4000 });
  await expect(page.locator('#finTitulo')).toHaveText('SINIESTRO');
  expect(v.errores).toEqual([]);
});

test('mando (Gamepad API): A empieza, el stick gira, Y cambia la cámara', async ({ page }) => {
  const v = vigilar(page);
  await page.addInitScript(() => {
    window.__pad = { axes: [0, 0, 0, 0], botones: Array(17).fill(0) };
    navigator.getGamepads = () => [{ connected: true, id: 'mando de prueba', axes: window.__pad.axes,
      buttons: window.__pad.botones.map((b) => ({ value: b, pressed: b > 0.5 })) }];
  });
  await page.goto(`${URL}?prueba=1&sinTrafico=1`);
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__pad.botones[0] = 1; });
  await expect.poll(() => estado(page), { timeout: 4000 }).not.toBe('inicio');
  await page.evaluate(() => { window.__pad.botones[0] = 0; });
  await expect.poll(() => estado(page), { timeout: 4000 }).toBe('jugando');
  const a = await jug(page);
  await page.evaluate(() => { window.__pad.axes[0] = -1; });
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__pad.axes[0] = 0; });
  expect((await jug(page)).x).toBeLessThan(a.x - 0.5);
  const vista0 = await page.evaluate(() => window.__noche.escena.vista);
  await page.evaluate(() => { window.__pad.botones[3] = 1; });
  await expect.poll(() => page.evaluate(() => window.__noche.escena.vista), { timeout: 3000 }).not.toBe(vista0);
  await page.evaluate(() => { window.__pad.botones[3] = 0; });
  expect(v.errores).toEqual([]);
});

test('cámara: C alterna cabina y fuera; calidad alta (con posproceso) dibuja sin errores', async ({ page }) => {
  const v = vigilar(page);
  await page.addInitScript(() => localStorage.setItem('fugazNoche.ajustes', JSON.stringify({ camara: 'cabina', control: 'pulgar', calidad: 'alta' })));
  await page.goto(`${URL}?prueba=1&invulnerable=1`);
  await page.keyboard.press('Enter');
  await expect.poll(() => estado(page), { timeout: 4000 }).toBe('jugando');
  expect(await page.evaluate(() => window.__noche.nivel)).toBe('alta');
  await page.keyboard.press('c');
  expect(await page.evaluate(() => window.__noche.escena.vista)).toBe('fuera');
  await expect(page.locator('#relojesFuera')).toBeVisible();
  await page.waitForTimeout(600);
  await page.keyboard.press('c');
  expect(await page.evaluate(() => window.__noche.escena.vista)).toBe('cabina');
  expect(v.errores).toEqual([]);
});

test('datos corruptos en localStorage no rompen el arranque', async ({ page }) => {
  const v = vigilar(page);
  await page.addInitScript(() => {
    localStorage.setItem('fugazNoche.ajustes', '{no es json');
    localStorage.setItem('fugazNoche.record', 'basura');
  });
  await page.goto(URL);
  await expect(page.locator('#record')).toBeEmpty();
  await page.keyboard.press('Enter');
  await expect.poll(() => estado(page), { timeout: 4000 }).toBe('jugando');
  expect(v.errores).toEqual([]);
});

test('el menú enlaza a las versiones anteriores (v12 y escape)', async ({ page }) => {
  await page.goto(URL);
  await expect(page.locator('#otras a[href="v12/index.html"]')).toBeVisible();
  await expect(page.locator('#otras a[href="escape/index.html"]')).toBeVisible();
});

test.describe('móvil', () => {
  const { defaultBrowserType, ...pixel5 } = devices['Pixel 5'];
  test.use(pixel5);
  const dedo = async (zona, tipo, id, x, y) => zona.dispatchEvent(tipo, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, isPrimary: id === 1 });

  test('a un pulgar: deslizar gira, abajo frena, partida completa y «una más»', async ({ page }) => {
    const v = vigilar(page);
    await page.goto(`${URL}?prueba=1&duracion=5&invulnerable=1&sinTrafico=1`);
    await page.locator('#jugar').tap();
    await expect.poll(() => estado(page), { timeout: 4000 }).toBe('jugando');
    await expect(page.locator('#guia .tactil')).toBeVisible();
    const zona = page.locator('#juego');
    const a = await jug(page);
    await dedo(zona, 'pointerdown', 1, 200, 600);
    await dedo(zona, 'pointermove', 1, 130, 600);
    await page.waitForTimeout(400);
    const b = await jug(page);
    expect(b.x).toBeLessThan(a.x - 0.5);
    await dedo(zona, 'pointermove', 1, 130, 680); // abajo: frena
    await page.waitForTimeout(500);
    expect((await jug(page)).v).toBeLessThan(b.v - 2);
    await dedo(zona, 'pointerup', 1, 130, 680);
    await page.evaluate(() => window.__noche.avanzar(8));
    await expect(page.locator('#fin')).toBeVisible({ timeout: 4000 });
    await page.waitForTimeout(400);
    const t0 = Date.now();
    await page.locator('#unamas').tap();
    await expect.poll(() => estado(page), { timeout: 2000, intervals: [50] }).toBe('jugando');
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(v.errores).toEqual([]);
    expect(v.externas).toEqual([]);
  });

  test('dos zonas: tocar la derecha gira a la derecha; el botón de cámara no gira', async ({ page }) => {
    const v = vigilar(page);
    await page.goto(`${URL}?prueba=1&invulnerable=1&sinTrafico=1`);
    await page.locator('#opControl button[data-v="zonas"]').tap();
    await page.locator('#jugar').tap();
    await expect.poll(() => estado(page), { timeout: 4000 }).toBe('jugando');
    const zona = page.locator('#juego');
    const a = await jug(page);
    await dedo(zona, 'pointerdown', 1, 330, 500);
    await page.waitForTimeout(400);
    await dedo(zona, 'pointerup', 1, 330, 500);
    expect((await jug(page)).x).toBeGreaterThan(a.x + 0.5);
    const vista0 = await page.evaluate(() => window.__noche.escena.vista);
    await page.locator('#btnCam').tap();
    expect(await page.evaluate(() => window.__noche.escena.vista)).not.toBe(vista0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fugazNoche.ajustes')).control)).toBe('zonas');
    expect(v.errores).toEqual([]);
  });
});

test('se abre con doble clic (file://) sin servidor', async ({ page }) => {
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.goto('file://' + require('path').join(__dirname, '..', 'index.html') + '?prueba=1&invulnerable=1');
  await page.locator('#jugar').click();
  await expect.poll(() => estado(page), { timeout: 5000 }).toBe('jugando');
  expect(errores).toEqual([]);
});
