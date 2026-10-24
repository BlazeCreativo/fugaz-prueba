// Carga la lógica de noche/ (scripts clásicos) en node para simular sin navegador.
import fs from 'fs';
import vm from 'vm';
import path from 'path';
import { fileURLToPath } from 'url';
const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'noche');
for (const f of ['config.js', 'pista.js', 'mundo.js']) vm.runInThisContext(fs.readFileSync(path.join(raiz, f), 'utf8'), { filename: f });
export const N = globalThis.N;

// El piloto automático vive en noche/mundo.js (también lo usa el menú del juego).
export const piloto = (m) => N.piloto(m);
