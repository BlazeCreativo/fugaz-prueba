// Depura una partida con el piloto automático: node herramientas/depurar.mjs [semilla]
import { crearMundo } from '../escape/js/mundo.js';
import { piloto } from './piloto.mjs';

const m = crearMundo({ semilla: +process.argv[2] || 3 });
const antes = new Map();
while (!m.fin) {
  for (const p of m.pol) antes.set(p.id, `${p.modo} dx ${(m.jug.x - p.x).toFixed(2)} ds ${(m.jug.s - p.s).toFixed(2)}`);
  const jx = m.jug.x.toFixed(2);
  for (const s of m.paso(1 / 60, piloto(m))) {
    if (s.tipo === 'golpe') console.log(m.t.toFixed(2), 'golpe', s.golpes, 'jx', jx, '·', [...antes.values()].join(' | '));
  }
}
console.log(m.fin, m.t.toFixed(1));
