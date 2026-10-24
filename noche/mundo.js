// Lógica de una partida de «Noche en autopista»: coche del jugador, tráfico, roces, combo, choques y final.
// Pura: sin three.js ni DOM, se puede simular en node (herramientas/noche-simular.mjs).
// Coordenadas: s = metros recorridos por la autopista; x = metros a la derecha del eje central.
(function (N) {
  const TIPOS = [
    { nombre: 'turismo', largo: 4.5, ancho: 1.8, alto: 1.45 },
    { nombre: 'furgoneta', largo: 5.2, ancho: 2.0, alto: 2.2 },
    { nombre: 'camion', largo: 9.5, ancho: 2.45, alto: 3.4 },
  ];
  N.TIPOS = TIPOS;
  const COLORES = [0xb8bcc4, 0x20232a, 0x7a1418, 0x123a6b, 0xe8e8e2, 0x3c4a3a, 0x5d5f66, 0x8a6a2a, 0x1c1c22, 0x9aa3ad];

  N.crearMundo = function (op = {}) {
    const C = N.C;
    const semilla = op.semilla || 1;
    const rnd = N.azar(semilla);
    const pista = N.crearPista(semilla);
    const duracion = op.duracion || C.duracion;
    const jug = {
      s: 30, x: pista.carril(2), v: N.ms(C.velIniKmh), vx: 0, giro: 0, freno: 0, gas: 0,
      vidas: op.vidas || C.vidas, invul: 0, rozandoMuro: 0, frenando: 0,
      largo: C.largo, ancho: C.ancho,
    };
    const m = {
      semilla, pista, jug, coches: [], t: 0, duracion, fin: null, eventos: [],
      puntos: 0, mult: 1, combo: 0, comboT: 0, roces: 0, alLimite: 0, multMax: 1, velMax: 0, choques: 0,
      invulnerable: !!op.invulnerable, sinTrafico: !!op.sinTrafico,
    };
    let idSig = 1;

    // ---------------------------------------------------------------- tráfico
    function densidad() { const f = Math.min(1, m.t / (duracion * 0.8)); return C.densidad[0] + (C.densidad[1] - C.densidad[0]) * f; }
    function libre(carril, s, margen, excepto) {
      const x = pista.carril(carril);
      for (const c of m.coches) {
        if (c === excepto) continue;
        const cx = c.cambio ? pista.carril(c.cambio.destino) : c.x;
        if ((Math.abs(c.x - x) < 2.5 || Math.abs(cx - x) < 2.5) && Math.abs(c.s - s) < margen + c.largo / 2) return false;
      }
      return true;
    }
    // Nunca se tapan todos los carriles a la vez: siempre queda un hueco por donde pasar.
    function dejaHueco(carril, s) {
      const ocupados = new Set([carril]);
      for (const c of m.coches) if (Math.abs(c.s - s) < 16) ocupados.add(c.cambio ? c.cambio.destino : c.carril);
      return ocupados.size < C.carriles;
    }
    function crearCoche(s, carril, tipoN) {
      const tipo = TIPOS[tipoN];
      const vk = C.trafVelKmh[0] + (C.trafVelKmh[1] - C.trafVelKmh[0]) * rnd() - (tipoN === 2 ? 15 : 0) - carril * 0;
      const c = {
        id: idSig++, s, carril, x: pista.carril(carril), v: N.ms(vk), vObj: N.ms(vk), tipo: tipoN,
        largo: tipo.largo, ancho: tipo.ancho, alto: tipo.alto, color: COLORES[Math.floor(rnd() * COLORES.length)],
        cambio: null, proxCambio: rnd.entre(C.cambioCarril[0], C.cambioCarril[1]) * (0.4 + rnd()),
        pasado: false, chocado: false, frenando: 0, intermitente: 0, golpeado: 0, vy: 0,
      };
      m.coches.push(c);
      return c;
    }
    function generar() {
      if (m.sinTrafico) return;
      const enVista = m.coches.filter((c) => c.s > jug.s - 20).length;
      const objetivo = densidad() * (C.apareceDelante[1] + 20) / 400;
      let intentos = 6;
      while (m.coches.length < objetivo + 4 && enVista < objetivo && intentos-- > 0) {
        const s = jug.s + rnd.entre(C.apareceDelante[0], C.apareceDelante[1]);
        const tipoN = rnd() < 0.12 ? 2 : rnd() < 0.2 ? 1 : 0;
        const carril = tipoN === 2 ? rnd.ent(C.carriles - 2, C.carriles - 1) : rnd.ent(0, C.carriles - 1);
        if (libre(carril, s, 14) && dejaHueco(carril, s)) { crearCoche(s, carril, tipoN); break; }
      }
    }
    // Arranque: unos cuantos coches ya repartidos por delante.
    if (!m.sinTrafico) for (let s = 110; s < 420; s += rnd.entre(18, 34)) {
      const carril = rnd.ent(0, C.carriles - 1);
      if (libre(carril, s, 14) && dejaHueco(carril, s)) crearCoche(s, carril, rnd() < 0.1 ? 1 : 0);
    }

    function moverTrafico(dt) {
      for (const c of m.coches) {
        if (c.fijo) { c.s += c.v * dt; continue; }
        if (c.chocado) { // tras un golpe: se frena y se queda donde está
          c.v = Math.max(0, c.v - 14 * dt); c.s += c.v * dt; c.golpeado += dt; continue;
        }
        // seguir al de delante en el mismo carril
        let delante = null, dist = 1e9;
        for (const o of m.coches) {
          if (o === c || Math.abs(o.x - c.x) > 2.2) continue;
          const d = o.s - c.s;
          if (d > 0 && d < dist) { dist = d; delante = o; }
        }
        let vObj = c.vObj;
        if (delante && dist < 32) vObj = Math.min(vObj, delante.v - (dist < 14 ? 3 : 0));
        const antes = c.v;
        c.v += Math.max(-9 * dt, Math.min(3 * dt, vObj - c.v));
        c.frenando = c.v < antes - 0.02 ? 0.4 : Math.max(0, c.frenando - dt);
        c.s += c.v * dt;
        // cambio de carril con intermitente
        if (c.cambio) {
          const k = c.cambio;
          k.t += dt;
          if (k.t > C.intermitente) {
            const u = Math.min(1, (k.t - C.intermitente) / C.duracionCambio);
            const e = u * u * (3 - 2 * u);
            c.x = k.x0 + (pista.carril(k.destino) - k.x0) * e;
            if (u >= 1) { c.carril = k.destino; c.cambio = null; c.intermitente = 0; }
          }
          if (c.cambio) c.intermitente = k.dir;
        } else {
          c.proxCambio -= dt;
          const quiere = c.proxCambio < 0 || (delante && dist < 24 && delante.v < c.v - 2);
          if (quiere) {
            c.proxCambio = rnd.entre(C.cambioCarril[0], C.cambioCarril[1]);
            const dir = rnd() < 0.5 ? -1 : 1;
            for (const d of [dir, -dir]) {
              const dest = c.carril + d;
              if (dest < 0 || dest >= C.carriles || (c.tipo === 2 && dest < C.carriles - 2)) continue;
              // no se te mete encima si estás justo al lado
              const jugCerca = Math.abs(jug.x - pista.carril(dest)) < 2.6 && Math.abs(jug.s - c.s) < 14;
              if (!jugCerca && libre(dest, c.s, 16, c) && dejaHueco(dest, c.s)) {
                c.cambio = { destino: dest, dir: d, t: 0, x0: c.x }; break;
              }
            }
          }
        }
      }
      m.coches = m.coches.filter((c) => c.s > jug.s - 70 && c.s < jug.s + 600);
    }

    // ---------------------------------------------------------------- combo
    function perderCombo(motivo) {
      if (m.combo > 0 || m.mult > 1) m.eventos.push({ tipo: 'comboPerdido', motivo, combo: m.combo });
      m.combo = 0; m.mult = 1; m.comboT = 0;
    }
    function roce(c, hueco) {
      const limite = hueco < C.alLimite;
      const cercania = 1 + 2 * (1 - hueco / C.roceHueco);
      const vel = Math.max(0.6, jug.v / N.ms(150));
      const pts = Math.round(C.puntosRoce * cercania * vel * (limite ? 1.5 : 1) * m.mult / 10) * 10;
      m.puntos += pts;
      m.roces++; if (limite) m.alLimite++;
      m.combo++;
      m.mult = Math.min(C.multMax, m.mult + C.subeMult * (limite ? 2 : 1));
      m.multMax = Math.max(m.multMax, m.mult);
      m.comboT = C.comboVida;
      m.eventos.push({ tipo: 'roce', puntos: pts, hueco, limite, mult: m.mult, lado: Math.sign(c.x - jug.x), id: c.id });
    }
    function choque(c, causa) {
      m.choques++;
      perderCombo('choque');
      m.eventos.push({ tipo: 'choque', causa, id: c ? c.id : null });
      if (c) {
        c.chocado = true; c.cambio = null; c.intermitente = 0;
        c.v = Math.max(c.v, jug.v * 0.7);
        jug.v = Math.max(N.ms(C.velMinKmh), Math.min(jug.v, c.v) * 0.55);
        jug.vx = -Math.sign(c.x - jug.x || 1) * 6;
      }
      if (m.invulnerable) { jug.invul = C.invulTrasChoque; return; }
      jug.vidas--;
      jug.invul = C.invulTrasChoque;
      if (jug.vidas <= 0) terminar('choque', causa);
    }
    function terminar(final, causa) {
      if (m.fin) return;
      m.fin = { final, causa: causa || null, puntos: Math.round(m.puntos), roces: m.roces, alLimite: m.alLimite,
        multMax: m.multMax, velMaxKmh: Math.round(N.kmh(m.velMax)), distancia: Math.round(jug.s - 30), t: m.t };
      m.eventos.push({ tipo: 'fin', final });
    }

    // ---------------------------------------------------------------- paso
    // entrada: { giro: -1..1, freno: 0..1, gas: 0..1 }
    m.paso = function (dt, ent) {
      if (m.fin) return;
      m.t += dt;
      const J = jug;
      J.giro = ent.giro || 0; J.freno = ent.freno || 0; J.gas = ent.gas || 0;
      // velocidad
      const f = Math.min(1, m.t / C.rampaCrucero);
      const crucero = N.ms(C.velIniKmh + (C.velMaxKmh - C.velIniKmh) * f + C.turboKmh * J.gas);
      if (J.freno > 0.05) J.v = Math.max(N.ms(C.velMinKmh), J.v - C.frenada * J.freno * dt);
      else J.v += Math.max(-C.acel * 1.5 * dt, Math.min(C.acel * dt, crucero - J.v));
      m.velMax = Math.max(m.velMax, J.v);
      // lateral: el giro fija la velocidad lateral; la curva te empuja hacia fuera
      const k = pista.curv(J.s);
      const vxObj = J.giro * C.lateralMax * Math.min(1, 0.55 + J.v / 90);
      J.vx += (vxObj - J.vx) * Math.min(1, C.respuestaLateral * dt);
      J.x += (J.vx - k * J.v * J.v * C.empujeCurva) * dt;
      J.s += J.v * dt;
      // muros
      const lim = pista.muro - J.ancho / 2;
      J.rozandoMuro = 0;
      if (Math.abs(J.x) > lim) {
        J.rozandoMuro = Math.sign(J.x);
        J.x = Math.sign(J.x) * lim;
        if (Math.sign(J.vx) === J.rozandoMuro) J.vx *= -0.3;
        J.v = Math.max(N.ms(C.velMinKmh), J.v - C.roceMuro * dt);
        if (m.combo > 0) perderCombo('muro');
      }
      // frenar te quita el combo
      J.frenando = J.freno > 0.3 ? J.frenando + dt : 0;
      if (J.frenando > C.frenoPierdeCombo && (m.combo > 0 || m.mult > 1)) perderCombo('freno');
      if (m.comboT > 0) { m.comboT -= dt; if (m.comboT <= 0) perderCombo('tiempo'); }
      J.invul = Math.max(0, J.invul - dt);

      moverTrafico(dt);
      generar();

      // choques y roces
      for (const c of m.coches) {
        const ds = c.s - J.s, dx = c.x - J.x;
        const solapeS = Math.abs(ds) < (c.largo + J.largo) / 2 - 0.15;
        const solapeX = Math.abs(dx) < (c.ancho + J.ancho) / 2 - 0.08;
        if (solapeS && solapeX && !c.chocado && J.invul <= 0) { choque(c, Math.abs(dx) > (c.ancho + J.ancho) / 2 - 0.6 && Math.abs(ds) < c.largo / 2 ? 'lateral' : 'trafico'); continue; }
        if (!c.pasado && ds < -(c.largo + J.largo) / 2 + 0.6) {
          c.pasado = true;
          const hueco = Math.abs(dx) - (c.ancho + J.ancho) / 2;
          if (!c.chocado && J.invul <= 0 && hueco >= -0.1 && hueco < C.roceHueco) roce(c, Math.max(0, hueco));
        }
      }
      m.puntos += J.v * dt * C.puntosMetro * m.mult;
      if (m.t >= duracion) terminar('tiempo');
    };
    // Para las pruebas: pone un coche a ds metros delante y dx a la derecha del jugador.
    m.ponerCoche = function (ds, dx, tipoN = 0) {
      const c = crearCoche(jug.s + ds, 0, tipoN);
      c.x = jug.x + dx; c.fijo = true; c.proxCambio = 1e9; c.v = c.vObj = jug.v * 0.4;
      return c;
    };
    m.terminar = terminar;
    return m;
  };
  // Piloto automático: se queda en su carril hasta que lo ve tapado y entonces busca el carril más libre
  // alcanzable. No busca roces a propósito: sirve para medir si el tráfico deja pasar.
  N.piloto = function (m) {
    const J = m.jug, P = m.pista, C = N.C;
    const libreHasta = (x) => {
      let d = 250;
      for (const c of m.coches) {
        const cx = c.cambio ? P.carril(c.cambio.destino) : c.x;
        if ((Math.abs(c.x - x) < 2.3 || Math.abs(cx - x) < 2.3) && c.s > J.s - 3 && c.s - J.s < d) d = c.s - J.s;
      }
      return d;
    };
    if (m._obj === undefined) m._obj = J.x;
    const actual = libreHasta(m._obj);
    if (actual < 60) {
      let mejor = m._obj, mejorD = actual;
      for (let n = 0; n < C.carriles; n++) {
        const x = P.carril(n);
        // los carriles que cruzas tienen que estar libres a tu lado
        let paso = true;
        for (const c of m.coches) {
          const entre = (c.x - J.x) * (c.x - x) < 0 || Math.abs(c.x - x) < 2.3;
          if (entre && Math.abs(c.s - J.s) < 9 + Math.abs(x - J.x) * 1.5) paso = false;
        }
        if (!paso) continue;
        const d = libreHasta(x) - Math.abs(x - J.x) * 3;
        if (d > mejorD + 5) { mejorD = d; mejor = x; }
      }
      m._obj = mejor;
    }
    const giro = Math.max(-1, Math.min(1, (m._obj - J.x) * 1.2 - J.vx * 0.05));
    const delante = libreHasta(J.x);
    let vDel = 0;
    for (const c of m.coches) if (Math.abs(c.x - J.x) < 2.3 && c.s - J.s > 2 && c.s - J.s <= delante + 0.1) vDel = c.v;
    const cierre = J.v - vDel; // m/s con los que te acercas
    const frena = delante > 2 && delante < 250 && cierre > 0 && cierre * cierre / (2 * C.frenada) > delante - 10;
    return { giro, freno: frena ? 1 : 0, gas: 0 };
  };
})(typeof window !== 'undefined' ? (window.N = window.N || {}) : (globalThis.N = globalThis.N || {}));
