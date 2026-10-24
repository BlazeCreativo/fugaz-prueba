// Simula partidas de «Noche en autopista» con el piloto automático, para ajustar la dificultad.
// Uso: node herramientas/noche-simular.mjs 30
import { N, piloto } from './noche-cargar.mjs';
const n = Number(process.argv[2]) || 20;
let suma = { t: 0, puntos: 0, roces: 0, choques: 0, vivo: 0 }, us = 0, pasos = 0;
for (let i = 0; i < n; i++) {
  const m = N.crearMundo({ semilla: 1000 + i });
  const t0 = performance.now();
  while (!m.fin) { m.paso(1 / 60, piloto(m)); pasos++; m.eventos.length = 0; }
  us += (performance.now() - t0) * 1000;
  suma.t += m.fin.t; suma.puntos += m.fin.puntos; suma.roces += m.fin.roces; suma.choques += m.choques;
  if (m.fin.final === 'tiempo') suma.vivo++;
}
console.log(`partidas ${n}: duración media ${(suma.t / n).toFixed(1)} s, llegan al final ${suma.vivo}, puntos ${Math.round(suma.puntos / n)}, roces ${(suma.roces / n).toFixed(1)}, choques ${(suma.choques / n).toFixed(1)}; lógica ${(us / pasos).toFixed(1)} µs/paso`);
