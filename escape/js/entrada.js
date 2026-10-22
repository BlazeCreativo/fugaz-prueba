// Control con un pulgar o con el teclado. Devuelve giro en [-1, 1].
// Táctil/ratón: apoya el dedo donde quieras y deslízalo; el giro es proporcional a lo que te has movido
// desde donde apoyaste (como un volante invisible). Teclado: ← → o A D.

const RECORRIDO_PX = 46; // píxeles de deslizamiento para girar a tope

export function crearEntrada(zona) {
  const e = { giro: 0, tocando: false, usado: false, teclas: { izq: false, der: false }, x0: 0, puntero: null, tipo: 'ninguno' };

  zona.addEventListener('pointerdown', (ev) => {
    if (e.puntero !== null) return;
    e.puntero = ev.pointerId;
    e.x0 = ev.clientX;
    e.tocando = true;
    e.tipo = ev.pointerType;
    try { zona.setPointerCapture(ev.pointerId); } catch { /* puntero sintético o ya soltado */ }
  });
  zona.addEventListener('pointermove', (ev) => {
    if (ev.pointerId !== e.puntero) return;
    let d = (ev.clientX - e.x0) / RECORRIDO_PX;
    // El origen se arrastra si te pasas: así nunca hay que volver al centro exacto.
    if (d > 1) { e.x0 = ev.clientX - RECORRIDO_PX; d = 1; }
    if (d < -1) { e.x0 = ev.clientX + RECORRIDO_PX; d = -1; }
    e.dedo = d;
    if (Math.abs(d) > 0.2) e.usado = true;
  });
  const soltar = (ev) => {
    if (ev.pointerId !== e.puntero) return;
    e.puntero = null; e.tocando = false; e.dedo = 0;
  };
  zona.addEventListener('pointerup', soltar);
  zona.addEventListener('pointercancel', soltar);

  const tecla = (ev, abajo) => {
    const k = ev.key;
    if (k === 'ArrowLeft' || k === 'a' || k === 'A') e.teclas.izq = abajo;
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') e.teclas.der = abajo;
    else return;
    e.tipo = 'teclado';
    if (abajo) e.usado = true;
    ev.preventDefault();
  };
  addEventListener('keydown', (ev) => tecla(ev, true));
  addEventListener('keyup', (ev) => tecla(ev, false));
  addEventListener('blur', () => { e.teclas.izq = e.teclas.der = false; e.puntero = null; e.dedo = 0; });

  e.dedo = 0;
  e.leer = (dt) => {
    const teclado = (e.teclas.der ? 1 : 0) - (e.teclas.izq ? 1 : 0);
    // Teclado con rampa corta para que un toque corto sea un giro corto.
    if (teclado) e.giro += (teclado - e.giro) * Math.min(1, dt * 14);
    else if (e.tocando) e.giro = e.dedo;
    else e.giro += (0 - e.giro) * Math.min(1, dt * 20);
    return { giro: e.giro };
  };
  e.reiniciar = () => { e.x0 = e.puntero !== null ? e.x0 : 0; e.giro = 0; };
  return e;
}
