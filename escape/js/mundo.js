// Lógica de la partida, sin three.js ni DOM: se puede ejecutar en node o en las pruebas.
// paso(dt, mando) avanza el mundo y devuelve los sucesos del paso (roce, choque, cazado, escape...).

import { C, velocidadBase, patrullasObjetivo, densidadTrafico } from './config.js';
import { crearAzar } from './azar.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const W = C.coche.ancho;
const L = C.coche.largo;
const COLORES_TRAFICO = 6;

// Medidas en planta de un coche según hacia dónde mira: eje 's' (avenida) o 'x' (calle que cruza).
const medidas = (c) => (c.eje === 'x' ? [L, W] : [W, L]);

export function crearMundo({ semilla = 1, tutorial = false, duracion = C.duracion, invulnerable = false } = {}) {
  const azar = crearAzar(semilla);
  const m = {
    semilla, tutorial, invulnerable,
    tTutorial: tutorial ? C.tutorial : 0,
    duracionTotal: (tutorial ? C.tutorial : 0) + duracion,
    t: 0,
    fin: null,            // null | { final: 'escape' | 'choque' | 'cazado', causa, t }
    jug: { x: C.carriles[1], s: 0, v: C.vTutorial, vx: 0, yaw: 0, golpes: 0, recuperaT: 0, golpeT: 0, pared: false },
    coches: [],           // tráfico y coches que cruzan
    pol: [],              // patrullas
    bar: [],              // barreras con hueco
    cruces: [],           // cruces de calles (s del centro)
    fx: [],               // explosiones y destellos { tipo, x, s, edad }
    asesino: null,        // { x, s } lo que te ha matado, para señalarlo
    puntos: 0, mult: 1, multMax: 1, multT: 0,
    roces: 0, caidas: 0,  // roces y patrullas que has hecho chocar
    recorrido: [],        // [s, x, suceso] cada 0,25 s, para la imagen-resumen
    recT: 0,
    giros: { izq: false, der: false }, // para el tutorial: ya ha girado a cada lado
    proxCruce: 520, proxBarrera: (tutorial ? C.tutorial : 0) + 14, proxPolicia: (tutorial ? C.tutorial : 0) + 1.5,
    guion: tutorial ? [0.3, 3.6, 6.4] : [],
    nId: 1,
    sSalida: null,
  };

  const tJuego = () => m.t - m.tTutorial;
  const carrilMasCercano = (x) => C.carriles.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));

  function nuevoCoche(x, s, vs, extra = {}) {
    const c = { id: m.nId++, x, s, vs, vx: 0, eje: 's', col: azar.entero(0, COLORES_TRAFICO - 1), hueco: Infinity, pasado: false, ...extra };
    m.coches.push(c);
    return c;
  }

  // Un coche nuevo por delante, en un carril sin coche cerca, dejando siempre al menos dos carriles libres a esa altura.
  function generarTrafico() {
    const s = m.jug.s + C.vista - azar.rango(0, 30);
    const ocupados = new Set(m.coches.filter((c) => c.eje === 's' && Math.abs(c.s - s) < 16).map((c) => c.x));
    if (ocupados.size >= 2) return;
    const libres = C.carriles.filter((x) => !ocupados.has(x) && !m.coches.some((c) => c.x === x && Math.abs(c.s - s) < 22));
    if (!libres.length) return;
    const x = azar.elegir(libres);
    const i = C.carriles.indexOf(x);
    // Los carriles de la izquierda van más despacio: así el tráfico se adelanta entre sí y abre huecos.
    nuevoCoche(x, s, 11 + i * 2.5 + azar.rango(-1, 1));
  }

  function generarCruce(sCruce) {
    m.cruces.push(sCruce);
    // Un coche por sentido; llega a la avenida más o menos cuando llegas tú, con margen al azar.
    const tLlegada = (sCruce - m.jug.s) / Math.max(m.jug.v, 1);
    for (const [ds, dir] of [[-3.2, 1], [3.2, -1]]) {
      if (!azar.probabilidad(0.8)) continue;
      const v = azar.rango(11, 15);
      const x0 = -dir * (v * tLlegada + azar.rango(-14, 10));
      nuevoCoche(x0, sCruce + ds, 0, { eje: 'x', vx: dir * v });
    }
  }

  function generarBarrera(s, hueco) {
    const max = C.mitadCalzada - C.barreraHueco / 2;
    m.bar.push({ id: m.nId++, s, hueco: clamp(hueco, -max, max), ancho: C.barreraHueco, hueco2: Infinity, pasado: false });
  }

  function generarPatrulla() {
    const lado = m.pol.length % 2 ? 1 : -1;
    m.pol.push({
      id: m.nId++, x: clamp(m.jug.x + lado * 3, -C.limiteX, C.limiteX), s: m.jug.s - azar.rango(60, 75),
      v: m.jug.v + 10, vx: 0, yaw: 0, lado, fuera: false, tFuera: 0,
      reaccion: 0, amenaza: null, contacto: false, modo: 'acercarse', modoT: 0,
    });
  }

  // ------------------------------------------------------------------ guion del tutorial (10 s, sin texto)
  function guionTutorial() {
    while (m.guion.length && m.t >= m.guion[0]) {
      const paso = m.guion.shift();
      const j = m.jug;
      if (paso < 1) nuevoCoche(carrilMasCercano(j.x), j.s + 62, 10);            // un coche en tu carril: hay que girar
      else if (paso < 5) {                                                         // otro en tu carril y el de al lado
        const x = carrilMasCercano(j.x);
        nuevoCoche(x, j.s + 64, 10);
        const otro = C.carriles[C.carriles.indexOf(x) + (x > 0 ? -1 : 1)];
        nuevoCoche(otro, j.s + 70, 10);
      } else generarBarrera(j.s + 88, -Math.sign(j.x || 1) * 3);                  // barrera con el hueco al otro lado
    }
  }

  // ------------------------------------------------------------------ sucesos
  const sucesos = [];
  function morir(final, causa, x, s) {
    if (m.fin || m.invulnerable) return;
    m.fin = { final, causa, t: m.t };
    m.asesino = { x, s };
    m.fx.push({ tipo: 'boom', x: m.jug.x, s: m.jug.s, edad: 0 });
    m.recorrido.push([m.jug.s, m.jug.x, 'fin']);
    sucesos.push({ tipo: final, causa });
  }

  function subirMult(pasos, motivo, x, s) {
    m.mult = Math.min(C.multMax, m.mult + C.multPaso * pasos);
    m.multMax = Math.max(m.multMax, m.mult);
    m.multT = 0;
    sucesos.push({ tipo: motivo, mult: m.mult, x, s });
  }

  // ------------------------------------------------------------------ paso
  function paso(dt, mando = { giro: 0 }) {
    sucesos.length = 0;
    if (m.fin) { avanzarFx(dt); return sucesos; }
    m.t += dt;
    const j = m.jug;
    const tj = tJuego();

    // Jugador: acelera solo hacia la velocidad del momento y gira con el dedo o las flechas.
    const giro = clamp(mando.giro || 0, -1, 1);
    if (giro < -0.3) m.giros.izq = true;
    if (giro > 0.3) m.giros.der = true;
    const vObj = tj < 0 ? C.vTutorial : velocidadBase(tj);
    j.v += clamp(vObj - j.v, -C.aceleracion * 2 * dt, C.aceleracion * dt);
    j.vx += (giro * C.giroVel - j.vx) * Math.min(1, C.giroResp * dt);
    j.x += j.vx * dt;
    j.pared = Math.abs(j.x) > C.limiteX;
    if (j.pared) { j.x = clamp(j.x, -C.limiteX, C.limiteX); j.vx *= 0.3; j.v *= 1 - C.rozaPared * dt; }
    j.s += j.v * dt;
    j.yaw = Math.atan2(j.vx, j.v);
    j.golpeT = Math.max(0, j.golpeT - dt);

    // Puntos: metros × multiplicador. El multiplicador baja un paso cada 3 s sin riesgo.
    m.puntos += j.v * dt * m.mult;
    m.multT += dt;
    if (m.multT > C.multCaida && m.mult > 1) { m.mult = Math.max(1, m.mult - C.multPaso); m.multT = C.multCaida - 0.8; }

    // Generación de cosas por delante.
    if (m.tutorial && tj < 0) guionTutorial();
    else {
      const ahead = m.coches.filter((c) => c.eje === 's' && c.s > j.s).length;
      if (ahead < densidadTrafico(tj)) generarTrafico();
      if (j.s + C.vista > m.proxCruce) { generarCruce(m.proxCruce); m.proxCruce += C.cruceCada + azar.rango(-60, 80); }
      if (m.t > m.proxBarrera) {
        const sB = j.s + C.vista - 20;
        if (!m.cruces.some((c) => Math.abs(c - sB) < 30)) generarBarrera(sB, azar.elegir(C.carriles) + azar.rango(-1, 1));
        m.proxBarrera = m.t + C.barreraCada * azar.rango(0.75, 1.15) * (tj > 45 ? 0.75 : 1);
      }
      if (m.pol.filter((p) => !p.fuera).length < patrullasObjetivo(tj) && m.t > m.proxPolicia) {
        generarPatrulla();
        m.proxPolicia = m.t + 2.5;
      }
    }

    // Tráfico.
    for (const c of m.coches) { c.s += c.vs * dt; c.x += c.vx * dt; }

    // Choques y roces del jugador con el tráfico.
    const jw = W * C.hitbox, jl = L * C.hitbox;
    for (const c of m.coches) {
      const [cw, cl] = medidas(c);
      const dx = Math.abs(c.x - j.x), ds = Math.abs(c.s - j.s);
      if (ds < (jl + cl) / 2) {
        if (dx < (jw + cw) / 2) { morir('choque', c.eje === 'x' ? 'cruce' : 'trafico', c.x, c.s); break; }
        c.hueco = Math.min(c.hueco, dx - (W + cw) / 2);
      }
      if (!c.pasado && c.s + cl / 2 < j.s - L / 2) {
        c.pasado = true;
        if (c.hueco < C.roce) { m.roces++; subirMult(1, 'roce', c.x, c.s); m.recorrido.push([j.s, j.x, 'roce']); }
      }
    }

    // Barreras: muro de lado a lado con un hueco.
    for (const b of m.bar) {
      if (Math.abs(b.s - j.s) < (jl + 1) / 2) {
        const dentro = Math.abs(j.x - b.hueco) + jw / 2 < b.ancho / 2;
        if (!dentro) { morir('choque', 'barrera', clamp(j.x, -C.mitadCalzada, C.mitadCalzada), b.s); break; }
        b.hueco2 = Math.min(b.hueco2, b.ancho / 2 - (Math.abs(j.x - b.hueco) + W / 2));
      }
      if (!b.pasado && b.s < j.s - L) {
        b.pasado = true;
        if (b.hueco2 < C.roce) { m.roces++; subirMult(1, 'roce', b.hueco, b.s); m.recorrido.push([j.s, j.x, 'roce']); }
      }
    }

    pasoPolicia(dt);

    // Limpieza de lo que queda atrás.
    m.coches = m.coches.filter((c) => c.s > j.s - 50 && Math.abs(c.x) < 90);
    m.bar = m.bar.filter((b) => b.s > j.s - 40);
    m.cruces = m.cruces.filter((s) => s > j.s - 60);
    m.pol = m.pol.filter((p) => p.s > j.s - 120);
    avanzarFx(dt);

    if (m.sSalida == null && m.duracionTotal - m.t < 6) m.sSalida = j.s + (m.duracionTotal - m.t) * j.v + 10;

    m.recT += dt;
    if (m.recT >= 0.25) { m.recT = 0; m.recorrido.push([j.s, j.x, null]); }

    if (!m.fin && m.t >= m.duracionTotal) {
      m.fin = { final: 'escape', causa: null, t: m.t };
      m.puntos *= 1.25;
      sucesos.push({ tipo: 'escape' });
    }
    return sucesos;
  }

  // ------------------------------------------------------------------ patrullas: simples pero agresivas
  function pasoPolicia(dt) {
    const j = m.jug;
    for (const p of m.pol) {
      if (p.fuera) {
        p.v = Math.max(0, p.v - 25 * dt);
        p.s += p.v * dt;
        p.tFuera += dt;
        continue;
      }
      const gap = j.s - p.s; // > 0: la patrulla va detrás
      // Velocidad: siempre te alcanza; cuanto más lejos, más corre.
      const vObj = j.v + clamp(0.55 * (gap - 1), -6, 17);
      p.v += clamp(vObj - p.v, -16 * dt, 13 * dt);

      // A dónde quiere ir: detrás de ti en tu línea; a tu altura, acecha a un lado y embiste
      // (avisa con las luces 0,45 s antes); después se retira y vuelve a empezar.
      let tx = j.x + j.vx * Math.min(0.5, Math.max(0, gap) / 40);
      if (gap < 14 && gap > -5) {
        // Se pone del lado con más sitio... o del que te empotra contra la acera.
        if (p.modo === 'acercarse') p.lado = Math.abs(j.x) > 4.5 ? -Math.sign(j.x) : p.lado;
        if (p.modo === 'acercarse' && Math.abs(gap) < 3.5) { p.modo = 'acecho'; p.modoT = azar.rango(0.5, 1.1); }
        p.modoT -= dt;
        if (p.modo === 'acecho' && p.modoT <= 0) { p.modo = 'aviso'; p.modoT = 0.45; }
        else if (p.modo === 'aviso' && p.modoT <= 0) { p.modo = 'embestida'; p.modoT = 0.4; }
        else if (p.modo === 'embestida' && p.modoT <= 0) { p.modo = 'retirada'; p.modoT = 0.7; }
        else if (p.modo === 'retirada' && p.modoT <= 0) { p.modo = 'acecho'; p.modoT = azar.rango(0.4, 1.0); }
        const sep = p.modo === 'embestida' ? 0.4 : p.modo === 'retirada' ? 3.4 : 2.8;
        tx = j.x + p.lado * (gap > 3.5 ? 2.4 : sep);
      } else p.modo = 'acercarse';

      // Esquiva el tráfico, pero tarde: un roce tuyo bien hecho le hace chocar.
      const amenaza = m.coches.find((c) => c.eje === 's' && c.s > p.s && c.s - p.s < 32 && Math.abs(c.x - p.x) < 2.3)
        || m.bar.find((b) => b.s > p.s && b.s - p.s < 34 && Math.abs(p.x - b.hueco) > b.ancho / 2 - 1.2);
      if (amenaza && amenaza !== p.amenaza) { p.amenaza = amenaza; p.reaccion = azar.rango(C.reaccionMin, C.reaccionMax); }
      if (!amenaza) p.amenaza = null;
      if (p.amenaza) {
        p.reaccion -= dt;
        if (p.reaccion <= 0) {
          if ('hueco' in p.amenaza && 'ancho' in p.amenaza) tx = p.amenaza.hueco;
          else {
            const izq = p.amenaza.x - 3.4, der = p.amenaza.x + 3.4;
            tx = Math.abs(izq) < C.limiteX && (Math.abs(izq - j.x) < Math.abs(der - j.x) || Math.abs(der) > C.limiteX) ? izq : der;
          }
        }
      }
      const vxObj = clamp((tx - p.x) * 3.2, -11, 11);
      p.empujadaT = Math.max(0, (p.empujadaT || 0) - dt);
      if (p.empujadaT <= 0) p.vx += (vxObj - p.vx) * Math.min(1, 6 * dt);
      p.x += p.vx * dt;
      if (Math.abs(p.x) > C.limiteX) {
        if (p.empujadaT > 0 && Math.abs(p.vx) > 6) { patrullaFuera(p); continue; } // estampada contra la acera
        p.x = clamp(p.x, -C.limiteX, C.limiteX);
      }
      p.s += p.v * dt;
      p.yaw = Math.atan2(p.vx, p.v);

      // La patrulla choca con el tráfico, los coches que cruzan y las barreras: queda fuera de combate.
      for (const c of m.coches) {
        const [cw, cl] = medidas(c);
        if (Math.abs(c.x - p.x) < (W + cw) / 2 - 0.1 && Math.abs(c.s - p.s) < (L + cl) / 2 - 0.2) { patrullaFuera(p); break; }
      }
      if (!p.fuera) for (const b of m.bar) {
        if (Math.abs(b.s - p.s) < L / 2 + 0.5 && Math.abs(p.x - b.hueco) + W / 2 > b.ancho / 2) { patrullaFuera(p); break; }
      }
      if (p.fuera) continue;

      // Contacto con el jugador: cada embestida es un golpe (3 golpes = te cazan). Rebotáis y pierdes velocidad.
      const dx = j.x - p.x, ds = j.s - p.s;
      p.contacto = Math.abs(dx) < W && Math.abs(ds) < L;
      if (p.contacto) {
        const sg = Math.sign(dx) || 1;
        // ¿Quién embiste a quién? Si vas tú hacia la patrulla más rápido que ella hacia ti, la apartas
        // de un golpe sin daño; si la estampas contra la acera o el tráfico, queda fuera.
        const tuyo = Math.abs(ds) < L * 0.75 && -j.vx * sg > p.vx * sg + 1;
        if (Math.abs(ds) < L * 0.75) { // de lado
          const solape = W - Math.abs(dx);
          j.x += sg * solape * (tuyo ? 0.2 : 0.7); p.x -= sg * solape * (tuyo ? 0.8 : 0.3);
          j.vx = sg * (tuyo ? 2 : 7); p.vx = -sg * (tuyo ? 13 : 5);
        } else if (ds > 0) { p.s = j.s - L; p.v = j.v - 3; } // por detrás
        else { j.s = p.s - L; }
        p.modo = 'retirada'; p.modoT = tuyo ? 1.6 : 0.9;
        if (tuyo) {
          p.empujadaT = 0.5;
          if (j.golpeT <= 0) { j.golpeT = 0.3; sucesos.push({ tipo: 'empujon', x: p.x, s: p.s }); }
        } else if (j.golpeT <= 0) {
          j.golpeT = 0.6; j.v -= 3; j.golpes++; j.recuperaT = 0;
          sucesos.push({ tipo: 'golpe', golpes: j.golpes, x: p.x, s: p.s });
          if (j.golpes >= C.golpesMuerte) morir('cazado', 'golpes', p.x, p.s);
        }
      }
    }
    // Patrullas entre sí: no se atraviesan.
    for (let a = 0; a < m.pol.length; a++) for (let b = a + 1; b < m.pol.length; b++) {
      const p = m.pol[a], q = m.pol[b];
      if (p.fuera || q.fuera) continue;
      if (Math.abs(p.s - q.s) < L && Math.abs(p.x - q.x) < W) { const sg = Math.sign(p.x - q.x) || 1; p.x += sg * 0.05; q.x -= sg * 0.05; }
    }
    // Sin golpes durante un rato, recuperas uno.
    j.recuperaT += dt;
    if (j.golpes > 0 && j.recuperaT > C.golpeRecupera) { j.golpes--; j.recuperaT = 0; }
  }

  function patrullaFuera(p) {
    p.fuera = true;
    m.fx.push({ tipo: 'boom', x: p.x, s: p.s, edad: 0 });
    if (p.s > m.jug.s - 80) {
      m.caidas++;
      m.puntos += 400 * m.mult;
      subirMult(2, 'caida', p.x, p.s);
      m.recorrido.push([m.jug.s, m.jug.x, 'caida']);
    }
  }

  function avanzarFx(dt) {
    for (const f of m.fx) f.edad += dt;
    if (m.fx.length && m.fx[0].edad > 1.5) m.fx = m.fx.filter((f) => f.edad < 1.5);
  }

  // ------------------------------------------------------------------ vista para dibujar (y para la repetición)
  function vista() {
    const j = m.jug;
    return {
      t: m.t, v: j.v,
      jug: { x: j.x, s: j.s, yaw: j.yaw, vivo: !m.fin || m.fin.final === 'escape', golpes: j.golpes },
      coches: m.coches.map((c) => ({ x: c.x, s: c.s, eje: c.eje, col: c.col, dir: Math.sign(c.vx) })),
      pol: m.pol.map((p) => ({ x: p.x, s: p.s, yaw: p.yaw, fuera: p.fuera, aviso: p.modo === 'aviso' || p.modo === 'embestida' })),
      bar: m.bar.map((b) => ({ s: b.s, hueco: b.hueco, ancho: b.ancho })),
      cruces: m.cruces.slice(),
      fx: m.fx.map((f) => ({ tipo: f.tipo, x: f.x, s: f.s, edad: f.edad })),
      asesino: m.asesino, puntos: m.puntos, mult: m.mult,
      salida: m.sSalida, // el túnel de salida, cuando ya se ve
    };
  }

  return Object.assign(m, { paso, vista, tJuego });
}
