const { test, expect } = require('@playwright/test');

test('arranca sin errores de JavaScript y sin pedir nada a internet', async ({ page }) => {
  const errores = [];
  const externas = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('http://127.0.0.1') && !u.startsWith('data:') && !u.startsWith('blob:')) externas.push(u);
  });
  await page.goto('/index.html');
  await page.waitForTimeout(2000);
  expect(errores).toEqual([]);
  expect(externas).toEqual([]);
  expect(await page.evaluate(() => typeof THREE)).toBe('object');
  expect(await page.locator('canvas').count()).toBeGreaterThan(0);
});

test('un dato corrupto en localStorage no rompe el arranque', async ({ page }) => {
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem('fugaz.ajustes', '"basura"');
    localStorage.setItem('fugaz.record', '{no es json');
    localStorage.setItem('fugaz.registro', '12');
  });
  await page.goto('/index.html');
  await page.waitForTimeout(1500);
  expect(errores).toEqual([]);
});
