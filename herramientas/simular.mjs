// Simula partidas sin pantalla para ajustar la dificultad: node herramientas/simular.mjs [n] [quieto]
import { crearMundo } from '../escape/js/mundo.js';
import { piloto } from './piloto.mjs';

const n = +process.argv[2] || 20;
const quieto = process.argv[3] === 'quieto';
const res = { escape: 0, choque: 0, cazado: 0 };
const causas = {};
let tSum = 0, roces = 0, caidas = 0;
for (let i = 0; i < n; i++) {
  const m = crearMundo({ semilla: i + 1, tutorial: i % 4 === 0 });
  while (!m.fin) m.paso(1 / 60, quieto ? { giro: 0 } : piloto(m));
  res[m.fin.final]++;
  causas[m.fin.causa] = (causas[m.fin.causa] || 0) + 1;
  tSum += m.t; roces += m.roces; caidas += m.caidas;
}
console.log({ n, quieto, ...res, causas, tMedio: (tSum / n).toFixed(1), roces: (roces / n).toFixed(1), caidas: (caidas / n).toFixed(1) });
