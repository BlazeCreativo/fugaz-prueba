// Piloto automático sencillo para simular partidas: va al carril cuyo obstáculo más cercano está más lejos
// y se aparta de las patrullas que avisan que van a embestir.
import { C } from '../escape/js/config.js';

export function piloto(m) {
  const j = m.jug;
  let mejor = j.x, lejos = -Infinity;
  for (const x of [...C.carriles, j.x]) {
    let d = 200;
    for (const c of m.coches) {
      const cw = c.eje === 'x' ? 4.4 : 1.9;
      if (c.s > j.s - 3 && Math.abs(c.x - x) < (cw + 1.9) / 2 + 0.2) d = Math.min(d, c.s - j.s);
    }
    for (const b of m.bar) if (b.s > j.s - 2 && Math.abs(x - b.hueco) + 1.2 > b.ancho / 2) d = Math.min(d, b.s - j.s);
    for (const p of m.pol) {
      if (p.fuera || Math.abs(p.s - j.s) > 6) continue;
      const peligro = p.modo === 'aviso' || p.modo === 'embestida';
      if (peligro && Math.sign(x - p.x) !== Math.sign(j.x - p.x)) d -= 200;   // no cruzar por delante de la patrulla
      else if (Math.abs(x - p.x) < 3.4) d -= peligro ? 120 : 30;
    }
    d -= Math.abs(x - j.x) * 0.8;
    if (d > lejos) { lejos = d; mejor = x; }
  }
  // Si una patrulla acecha a tu lado y no hay nada cerca delante, embístela tú primero.
  const p = m.pol.find((q) => !q.fuera && Math.abs(q.s - j.s) < 3 && Math.abs(q.x - j.x) < 3.2 && q.modo === 'acecho');
  if (p && lejos > 60) return { giro: Math.sign(p.x - j.x) };
  return { giro: Math.max(-1, Math.min(1, (mejor - j.x) / 1.5)) };
}
