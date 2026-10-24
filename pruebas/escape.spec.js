// Pruebas del prototipo «persecución y escape» (escape/index.html).
const { test, expect, devices } = require('@playwright/test');
const fs = require('fs');

const URL = '/escape/index.html';

// Vigila errores de JavaScript y peticiones fuera del servidor local.
function vigilar(page) {
  const v = { errores: [], externas: [] };
  page.on('pageerror', (e) => v.errores.push(e.message));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('http://127.0.0.1') && !u.startsWith('data:') && !u.startsWith('blob:')) v.externas.push(u);
  });
  return v;
}
const estado = (page) => page.evaluate(() => window.__escape.estado);
const resumen = (page) => page.evaluate(() => window.__escape.metricas.resumen());

test('PC: arranca, se juega con teclado y termina escapando', async ({ page }) => {
  const v = vigilar(page);
  await page.goto(`${URL}?prueba=1&duracion=4&invulnerable=1`);
  await expect(page.locator('#jugar')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect.poll(() => estado(page), { timeout: 3000 }).toBe('jugando');
  // Flecha derecha: el coche se mueve a la derecha.
  const x0 = await page.evaluate(() => window.__escape.mundo.jug.x);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  expect(await page.evaluate(() => window.__escape.mundo.jug.x)).toBeGreaterThan(x0 + 0.5);
  // Primera partida: tutorial de 10 s + 4 s de persecución.
  await page.evaluate(() => window.__escape.avanzar(20));
  await expect(page.locator('#fin')).toBeVisible({ timeout: 3000 });
  await expect(page.locator('#finTitulo')).toHaveText('ESCAPASTE');
  const r = await resumen(page);
  expect(r.partidas).toBe(1);
  expect(r.escapes).toBe(1);
  expect(r.primeraPartidaCompletadaSinExplicacion).toBe(true);
  expect(v.errores).toEqual([]);
  expect(v.externas).toEqual([]);
});

test('muerte rápida, queja de un toque y «una más» en menos de 2 s', async ({ page }) => {
  const v = vigilar(page);
  await page.addInitScript(() => localStorage.setItem('fugazEscape.tutorialSuperado', '1'));
  await page.goto(`${URL}?prueba=1&semilla=11`);
  await page.locator('#jugar').click({ force: true });
  await expect.poll(() => estado(page), { timeout: 3000 }).toBe('jugando');
  // Sin girar nunca, algo te mata antes de que acabe la partida.
  await page.evaluate(() => window.__escape.avanzar(80));
  await expect(page.locator('#fin')).toBeVisible({ timeout: 3000 });
  const fin = await page.evaluate(() => window.__escape.mundo.fin);
  expect(['choque', 'cazado']).toContain(fin.final);
  await expect(page.locator('#causa')).not.toBeEmpty();

  await page.locator('#queja').click();
  let r = await resumen(page);
  expect(r.quejasNoEntiendo).toBe(1);
  expect(Object.keys(r.quejasPorCausa)).toEqual([fin.causa]);

  const t0 = Date.now();
  await page.locator('#unamas').click();
  await expect.poll(() => estado(page), { timeout: 2000, intervals: [50] }).toBe('jugando');
  expect(Date.now() - t0).toBeLessThan(2000);
  r = await resumen(page);
  expect(r.partidas).toBe(2);
  expect(r.partidasPorSesion).toEqual([2]);
  expect(r.tiempoHastaUnaMasMedianaMs).not.toBeNull();
  expect(v.errores).toEqual([]);
});

test('el clip vertical se genera y el botón compartir lo entrega', async ({ page }) => {
  const v = vigilar(page);
  await page.addInitScript(() => localStorage.setItem('fugazEscape.tutorialSuperado', '1'));
  await page.goto(`${URL}?prueba=1&duracion=3&invulnerable=1`);
  await page.keyboard.press('Enter');
  await expect.poll(() => estado(page), { timeout: 3000 }).toBe('jugando');
  await page.waitForTimeout(1500); // algo de repetición dibujada
  await page.evaluate(() => window.__escape.avanzar(10));
  await expect(page.locator('#compartir')).toBeEnabled({ timeout: 25000 });
  const descarga = page.waitForEvent('download');
  await page.locator('#compartir').click();
  const d = await descarga;
  expect(d.suggestedFilename()).toMatch(/^fugaz-\d+\.(webm|mp4|png)$/);
  const r = await resumen(page);
  expect(r.botonCompartirUsado).toBe(1);
  expect(r.clipsCompartidos).toBe(1);
  expect(v.errores).toEqual([]);
});

test('las métricas se exportan como JSON desde el panel oculto (5 toques en el logo)', async ({ page }) => {
  await page.goto(URL);
  await page.locator('#logo').click({ clickCount: 5, delay: 30 });
  await expect(page.locator('#panel')).toBeVisible();
  const descarga = page.waitForEvent('download');
  await page.locator('#exportar').click();
  const d = await descarga;
  const json = JSON.parse(fs.readFileSync(await d.path(), 'utf8'));
  for (const k of ['primeraPartidaCompletadaSinExplicacion', 'partidasPorSesion', 'tiempoHastaUnaMasMedianaMs',
    'clipsCompartidos', 'volvioAlDiaSiguiente', 'quejasNoEntiendo']) expect(json.resumen).toHaveProperty(k);
  expect(json.datos.sesiones.length).toBe(1);
});

test('vuelta al día siguiente: se detecta con dos días seguidos', async ({ page }) => {
  await page.addInitScript(() => {
    const ayer = new Date(Date.now() - 86400000);
    const dia = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;
    if (!localStorage.getItem('fugazEscape.metricas')) {
      localStorage.setItem('fugazEscape.metricas', JSON.stringify({ version: 1, creado: 0, dias: [dia], sesiones: [], partidas: [], compartidos: [], quejas: [], ultimaActividad: 0 }));
    }
  });
  await page.goto(URL);
  const r = await resumen(page);
  expect(r.diasJugados).toBe(2);
  expect(r.volvioAlDiaSiguiente).toBe(true);
});

test('datos corruptos en localStorage no rompen el arranque', async ({ page }) => {
  const v = vigilar(page);
  await page.addInitScript(() => {
    localStorage.setItem('fugazEscape.metricas', '{no es json');
    localStorage.setItem('fugazEscape.record', 'basura');
  });
  await page.goto(URL);
  await page.keyboard.press('Enter');
  await expect.poll(() => estado(page), { timeout: 3000 }).toBe('jugando');
  expect(v.errores).toEqual([]);
});

test.describe('móvil', () => {
  const { defaultBrowserType, ...pixel5 } = devices['Pixel 5'];
  test.use(pixel5);

  test('se juega con un pulgar: deslizar gira el coche', async ({ page }) => {
    const v = vigilar(page);
    await page.goto(`${URL}?prueba=1&duracion=3&invulnerable=1`);
    await page.locator('#jugar').tap({ force: true });
    await expect.poll(() => estado(page), { timeout: 3000 }).toBe('jugando');
    await expect(page.locator('#guia')).toBeVisible(); // tutorial: la mano que desliza
    const x0 = await page.evaluate(() => window.__escape.mundo.jug.x);
    const zona = page.locator('#juego');
    await zona.dispatchEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: 200, clientY: 600, isPrimary: true });
    await zona.dispatchEvent('pointermove', { pointerId: 7, pointerType: 'touch', clientX: 120, clientY: 600, isPrimary: true });
    await page.waitForTimeout(500);
    await zona.dispatchEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: 120, clientY: 600, isPrimary: true });
    expect(await page.evaluate(() => window.__escape.mundo.jug.x)).toBeLessThan(x0 - 0.5);
    await page.evaluate(() => window.__escape.avanzar(20));
    await expect(page.locator('#fin')).toBeVisible({ timeout: 3000 });
    await page.locator('#unamas').tap();
    await expect.poll(() => estado(page), { timeout: 2000 }).toBe('jugando');
    expect(v.errores).toEqual([]);
  });
});
