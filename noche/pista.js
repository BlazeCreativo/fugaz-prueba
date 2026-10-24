// La autopista elevada: una curva que se genera a medida que avanzas (sin fin), con túneles cortos y pórticos
// con carteles verdes. Lógica pura: no usa three.js ni el DOM.
// Convención: rumbo a = 0 mira hacia -Z; delante = (sin a, 0, -cos a); derecha = (cos a, 0, sin a).
(function (N) {
  N.azar = function (semilla) {
    let a = semilla >>> 0 || 1;
    const r = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.entre = (x, y) => x + (y - x) * r();
    r.ent = (x, y) => Math.floor(r.entre(x, y + 1));
    r.uno = (lista) => lista[Math.floor(r() * lista.length)];
    return r;
  };

  N.crearPista = function (semilla) {
    const C = N.C;
    const rnd = N.azar(semilla * 7 + 3);
    const P = C.paso;
    const xs = [0], zs = [0], as = [0], ys = [12];
    const tramos = [];   // { s0, s1, k } curvatura objetivo por tramo
    const tuneles = [];  // { s0, s1 }
    const porticos = []; // { s, texto }
    let sTramos = 0, sTuneles = 400, sPorticos = 180;

    function nuevoTramo() {
      const recta = tramos.length < 2 || rnd() < 0.35;
      const L = recta ? rnd.entre(140, 380) : rnd.entre(160, 420);
      const k = recta ? 0 : (rnd() < 0.5 ? -1 : 1) / rnd.entre(330, 900);
      tramos.push({ s0: sTramos, s1: sTramos + L, k });
      sTramos += L;
    }
    function curvaturaObjetivo(s) {
      while (sTramos < s + 100) nuevoTramo();
      // búsqueda desde el final (siempre pedimos cerca del final)
      for (let i = tramos.length - 1; i >= 0; i--) if (tramos[i].s0 <= s) return tramos[i].k;
      return 0;
    }
    // Curvatura suavizada: media móvil de 80 m para entrar y salir de las curvas sin escalones.
    function curv(s) {
      let suma = 0;
      for (let i = -4; i <= 4; i++) suma += curvaturaObjetivo(Math.max(0, s + i * 10));
      return suma / 9;
    }
    const TEXTOS = [
      ['RONDA LITORAL', '↑ 2 km'], ['SALIDA 14', 'PUERTO ↗'], ['CENTRO', '↑ TÚNEL'], ['AEROPUERTO', '↑ 18 km'],
      ['SALIDA 9', 'ESTADIO ↗'], ['RONDA NORTE', '← 4 km'], ['ZONA FRANCA', '↑ 6 km'], ['SALIDA 21', 'PLAYAS ↗'],
    ];
    function asegurar(sMax) {
      while ((xs.length - 1) * P < sMax) {
        const i = xs.length - 1, s = i * P;
        const a = as[i] + curv(s) * P;
        xs.push(xs[i] + Math.sin(a) * P);
        zs.push(zs[i] - Math.cos(a) * P);
        as.push(a);
        ys.push(12 + 3.5 * Math.sin(s / 520) + 1.5 * Math.sin(s / 190 + 1));
      }
      while (sTuneles < sMax + 200) {
        const L = rnd.entre(140, 260);
        tuneles.push({ s0: sTuneles, s1: sTuneles + L });
        sTuneles += L + rnd.entre(800, 1300);
      }
      while (sPorticos < sMax + 200) {
        if (!enTunel(sPorticos, 25)) porticos.push({ s: sPorticos, texto: TEXTOS[porticos.length % TEXTOS.length] });
        sPorticos += rnd.entre(380, 620);
      }
    }
    function enTunel(s, margen = 0) {
      for (const t of tuneles) if (s >= t.s0 - margen && s <= t.s1 + margen) return true;
      return false;
    }
    // Punto de la curva (interpolado) y su base local.
    function punto(s, o = {}) {
      if (s < 0) s = 0;
      asegurar(s + 4);
      const f = s / P, i = Math.floor(f), u = f - i;
      const a = as[i] + (as[i + 1] - as[i]) * u;
      o.x = xs[i] + (xs[i + 1] - xs[i]) * u;
      o.z = zs[i] + (zs[i + 1] - zs[i]) * u;
      o.y = ys[i] + (ys[i + 1] - ys[i]) * u;
      o.a = a;
      o.dx = Math.sin(a); o.dz = -Math.cos(a); // delante
      o.rx = Math.cos(a); o.rz = Math.sin(a);  // derecha
      o.pend = (ys[i + 1] - ys[i]) / P;
      return o;
    }
    asegurar(800);
    const mitad = (C.carriles * C.anchoCarril) / 2;
    return {
      punto, curv, enTunel, asegurar, tuneles, porticos,
      mitad,                       // de la línea central a la última raya
      muro: mitad + C.arcen,       // de la línea central a la cara del muro
      carril: (n) => -mitad + C.anchoCarril * (n + 0.5), // centro del carril n (0 = izquierda)
    };
  };
})(typeof window !== 'undefined' ? (window.N = window.N || {}) : (globalThis.N = globalThis.N || {}));
