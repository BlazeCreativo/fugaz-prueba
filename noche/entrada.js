// Controles: teclado, mando (Gamepad API) y móvil con tres modos.
//  · pulgar: apoya el dedo donde quieras y deslízalo a los lados para girar; hacia abajo frena, hacia arriba turbo.
//  · zonas: mitad izquierda gira a la izquierda, mitad derecha a la derecha; las dos a la vez frenan.
//  · inclinar: inclina el móvil para girar; mantener el dedo frena.
// Devuelve { giro: -1..1, freno: 0..1, gas: 0..1 } y avisa de los botones (empezar, cámara).
(function (N) {
  const RECORRIDO = 48;  // px de deslizamiento para girar a tope
  const VERTICAL = 42;   // px hacia abajo o arriba para frenar o turbo

  N.crearEntrada = function (zona, op = {}) {
    const e = {
      modo: op.modo || 'pulgar', tipo: 'ninguno', usado: false,
      teclas: {}, dedos: new Map(), giro: 0, inclinacion: 0, hayInclinacion: false,
      alPulsar: null,      // función(accion) para 'empezar' y 'camara'
      mando: { conectado: false, antes: {} },
    };
    const accion = (a) => { if (e.alPulsar) e.alPulsar(a); };

    // -------------------------------------------------------- teclado
    const MAPA = { ArrowLeft: 'izq', a: 'izq', A: 'izq', ArrowRight: 'der', d: 'der', D: 'der',
      ArrowUp: 'gas', w: 'gas', W: 'gas', ArrowDown: 'freno', s: 'freno', S: 'freno', ' ': 'freno' };
    addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { accion('empezar'); ev.preventDefault(); return; }
      if (ev.key === 'c' || ev.key === 'C' || ev.key === 'v' || ev.key === 'V') { accion('camara'); return; }
      const k = MAPA[ev.key];
      if (!k) return;
      if (ev.key === ' ' && !e.jugando) { accion('empezar'); ev.preventDefault(); return; }
      e.teclas[k] = true; e.tipo = 'teclado'; e.usado = true; ev.preventDefault();
    });
    addEventListener('keyup', (ev) => { const k = MAPA[ev.key]; if (k) e.teclas[k] = false; });
    addEventListener('blur', () => { e.teclas = {}; e.dedos.clear(); });

    // -------------------------------------------------------- táctil y ratón
    zona.addEventListener('pointerdown', (ev) => {
      e.dedos.set(ev.pointerId, { x0: ev.clientX, y0: ev.clientY, x: ev.clientX, y: ev.clientY, t: performance.now() });
      e.tipo = ev.pointerType === 'mouse' ? 'raton' : 'tactil';
      try { zona.setPointerCapture(ev.pointerId); } catch (_) { /* puntero sintético */ }
      ev.preventDefault();
    });
    zona.addEventListener('pointermove', (ev) => {
      const d = e.dedos.get(ev.pointerId);
      if (!d) return;
      d.x = ev.clientX; d.y = ev.clientY;
      // el origen se arrastra si te pasas: nunca hay que volver al centro exacto
      if (d.x - d.x0 > RECORRIDO) d.x0 = d.x - RECORRIDO;
      if (d.x - d.x0 < -RECORRIDO) d.x0 = d.x + RECORRIDO;
      if (Math.abs(d.x - d.x0) > 10) e.usado = true;
    });
    const soltar = (ev) => {
      const eraPrimero = e.dedos.keys().next().value === ev.pointerId;
      e.dedos.delete(ev.pointerId);
      // si el que queda pasa a mandar, empieza desde donde está: sin saltos de volante
      if (eraPrimero) for (const d of e.dedos.values()) { d.x0 = d.x; d.y0 = d.y; break; }
    };
    zona.addEventListener('pointerup', soltar);
    zona.addEventListener('pointercancel', soltar);

    // -------------------------------------------------------- inclinación
    function alInclinar(ev) {
      if (ev.gamma == null) return;
      e.hayInclinacion = true;
      const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
      let v = ev.gamma;                     // vertical: inclinar a los lados
      if (ang === 90) v = ev.beta;          // apaisado: el eje cambia
      else if (ang === -90 || ang === 270) v = -ev.beta;
      e.inclinacion = Math.max(-1, Math.min(1, v / 24));
    }
    e.pedirInclinacion = async () => {
      try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
          const r = await DeviceOrientationEvent.requestPermission();
          if (r !== 'granted') return false;
        }
        addEventListener('deviceorientation', alInclinar);
        return true;
      } catch (_) { return false; }
    };

    // -------------------------------------------------------- mando
    function leerMando() {
      const lista = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of lista) {
        if (!gp || !gp.connected) continue;
        e.mando.conectado = true;
        const b = (i) => (gp.buttons[i] ? (gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0)) : 0);
        let giro = gp.axes[0] || 0;
        if (Math.abs(giro) < 0.12) giro = 0;
        if (b(14)) giro = -1; if (b(15)) giro = 1;
        const r = { giro, gas: Math.max(b(7), b(12)), freno: Math.max(b(6), b(1), b(13)) };
        // flancos de botón: A empieza / una más; Y cambia la cámara
        const ahora = { a: b(0) > 0.5 || b(9) > 0.5, y: b(3) > 0.5 };
        if (ahora.a && !e.mando.antes.a) accion('empezar');
        if (ahora.y && !e.mando.antes.y) accion('camara');
        e.mando.antes = ahora;
        if (giro || r.gas || r.freno) { e.tipo = 'mando'; e.usado = true; }
        return r;
      }
      return null;
    }

    // -------------------------------------------------------- lectura por fotograma
    e.leer = function (dt) {
      const T = e.teclas;
      let giro = 0, freno = 0, gas = 0, hay = false;
      const teclado = (T.der ? 1 : 0) - (T.izq ? 1 : 0);
      if (teclado || T.freno || T.gas) {
        hay = true;
        e.giro += (teclado - e.giro) * Math.min(1, dt * 12); // rampa corta: un toque corto es un giro corto
        giro = e.giro; freno = T.freno ? 1 : 0; gas = T.gas ? 1 : 0;
      }
      const gp = leerMando();
      if (!hay && gp && (gp.giro || gp.gas || gp.freno)) { hay = true; giro = gp.giro; freno = gp.freno; gas = gp.gas; e.giro = giro; }
      if (!hay && e.dedos.size) {
        hay = true;
        const dedos = [...e.dedos.values()];
        if (e.modo === 'zonas') {
          let izq = false, der = false;
          for (const d of dedos) { if (d.x < innerWidth / 2) izq = true; else der = true; }
          if (izq && der) freno = 1;
          else { const obj = izq ? -1 : 1; e.giro += (obj - e.giro) * Math.min(1, dt * 9); giro = e.giro; }
        } else if (e.modo === 'inclinar') {
          freno = 1; giro = e.inclinacion;
        } else {
          const d = dedos[0];
          giro = Math.max(-1, Math.min(1, (d.x - d.x0) / RECORRIDO));
          const dy = d.y - d.y0;
          if (dy > VERTICAL) freno = 1;
          else if (dy < -VERTICAL) gas = 1;
          e.giro = giro;
        }
      }
      if (!hay) {
        if (e.modo === 'inclinar' && e.hayInclinacion) giro = e.inclinacion;
        else { e.giro += (0 - e.giro) * Math.min(1, dt * 14); giro = Math.abs(e.giro) < 0.02 ? 0 : e.giro; }
      }
      return { giro, freno, gas };
    };
    e.reiniciar = () => {
      e.giro = 0;
      for (const d of e.dedos.values()) { d.x0 = d.x; d.y0 = d.y; } // si el dedo sigue apoyado, empieza recto
    };
    return e;
  };
})(window.N = window.N || {});
