// Dibujo 3D de «Noche en autopista» con three.js r128. La autopista se construye por trozos de 96 m que aparecen
// delante y se borran detrás. Casi todo es MeshBasicMaterial (sin luces reales): el brillo de las farolas, los
// reflejos en el asfalto y los pilotos son planos y puntos aditivos, que cuestan muy poco en un móvil.
(function (N) {
  const CH = 96; // metros por trozo
  const NIVELES = {
    baja: { pr: 0.75, alcance: 300, edificios: 4, niebla: 0.0062, rayas: true, post: false, ciudad: 40 },
    media: { pr: 1.0, alcance: 420, edificios: 7, niebla: 0.0048, rayas: true, post: false, ciudad: 80 },
    alta: { pr: 2.0, alcance: 560, edificios: 11, niebla: 0.0038, rayas: true, post: true, ciudad: 140 },
  };
  N.NIVELES = NIVELES;

  // ---------------------------------------------------------------- geometría a mano
  class Hacedor {
    constructor() { this.p = []; this.c = []; this.u = []; this.i = []; }
    // a, b, c, d: [x,y,z] en orden alrededor de la cara; col: [r,g,b] o lista de 4; uv: lista de 4 [u,v]
    cara(a, b, c, d, col, uv) {
      const n = this.p.length / 3;
      for (const [k, v] of [a, b, c, d].entries()) {
        this.p.push(v[0], v[1], v[2]);
        const cc = Array.isArray(col[0]) ? col[k] : col;
        this.c.push(cc[0], cc[1], cc[2]);
        const uu = uv ? uv[k] : [0, 0];
        this.u.push(uu[0], uu[1]);
      }
      this.i.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
    vacio() { return this.i.length === 0; }
    geometria() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
      g.setIndex(this.i);
      g.computeBoundingSphere();
      return g;
    }
  }
  class Puntos {
    constructor() { this.p = []; this.c = []; }
    poner(v, col) { this.p.push(v[0], v[1], v[2]); this.c.push(col[0], col[1], col[2]); }
    objeto(mat) {
      if (!this.p.length) return null;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere();
      return new THREE.Points(g, mat);
    }
  }
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

  N.crearEscena = function (lienzo, op = {}) {
    const esMovil = !!op.movil;
    const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: !esMovil, powerPreference: 'high-performance' });
    renderer.setClearColor(0x0a0d18);
    const escena = new THREE.Scene();
    escena.fog = new THREE.FogExp2(0x0a0d18, 0.0048);
    const camara = new THREE.PerspectiveCamera(70, 16 / 9, 0.05, 1400);
    camara.rotation.order = 'YXZ';
    escena.add(camara);

    let pista = null, T = null, rnd = N.azar(99);
    let nivel = NIVELES.media, nombreNivel = 'media';
    const trozos = new Map();
    const tmp = {}, tmp2 = {};

    // ---------------------------------------------------------------- materiales
    const M = {};
    const aditivo = (extra) => Object.assign({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }, extra);
    function crearMateriales() {
      M.asfalto = new THREE.MeshBasicMaterial({ map: T.asfalto, color: 0xffffff });
      M.solido = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
      M.fachada = T.fachadas.map((t) => new THREE.MeshBasicMaterial({ map: t, vertexColors: true }));
      M.tunel = new THREE.MeshBasicMaterial({ map: T.tunel, vertexColors: true, side: THREE.DoubleSide });
      M.brillo = new THREE.MeshBasicMaterial(aditivo({ map: T.halo, vertexColors: true, side: THREE.DoubleSide }));
      const pm = (tam, extra) => new THREE.PointsMaterial(aditivo(Object.assign({ map: T.halo, vertexColors: true, size: tam, sizeAttenuation: true }, extra)));
      M.pFarola = pm(3.2);
      M.pChico = pm(0.5);
      M.pTunel = pm(1.4);
      M.pRojo = pm(3.5, { fog: false });
      M.pCiudad = pm(5, { fog: false });
      M.pPiloto = pm(0.75);
      M.pFaro = pm(1.6);
      M.pChispa = pm(0.35);
      M.horizonte = new THREE.MeshBasicMaterial({ map: T.horizonte, side: THREE.BackSide, fog: false, depthWrite: false });
      M.carteles = new Map();
    }

    // ---------------------------------------------------------------- trozos de autopista
    const W = (p, x, h) => [p.x + p.rx * x, p.y + h, p.z + p.rz * x];
    // caja alineada con la autopista en el punto p: x lateral, ancho lateral, largo a lo largo; y0/y1 absolutas
    function caja(H, p, x, y0, y1, an, la, colLado, colTecho, uvEsc) {
      const esq = (lx, ls, y) => [p.x + p.rx * (x + lx) + p.dx * ls, y, p.z + p.rz * (x + lx) + p.dz * ls];
      const a = an / 2, l = la / 2;
      const caras = [[-a, -l, a, -l, an], [a, -l, a, l, la], [a, l, -a, l, an], [-a, l, -a, -l, la]];
      const off = uvEsc ? rnd() : 0;
      for (const [x0, s0, x1, s1, w] of caras) {
        const uv = uvEsc ? [[off, 0], [off + w / uvEsc[0], 0], [off + w / uvEsc[0], (y1 - y0) / uvEsc[1]], [off, (y1 - y0) / uvEsc[1]]] : null;
        H.cara(esq(x0, s0, y0), esq(x1, s1, y0), esq(x1, s1, y1), esq(x0, s0, y1), colLado, uv);
      }
      const tuv = uvEsc ? [[0.004, 0.996], [0.004, 0.996], [0.004, 0.996], [0.004, 0.996]] : null;
      H.cara(esq(-a, -l, y1), esq(a, -l, y1), esq(a, l, y1), esq(-a, l, y1), colTecho || colLado, tuv);
    }
    // plano tumbado sobre el asfalto (brillos y reflejos)
    function charco(H, s, x, an, la, col, h = 0.04) {
      const p = pista.punto(s, tmp2);
      const e = (lx, ls) => { const q = W(p, x + lx, h); return [q[0] + p.dx * ls, q[1] + p.pend * ls, q[2] + p.dz * ls]; };
      H.cara(e(-an / 2, -la / 2), e(an / 2, -la / 2), e(an / 2, la / 2), e(-an / 2, la / 2), col,
        [[0, 0], [1, 0], [1, 1], [0, 1]]);
    }

    function construirTrozo(n) {
      const s0 = n * CH, s1 = s0 + CH, P = N.C.paso;
      const grupo = new THREE.Group();
      const asf = new Hacedor(), sol = new Hacedor(), tun = new Hacedor(), bri = new Hacedor();
      const fach = [new Hacedor(), new Hacedor(), new Hacedor()];
      const pF = new Puntos(), pC = new Puntos(), pT = new Puntos(), pR = new Puntos(), pCi = new Puntos();
      const mu = pista.muro, xo = -(2 * mu + 2.6); // eje de la calzada contraria
      const HORM = [0.09, 0.093, 0.105], HORM_T = [0.17, 0.17, 0.19], HORM_O = [0.07, 0.075, 0.09];
      const NARANJA = [1.0, 0.62, 0.25];
      const a = {}, b = {};
      for (let s = s0; s < s1 - 0.01; s += P) {
        pista.punto(s, a); pista.punto(s + P, b);
        const tunel = pista.enTunel(s + P / 2);
        // tablero (las dos calzadas) y canto del viaducto
        for (const xc of [0, xo]) {
          asf.cara(W(a, xc - mu, 0), W(a, xc + mu, 0), W(b, xc + mu, 0), W(b, xc - mu, 0), [1, 1, 1],
            [[0, s / 12], [1, s / 12], [1, (s + P) / 12], [0, (s + P) / 12]]);
        }
        // muretes: cara interior, remate y canto exterior
        for (const [x, dir] of [[mu, 1], [-mu, -1], [xo - mu, -1], [xo + mu, 1]]) {
          const xe = x + dir * 0.36;
          sol.cara(W(a, x, 0), W(b, x, 0), W(b, x, 1.0), W(a, x, 1.0), [HORM, HORM, HORM_T, HORM_T]);
          sol.cara(W(a, x, 1.0), W(b, x, 1.0), W(b, xe, 1.0), W(a, xe, 1.0), HORM_T);
          sol.cara(W(a, xe, 1.0), W(b, xe, 1.0), W(b, xe, -1.6), W(a, xe, -1.6), [HORM_O, HORM_O, [0.02, 0.02, 0.03], [0.02, 0.02, 0.03]]);
        }
        // panza del viaducto
        sol.cara(W(a, xo - mu - 0.36, -1.6), W(a, mu + 0.36, -1.6), W(b, mu + 0.36, -1.6), W(b, xo - mu - 0.36, -1.6), [0.03, 0.03, 0.04]);
        // captafaros ámbar en el murete cada 8 m
        if (Math.round(s) % 8 === 0) for (const x of [mu - 0.02, -mu + 0.02]) pC.poner(W(a, x, 0.75), [1, 0.55, 0.15]);
        if (tunel) {
          const xt = mu + 0.36, alto = 6.5;
          for (const d of [1, -1]) tun.cara(W(a, d * xt, 1.0), W(b, d * xt, 1.0), W(b, d * xt, alto), W(a, d * xt, alto), [0.55, 0.55, 0.6],
            [[s / 4, 0], [(s + P) / 4, 0], [(s + P) / 4, 1.4], [s / 4, 1.4]]);
          tun.cara(W(a, -xt, alto), W(a, xt, alto), W(b, xt, alto), W(b, -xt, alto), [0.12, 0.12, 0.14],
            [[0, 0.1], [0, 0.1], [0, 0.1], [0, 0.1]]);
          if (Math.round(s) % 4 === 0) for (const d of [1, -1]) pT.poner(W(a, d * (mu - 1.2), alto - 0.25), [1, 0.82, 0.55]);
          if (Math.round(s) % 8 === 0) for (const d of [1, -1]) charco(bri, s, d * (mu - 2.4), 6, 9, [0.13, 0.11, 0.08]);
          // franja de luz a lo largo de cada pared
          if (Math.round(s) % 4 === 0) for (const d of [1, -1]) charco(bri, s, d * (mu - 0.1), 0.9, 4, [0.12, 0.09, 0.05]);
        }
      }
      // pilares del viaducto
      for (let s = Math.ceil(s0 / 40) * 40; s < s1; s += 40) {
        const p = pista.punto(s, a);
        caja(sol, p, xo / 2, 0, p.y - 1.6, 5, 2.2, [0.06, 0.06, 0.075]);
      }
      // farolas (fuera de los túneles): a la derecha y en la mediana, alternadas
      for (let s = Math.ceil(s0 / 16) * 16; s < s1; s += 16) {
        if (pista.enTunel(s, 12)) continue;
        const derecha = Math.round(s / 16) % 2 === 0;
        const p = pista.punto(s, a);
        const xPoste = derecha ? mu + 0.55 : -mu - 1.3;
        caja(sol, p, xPoste, p.y, p.y + 10, 0.22, 0.22, [0.12, 0.12, 0.14]);
        const brazos = derecha ? [-1] : [1, -1];
        for (const d of brazos) {
          const xl = xPoste + d * 2.6;
          caja(sol, p, (xPoste + xl) / 2, p.y + 9.75, p.y + 9.95, 2.6, 0.18, [0.12, 0.12, 0.14]);
          const xc = d > 0 ? xl : xl; // cabeza de la farola
          pF.poner(W(p, xc, 9.6), NARANJA);
          // charco de luz y estela de reflejo en el asfalto mojado (falso: un plano largo hacia ti)
          const xr = d > 0 ? xc : xc;
          if (Math.abs(xr) < mu + 1 || xr < xo + mu + 2) {
            charco(bri, s, xr, 8, 15, mul(NARANJA, 0.28));
            charco(bri, s - 9, xr, 1.4, 22, mul(NARANJA, 0.22), 0.05);
          }
        }
      }
      // pórticos con carteles verdes
      for (const po of pista.porticos) {
        if (po.s < s0 || po.s >= s1) continue;
        const p = pista.punto(po.s, a);
        const METAL = [0.2, 0.21, 0.23];
        for (const x of [mu + 0.7, -mu - 1.3]) caja(sol, p, x, p.y, p.y + 7.6, 0.35, 0.35, METAL);
        caja(sol, p, (mu + 0.7 - mu - 1.3) / 2, p.y + 7.2, p.y + 7.7, 2 * mu + 2.4, 0.4, METAL);
        const clave = po.texto.join('|');
        if (!M.carteles.has(clave)) M.carteles.set(clave, new THREE.MeshBasicMaterial({ map: T.cartel(po.texto), color: 0xb0b8b4 }));
        for (const [xc, ancho] of [[-mu / 2, mu * 0.95], [mu / 2 + 0.3, mu * 0.8]]) {
          const g = new THREE.PlaneGeometry(ancho, ancho * 0.31);
          const m = new THREE.Mesh(g, M.carteles.get(clave));
          const q = W(p, xc, 7.7 + ancho * 0.155);
          m.position.set(q[0] - p.dx * 0.25, q[1], q[2] - p.dz * 0.25);
          m.rotation.y = -p.a;
          grupo.add(m);
          pT.poner([q[0] - p.dx * 1.2, q[1] + ancho * 0.18, q[2] - p.dz * 1.2], [0.35, 0.4, 0.38]);
        }
      }
      // bocas de túnel
      for (const t of pista.tuneles) for (const sb of [t.s0, t.s1]) {
        if (sb < s0 || sb >= s1) continue;
        const p = pista.punto(sb, a);
        caja(sol, p, 0, p.y + 6.5, p.y + 13, 2 * mu + 14, 2, [0.13, 0.13, 0.15], [0.2, 0.2, 0.22]);
        for (const d of [1, -1]) caja(sol, p, d * (mu + 4), p.y - 1.6, p.y + 13, 7, 2, [0.11, 0.11, 0.13]);
        pT.poner(W(p, 0, 7.5), [0.9, 0.2, 0.15]);
      }
      // edificios, neones y luces de la ciudad de abajo
      const todoTunel = pista.enTunel(s0) && pista.enTunel(s1);
      if (!todoTunel) {
        for (let k = 0; k < nivel.edificios; k++) {
          const s = s0 + rnd() * CH, lado = rnd() < 0.5 ? -1 : 1;
          const p = pista.punto(s, a);
          const dist = (lado < 0 ? -xo + mu + 10 : mu + 14) + rnd() * 150;
          const an = 14 + rnd() * 26, la = 14 + rnd() * 30, alto = 16 + Math.pow(rnd(), 1.6) * 120;
          const x = lado * (dist + an / 2), v = Math.floor(rnd() * 3);
          const tinte = 0.55 + rnd() * 0.45;
          caja(fach[v], p, x, 0, alto, an, la, [tinte, tinte, tinte * (0.9 + rnd() * 0.2)], [0.3, 0.3, 0.3], [51.2, 112]);
          if (alto > 80 && rnd() < 0.7) pR.poner(W(p, x, alto + 1.5 - p.y), [1, 0.1, 0.08]);
          if (rnd() < 0.35) { // neón en la fachada que mira a la autopista
            const col = rnd.uno([[1, 0.2, 0.6], [0.2, 0.9, 1], [0.7, 0.3, 1], [1, 0.45, 0.1]]);
            const xf = x - lado * (an / 2 + 0.3), h = 8 + rnd() * Math.min(40, alto - 14), ln = 4 + rnd() * 7;
            const q = (dh, ls) => { const w = W(p, xf, 0); return [w[0] + p.dx * ls, h + dh, w[2] + p.dz * ls]; };
            const vertical = rnd() < 0.5;
            const [hh, ll] = vertical ? [ln, 1.1] : [1.2, ln];
            sol.cara(q(-hh / 2, -ll / 2), q(-hh / 2, ll / 2), q(hh / 2, ll / 2), q(hh / 2, -ll / 2), mul(col, 0.95));
            const qq = (dh, ls) => { const w = W(p, xf - lado * 0.4, 0); return [w[0] + p.dx * ls, h + dh, w[2] + p.dz * ls]; };
            bri.cara(qq(-hh * 1.6, -ll * 1.6), qq(-hh * 1.6, ll * 1.6), qq(hh * 1.6, ll * 1.6), qq(hh * 1.6, -ll * 1.6), mul(col, 0.45),
              [[0, 0], [1, 0], [1, 1], [0, 1]]);
          }
        }
        const nCiudad = Math.round(nivel.ciudad * CH / 96);
        for (let k = 0; k < nCiudad; k++) {
          const s = s0 + rnd() * CH, lado = rnd() < 0.5 ? -1 : 1;
          const p = pista.punto(s, a);
          const x = lado * (20 + rnd() * 260);
          const w = W(p, x, 0);
          pCi.poner([w[0], 0.6, w[2]], rnd() < 0.75 ? [1, 0.6, 0.25] : [0.6, 0.8, 1]);
        }
      }
      const malla = (H, m) => { if (!H.vacio()) grupo.add(new THREE.Mesh(H.geometria(), m)); };
      malla(asf, M.asfalto); malla(sol, M.solido); malla(tun, M.tunel);
      fach.forEach((H, i) => malla(H, M.fachada[i]));
      const mb = bri.vacio() ? null : new THREE.Mesh(bri.geometria(), M.brillo);
      if (mb) { mb.renderOrder = 2; grupo.add(mb); }
      for (const [Pt, m] of [[pF, M.pFarola], [pC, M.pChico], [pT, M.pTunel], [pR, M.pRojo], [pCi, M.pCiudad]]) {
        const o = Pt.objeto(m); if (o) { o.renderOrder = 3; grupo.add(o); }
      }
      return grupo;
    }
    function liberar(grupo) {
      grupo.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      escena.remove(grupo);
    }
    function actualizarTrozos(s) {
      const desde = Math.floor((s - 40) / CH), hasta = Math.floor((s + nivel.alcance) / CH);
      for (const [n, g] of trozos) if (n < desde || n > hasta) { liberar(g); trozos.delete(n); }
      let nuevos = 0;
      for (let n = Math.max(0, desde); n <= hasta; n++) {
        if (trozos.has(n)) continue;
        if (nuevos++ > 1 && trozos.size > 2) break; // como mucho 2 trozos por fotograma: sin tirones
        const g = construirTrozo(n); trozos.set(n, g); escena.add(g);
      }
    }

    // ---------------------------------------------------------------- coches
    function geometriaCoche(tipo) {
      const H = new Hacedor();
      const L = tipo.largo, A = tipo.ancho, Al = tipo.alto;
      const p0 = { x: 0, y: 0, z: 0, rx: 1, rz: 0, dx: 0, dz: -1 }; // espacio del modelo: delante = -Z
      const LADO = [0.42, 0.42, 0.43], TECHO = [0.62, 0.62, 0.64], VIDRIO = [0.06, 0.07, 0.09], NEGRO = [0.02, 0.02, 0.025];
      const cajaL = (x, y0, y1, an, la, ds, cl, ct) => { const p = Object.assign({}, p0, { x: p0.dx * ds, z: p0.dz * ds }); caja(H, p, x, y0, y1, an, la, cl, ct); };
      // sombra
      H.cara([-A / 2 - 0.25, 0.02, L / 2 + 0.3], [A / 2 + 0.25, 0.02, L / 2 + 0.3], [A / 2 + 0.25, 0.02, -L / 2 - 0.3], [-A / 2 - 0.25, 0.02, -L / 2 - 0.3], NEGRO);
      if (tipo.nombre === 'camion') {
        cajaL(0, 0.5, Al, A, L * 0.74, -L * 0.13, LADO, TECHO);                // caja
        cajaL(0, 0.4, Al * 0.78, A * 0.98, L * 0.2, L * 0.38, LADO, TECHO);    // cabina
        cajaL(0, Al * 0.5, Al * 0.72, A * 0.99, 0.05, L * 0.48 + 0.01, VIDRIO); // parabrisas
      } else if (tipo.nombre === 'furgoneta') {
        cajaL(0, 0.3, Al, A, L * 0.82, -L * 0.07, LADO, TECHO);
        cajaL(0, 0.3, Al * 0.62, A, L * 0.18, L * 0.41, LADO, TECHO);
        cajaL(0, Al * 0.62, Al * 0.95, A * 0.98, 0.05, L * 0.335, VIDRIO);
      } else {
        cajaL(0, 0.25, 0.78, A, L, 0, LADO, [0.8, 0.8, 0.8]);                   // carrocería
        cajaL(0, 0.78, Al, A * 0.84, L * 0.5, -L * 0.04, VIDRIO, TECHO);         // habitáculo
      }
      // ruedas
      for (const sx of [-1, 1]) for (const sz of [-0.33, 0.33]) cajaL(sx * (A / 2 - 0.12), 0, 0.62, 0.26, 0.66, sz * L, NEGRO);
      return H.geometria();
    }
    function geometriaPilotos(tipo) {
      const H = new Hacedor();
      const L = tipo.largo, A = tipo.ancho, y = tipo.nombre === 'turismo' ? 0.68 : 0.8;
      for (const sx of [-1, 1]) {
        const x = sx * (A / 2 - 0.22), z = L / 2 + 0.02;
        H.cara([x - 0.2, y - 0.08, z], [x + 0.2, y - 0.08, z], [x + 0.2, y + 0.08, z], [x - 0.2, y + 0.08, z], [1, 1, 1]);
      }
      return H.geometria();
    }
    const MAXC = 64;
    const cuerpos = N.TIPOS.map((t) => {
      const m = new THREE.InstancedMesh(geometriaCoche(t), new THREE.MeshBasicMaterial({ vertexColors: true }), MAXC);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.setColorAt(0, new THREE.Color(1, 1, 1)); m.count = 0; m.frustumCulled = false;
      escena.add(m); return m;
    });
    const traseras = N.TIPOS.map((t) => {
      const m = new THREE.InstancedMesh(geometriaPilotos(t), new THREE.MeshBasicMaterial({ color: 0xff2a1a }), MAXC);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.count = 0; m.frustumCulled = false;
      escena.add(m); return m;
    });
    // reflejo rojo de cada coche en el asfalto
    const reflejos = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), null, MAXC);
    reflejos.instanceMatrix.setUsage(THREE.DynamicDrawUsage); reflejos.count = 0; reflejos.frustumCulled = false; reflejos.renderOrder = 2;
    escena.add(reflejos);
    // puntos de luz que se mueven: pilotos e intermitentes, y faros de la calzada contraria
    function puntosDinamicos(n) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
      g.setDrawRange(0, 0);
      return g;
    }
    let luces, faros, chispas;
    const contrarios = [];

    // ---------------------------------------------------------------- coche del jugador y cabina
    const COLOR_JUG = new THREE.Color(0x19c6d8);
    let cocheJug, pilotosJug, haz;
    const cabina = new THREE.Group(), cabBajo = new THREE.Group(), cabAlto = new THREE.Group();
    cabina.add(cabBajo, cabAlto);
    const lienzoRelojes = op.lienzoRelojes;
    let relojesTex = null, volante = null;
    function crearCabina() {
      const H = new Hacedor();
      const p0 = { x: 0, y: 0, z: 0, rx: 1, rz: 0, dx: 0, dz: -1 };
      const NEGRO = [0.035, 0.037, 0.045], GRIS = [0.07, 0.075, 0.09];
      const c = (x, y0, y1, an, la, ds, cl, ct) => caja(H, Object.assign({}, p0, { z: -ds }), x, y0, y1, an, la, cl, ct);
      c(0, -0.66, -0.43, 2.6, 0.6, 0.98, NEGRO, GRIS);     // salpicadero
      c(0, -1.0, -0.62, 2.6, 0.35, 0.55, NEGRO, NEGRO);     // parte baja
      c(0, -0.19, -0.16, 0.62, 0.22, 0.7, NEGRO, GRIS);     // visera de los relojes
      cabBajo.add(new THREE.Mesh(H.geometria(), M.solido));
      const H2 = new Hacedor();
      caja(H2, Object.assign({}, p0, { z: -0.1 }), 0, 0.52, 0.6, 2.6, 0.9, NEGRO, NEGRO);                  // techo
      caja(H2, Object.assign({}, p0, { z: -0.72 }), 0.05, 0.36, 0.42, 0.24, 0.03, [0.05, 0.06, 0.09]);     // retrovisor
      cabAlto.add(new THREE.Mesh(H2.geometria(), M.solido));
      // montantes del parabrisas
      for (const sx of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.1, 0.07), new THREE.MeshBasicMaterial({ color: 0x08090c }));
        m.position.set(sx * 1.02, 0.1, -0.78); m.rotation.z = sx * 0.5; m.rotation.x = -0.45;
        cabAlto.add(m);
      }
      // capó: se ve por delante del salpicadero
      const capo = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.6).rotateX(-Math.PI / 2 + 0.1),
        new THREE.MeshBasicMaterial({ color: COLOR_JUG.clone().multiplyScalar(0.07) }));
      capo.position.set(0, -0.62, -1.7); capo.scale.x = 1.3; cabBajo.add(capo);
      // volante
      volante = new THREE.Group();
      const aro = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.022, 6, 28), new THREE.MeshBasicMaterial({ color: 0x0d0e12 }));
      volante.add(aro);
      const radio = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.02), aro.material); volante.add(radio);
      const marca = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.025), new THREE.MeshBasicMaterial({ color: 0xff5a1f }));
      marca.position.y = 0.19; volante.add(marca);
      volante.position.set(0, -0.53, -0.46); volante.rotation.x = -0.3;
      cabBajo.add(volante);
      // relojes (cuentarrevoluciones y velocímetro) en una pantalla del salpicadero
      relojesTex = new THREE.CanvasTexture(lienzoRelojes);
      const pantalla = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshBasicMaterial({ map: relojesTex, fog: false }));
      pantalla.position.set(0, -0.3, -0.655); pantalla.rotation.x = -0.12; cabBajo.add(pantalla);
      cabina.traverse((o) => { o.renderOrder = 10; if (o.material) { o.material.fog = false; } });
      camara.add(cabina);
    }

    // ---------------------------------------------------------------- rayas de velocidad (espacio de cámara)
    const NR = 70;
    const rayas = new THREE.LineSegments(
      (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NR * 6), 3).setUsage(THREE.DynamicDrawUsage)); return g; })(),
      new THREE.LineBasicMaterial(aditivo({ color: 0xb8d4ff, opacity: 0, fog: false })));
    rayas.frustumCulled = false; rayas.renderOrder = 9;
    const rayaDatos = Array.from({ length: NR }, () => ({ x: 0, y: 0, z: -1 - Math.random() * 80 }));
    function nuevaRaya(r) {
      const ang = Math.random() * Math.PI * 2, rad = 2.2 + Math.random() * 7;
      r.x = Math.cos(ang) * rad * 1.4; r.y = Math.sin(ang) * rad * 0.7 + 1; r.z = -60 - Math.random() * 30;
    }
    rayaDatos.forEach(nuevaRaya);
    camara.add(rayas);

    // ---------------------------------------------------------------- horizonte
    const horizonte = new THREE.Mesh(new THREE.CylinderGeometry(1200, 1200, 320, 40, 1, true), null);
    horizonte.renderOrder = -1;

    // ---------------------------------------------------------------- posproceso (calidad alta)
    let post = null;
    function crearPost() {
      const opcRT = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
      const rtEscena = new THREE.WebGLRenderTarget(4, 4, opcRT);
      const rtA = new THREE.WebGLRenderTarget(4, 4, opcRT), rtB = new THREE.WebGLRenderTarget(4, 4, opcRT);
      const camO = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
      const esc = new THREE.Scene(); esc.add(quad);
      const vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
      const brillo = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, px: { value: new THREE.Vector2() } }, vertexShader: vert,
        fragmentShader: `uniform sampler2D t; uniform vec2 px; varying vec2 vUv;
          void main(){ vec3 c = (texture2D(t, vUv + px*vec2(-1.,-1.)).rgb + texture2D(t, vUv + px*vec2(1.,-1.)).rgb
            + texture2D(t, vUv + px*vec2(-1.,1.)).rgb + texture2D(t, vUv + px*vec2(1.,1.)).rgb) * 0.25;
            float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.45, 0.95, l), 1.0); }` });
      const desenfoque = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: vert,
        fragmentShader: `uniform sampler2D t; uniform vec2 dir; varying vec2 vUv;
          void main(){ vec3 c = texture2D(t, vUv).rgb * 0.227;
            c += (texture2D(t, vUv + dir*1.385).rgb + texture2D(t, vUv - dir*1.385).rgb) * 0.316;
            c += (texture2D(t, vUv + dir*3.231).rgb + texture2D(t, vUv - dir*3.231).rgb) * 0.070;
            gl_FragColor = vec4(c, 1.0); }` });
      const final = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, b: { value: null }, vel: { value: 0 }, fuerza: { value: 0.9 } }, vertexShader: vert,
        fragmentShader: `uniform sampler2D t; uniform sampler2D b; uniform float vel; uniform float fuerza; varying vec2 vUv;
          void main(){ vec2 d = (vUv - vec2(0.5, 0.55)); float r = length(d);
            vec3 c = vec3(0.0); float k = vel * smoothstep(0.12, 0.7, r) * 0.06;
            for (int i = 0; i < 6; i++) { c += texture2D(t, vUv - d * k * float(i)).rgb; }
            c /= 6.0; c += texture2D(b, vUv).rgb * fuerza; gl_FragColor = vec4(c, 1.0); }` });
      post = { rtEscena, rtA, rtB, camO, quad, esc, brillo, desenfoque, final,
        tamano(w, h) { rtEscena.setSize(w, h); rtA.setSize(Math.max(1, w >> 2), Math.max(1, h >> 2)); rtB.setSize(Math.max(1, w >> 2), Math.max(1, h >> 2)); } };
    }
    function pasada(mat, destino) { post.quad.material = mat; renderer.setRenderTarget(destino); renderer.render(post.esc, post.camO); }

    // ---------------------------------------------------------------- estado
    let ancho = 1, alto = 1, vista = 'cabina';
    const cam = { sacudida: 0, fov: 70, yaw: 0, t: 0, x: 0, y: 0, z: 0, extPos: new THREE.Vector3(), extIni: false };
    let chispasDatos = [];
    let pistaId = -1, infoEscena = { calls: 0, triangles: 0 };

    function preparar(mundo) {
      // pista nueva (o la misma si repites semilla): rehacer trozos
      if (pistaId !== mundo.semilla || pista !== mundo.pista) {
        for (const g of trozos.values()) liberar(g);
        trozos.clear();
        pista = mundo.pista; pistaId = mundo.semilla;
        if (!T) {
          T = N.crearTexturas(pista, N.azar(5));
          crearMateriales();
          horizonte.material = M.horizonte; T.horizonte.repeat.set(3, 1); escena.add(horizonte);
          reflejos.material = new THREE.MeshBasicMaterial(aditivo({ map: T.halo, color: 0xffffff }));
          reflejos.setColorAt(0, new THREE.Color(1, 0, 0));
          luces = new THREE.Points(puntosDinamicos(MAXC * 4 + 8), M.pPiloto); luces.frustumCulled = false; luces.renderOrder = 4; escena.add(luces);
          faros = new THREE.Points(puntosDinamicos(80), M.pFaro); faros.frustumCulled = false; faros.renderOrder = 4; escena.add(faros);
          chispas = new THREE.Points(puntosDinamicos(90), M.pChispa); chispas.frustumCulled = false; chispas.renderOrder = 5; escena.add(chispas);
          // coche del jugador (vista exterior)
          cocheJug = new THREE.Mesh(geometriaCoche(N.TIPOS[0]), new THREE.MeshBasicMaterial({ vertexColors: true, color: COLOR_JUG }));
          pilotosJug = new THREE.Mesh(geometriaPilotos(N.TIPOS[0]), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
          cocheJug.add(pilotosJug); escena.add(cocheJug);
          haz = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial(aditivo({ map: T.haz, color: 0x6f6a5c })));
          haz.renderOrder = 2; escena.add(haz);
          crearCabina();
        }
        rnd = N.azar(mundo.semilla * 13 + 1);
        contrarios.length = 0;
        for (let i = 0; i < 26; i++) contrarios.push({ s: 30 + i * 22 + Math.random() * 15, carril: Math.floor(Math.random() * N.C.carriles), v: N.ms(95 + Math.random() * 40) });
        chispasDatos = [];
        cam.extIni = false;
      }
    }

    function base(s) { return pista.punto(s, tmp); }
    const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(0, 0, 0, 'YXZ'), v3 = new THREE.Vector3(), esc1 = new THREE.Vector3(1, 1, 1), col = new THREE.Color();

    function pintarTrafico(mundo, t) {
      const cuenta = [0, 0, 0];
      const pos = luces.geometry.attributes.position.array, cl = luces.geometry.attributes.color.array;
      let nl = 0, nr = 0;
      const luz = (x, y, z, r, g, b) => { pos[nl * 3] = x; pos[nl * 3 + 1] = y; pos[nl * 3 + 2] = z; cl[nl * 3] = r; cl[nl * 3 + 1] = g; cl[nl * 3 + 2] = b; nl++; };
      const parpadeo = Math.sin(t * Math.PI * 3) > 0;
      for (const c of mundo.coches) {
        if (c.s < mundo.jug.s - 40 || c.s > mundo.jug.s + nivel.alcance) continue;
        const k = c.tipo, i = cuenta[k]++;
        if (i >= MAXC) continue;
        const p = base(c.s);
        const yawLat = c.cambio && c.cambio.t > N.C.intermitente ? c.cambio.dir * 0.06 : 0;
        const giro = c.chocado ? Math.min(c.golpeado * 2.5, 1.2) * (c.id % 2 ? 1 : -1) : 0;
        eu.set(-Math.atan(p.pend), -p.a - yawLat - giro, 0); q.setFromEuler(eu);
        v3.set(p.x + p.rx * c.x, p.y, p.z + p.rz * c.x);
        mat4.compose(v3, q, esc1);
        cuerpos[k].setMatrixAt(i, mat4); traseras[k].setMatrixAt(i, mat4);
        col.setHex(c.color); cuerpos[k].setColorAt(i, col);
        // pilotos (más grandes si frena) e intermitentes
        const fr = c.frenando > 0 || c.chocado ? 1.6 : 0.85;
        const yL = p.y + (k === 0 ? 0.68 : 0.8), atras = c.largo / 2 + 0.1;
        for (const sx of [-1, 1]) {
          const lx = c.x + sx * (c.ancho / 2 - 0.22);
          luz(p.x + p.rx * lx - p.dx * atras, yL, p.z + p.rz * lx - p.dz * atras, fr, 0.06 * fr, 0.03);
          if (c.intermitente === sx && parpadeo) luz(p.x + p.rx * (lx + sx * 0.12) - p.dx * (atras - 0.05), yL + 0.12, p.z + p.rz * (lx + sx * 0.12) - p.dz * (atras - 0.05), 1.4, 0.7, 0.05);
          if (c.chocado && parpadeo) luz(p.x + p.rx * (lx + sx * 0.12) - p.dx * (atras - 0.05), yL + 0.12, p.z + p.rz * (lx + sx * 0.12) - p.dz * (atras - 0.05), 1.4, 0.7, 0.05);
        }
        // reflejo en el asfalto, estirado hacia atrás
        if (nr < MAXC) {
          const sr = c.s - c.largo / 2 - 3.2, pr = base(sr);
          eu.set(0, -pr.a, 0); q.setFromEuler(eu);
          v3.set(pr.x + pr.rx * c.x, pr.y + 0.05, pr.z + pr.rz * c.x);
          mat4.compose(v3, q, new THREE.Vector3(c.ancho * 1.1, 1, 6.5));
          reflejos.setMatrixAt(nr, mat4);
          col.setRGB(0.55 * fr, 0.04, 0.02); reflejos.setColorAt(nr, col); nr++;
        }
      }
      for (let k = 0; k < 3; k++) {
        cuerpos[k].count = Math.min(cuenta[k], MAXC); traseras[k].count = cuerpos[k].count;
        cuerpos[k].instanceMatrix.needsUpdate = true; traseras[k].instanceMatrix.needsUpdate = true;
        if (cuerpos[k].instanceColor) cuerpos[k].instanceColor.needsUpdate = true;
      }
      reflejos.count = nr; reflejos.instanceMatrix.needsUpdate = true; if (reflejos.instanceColor) reflejos.instanceColor.needsUpdate = true;
      // pilotos del jugador (vista exterior)
      if (vista === 'fuera') {
        const J = mundo.jug, p = base(J.s), fr = J.freno > 0.05 ? 1.7 : 0.8;
        for (const sx of [-1, 1]) {
          const lx = J.x + sx * (J.ancho / 2 - 0.22);
          luz(p.x + p.rx * lx - p.dx * 2.3, p.y + 0.68, p.z + p.rz * lx - p.dz * 2.3, fr, 0.06 * fr, 0.03);
        }
      }
      luces.geometry.setDrawRange(0, nl);
      luces.geometry.attributes.position.needsUpdate = true; luces.geometry.attributes.color.needsUpdate = true;
    }

    function pintarContrarios(mundo, dt) {
      const pos = faros.geometry.attributes.position.array, cl = faros.geometry.attributes.color.array;
      const mu = pista.muro, xo = -(2 * mu + 2.6);
      let n = 0;
      for (const o of contrarios) {
        o.s -= o.v * dt;
        if (o.s < mundo.jug.s - 30) { o.s = mundo.jug.s + 300 + Math.random() * 300; o.carril = Math.floor(Math.random() * N.C.carriles); }
        if (pista.enTunel(o.s)) continue;
        const p = base(o.s);
        const xc = xo - pista.carril(o.carril); // carriles en espejo
        for (const sx of [-0.7, 0.7]) {
          if (n >= 80) break;
          const x = xc + sx;
          pos[n * 3] = p.x + p.rx * x + p.dx * 2.2; pos[n * 3 + 1] = p.y + 0.7; pos[n * 3 + 2] = p.z + p.rz * x + p.dz * 2.2;
          cl[n * 3] = 1; cl[n * 3 + 1] = 0.95; cl[n * 3 + 2] = 0.85; n++;
        }
      }
      faros.geometry.setDrawRange(0, n);
      faros.geometry.attributes.position.needsUpdate = true; faros.geometry.attributes.color.needsUpdate = true;
    }

    function pintarChispas(mundo, dt) {
      const J = mundo.jug;
      if (J.rozandoMuro && chispasDatos.length < 90) {
        const p = base(J.s + 0.8);
        const x = J.x + J.rozandoMuro * J.ancho / 2;
        for (let k = 0; k < 4; k++) chispasDatos.push({ x: p.x + p.rx * x, y: p.y + 0.3, z: p.z + p.rz * x,
          vx: p.dx * J.v * 0.8 + (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 3, vz: p.dz * J.v * 0.8 + (Math.random() - 0.5) * 4, vida: 0.25 + Math.random() * 0.25 });
      }
      const pos = chispas.geometry.attributes.position.array, cl = chispas.geometry.attributes.color.array;
      let n = 0;
      chispasDatos = chispasDatos.filter((c) => (c.vida -= dt) > 0);
      for (const c of chispasDatos) {
        c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.vy -= 9.8 * dt;
        pos[n * 3] = c.x; pos[n * 3 + 1] = c.y; pos[n * 3 + 2] = c.z;
        cl[n * 3] = 1.2; cl[n * 3 + 1] = 0.6 * c.vida * 3; cl[n * 3 + 2] = 0.1; n++;
      }
      chispas.geometry.setDrawRange(0, n);
      chispas.geometry.attributes.position.needsUpdate = true; chispas.geometry.attributes.color.needsUpdate = true;
    }

    // ---------------------------------------------------------------- cámara
    function ponerCamara(mundo, dt, extra) {
      const J = mundo.jug, p = base(J.s);
      const kmh = N.kmh(J.v);
      const f = Math.max(0, Math.min(1, (kmh - 100) / 190));
      // campo de visión que se abre con la velocidad (horizontal mínimo para que el móvil en vertical vea los carriles)
      const fovV = 66 + 28 * f * f + (extra.turbo || 0) * 6;
      const asp = ancho / alto;
      const fovHmin = 62 + 22 * f;
      const fovDesdeH = 2 * Math.atan(Math.tan(fovHmin * Math.PI / 360) / asp) * 180 / Math.PI;
      const objetivo = Math.min(108, Math.max(fovV, fovDesdeH));
      cam.fov += (objetivo - cam.fov) * Math.min(1, dt * 3);
      camara.fov = cam.fov;
      camara.updateProjectionMatrix();
      cam.t += dt;
      cam.sacudida = Math.max(0, cam.sacudida - dt * 2.2);
      const temblor = 0.004 + 0.022 * f * f + cam.sacudida * 0.18 + (J.rozandoMuro ? 0.03 : 0);
      const ruido = (k) => Math.sin(cam.t * (31 + k * 7.3)) * 0.6 + Math.sin(cam.t * (53 + k * 11.1) + k) * 0.4;
      const yawLat = Math.atan2(J.vx, Math.max(10, J.v));
      if (vista === 'cabina') {
        const x = J.x - 0.36;
        camara.position.set(p.x + p.rx * x - p.dx * 0.2 + ruido(1) * temblor, p.y + 1.13 + ruido(2) * temblor, p.z + p.rz * x - p.dz * 0.2 + ruido(3) * temblor);
        camara.rotation.set(Math.atan(p.pend) - 0.035 + ruido(4) * temblor * 0.3, -p.a - yawLat * 0.55, -J.giro * 0.025 - pista.curv(J.s) * J.v * J.v * 0.0009 + ruido(5) * temblor * 0.2);
        cabina.visible = true; cocheJug.visible = false;
        const vertical = Math.max(0, Math.min(1, (1.3 - asp) / 0.75));
        cabBajo.position.y = -0.24 * vertical; cabAlto.position.y = 0.3 * vertical;
        volante.rotation.z = -J.giro * 1.5;
      } else {
        cabina.visible = false; cocheJug.visible = true;
        const atras = 7.2 + f * 1.6;
        const pa = pista.punto(J.s - atras, tmp2);
        const objetivoCam = v3.set(pa.x + pa.rx * J.x * 0.85, pa.y + 2.5, pa.z + pa.rz * J.x * 0.85);
        if (!cam.extIni) { cam.extPos.copy(objetivoCam); cam.extIni = true; }
        cam.extPos.lerp(objetivoCam, Math.min(1, dt * 8));
        camara.position.set(cam.extPos.x + ruido(1) * temblor, cam.extPos.y + ruido(2) * temblor, cam.extPos.z);
        const pd = pista.punto(J.s + 12, tmp2);
        camara.lookAt(pd.x + pd.rx * J.x, pd.y + 0.6, pd.z + pd.rz * J.x);
      }
      // coche del jugador y haz de los faros
      eu.set(-Math.atan(p.pend), -p.a - yawLat, -J.vx * 0.012); q.setFromEuler(eu);
      cocheJug.position.set(p.x + p.rx * J.x, p.y, p.z + p.rz * J.x); cocheJug.quaternion.copy(q);
      cocheJug.visible = cocheJug.visible && !(J.invul > 0 && Math.sin(cam.t * 40) > 0);
      const ph = pista.punto(J.s + 24, tmp2);
      eu.set(0, -ph.a - yawLat, 0); q.setFromEuler(eu);
      haz.position.set(ph.x + ph.rx * J.x, ph.y + 0.05, ph.z + ph.rz * J.x); haz.quaternion.copy(q);
      haz.scale.set(9, 1, 40);
      haz.material.opacity = pista.enTunel(J.s + 20) ? 0.45 : 0.85;
      // horizonte
      horizonte.position.set(camara.position.x, 120, camara.position.z);
      // rayas
      const pos = rayas.geometry.attributes.position.array;
      const largo = Math.max(0.5, J.v * 0.07);
      for (let i = 0; i < NR; i++) {
        const r = rayaDatos[i];
        r.z += J.v * dt * 1.15;
        if (r.z > -2) nuevaRaya(r);
        pos[i * 6] = r.x; pos[i * 6 + 1] = r.y - 1; pos[i * 6 + 2] = r.z;
        pos[i * 6 + 3] = r.x; pos[i * 6 + 4] = r.y - 1; pos[i * 6 + 5] = r.z - largo;
      }
      rayas.geometry.attributes.position.needsUpdate = true;
      const enTunel = pista.enTunel(J.s);
      rayas.material.opacity = nivel.rayas ? Math.max(0, Math.min(1, (kmh - 175) / 90)) * (enTunel ? 0.5 : 0.28) : 0;
      return f;
    }

    // ---------------------------------------------------------------- API
    const api = {
      renderer, escena, camara,
      get nivel() { return nombreNivel; },
      ponerNivel(n) {
        if (!NIVELES[n] || n === nombreNivel) return;
        nombreNivel = n; nivel = NIVELES[n];
        escena.fog.density = nivel.niebla;
        if (nivel.post && !post) crearPost();
        api.tamano(ancho, alto);
      },
      ponerVista(v) { vista = v; cam.extIni = false; },
      get vista() { return vista; },
      sacudir(k) { cam.sacudida = Math.min(1.5, cam.sacudida + k); },
      tamano(w, h) {
        ancho = w; alto = h;
        const pr = Math.min(window.devicePixelRatio || 1, nivel.pr);
        renderer.setPixelRatio(pr);
        renderer.setSize(w, h, false);
        camara.aspect = w / h; camara.updateProjectionMatrix();
        if (post) post.tamano(Math.round(w * pr), Math.round(h * pr));
      },
      dibujar(mundo, dt, extra = {}) {
        preparar(mundo);
        actualizarTrozos(mundo.jug.s);
        pintarTrafico(mundo, cam.t);
        pintarContrarios(mundo, dt);
        pintarChispas(mundo, dt);
        const f = ponerCamara(mundo, dt, extra);
        M.pRojo.opacity = 0.55 + 0.45 * Math.sin(cam.t * 3);
        if (relojesTex && extra.relojesNuevos) relojesTex.needsUpdate = true;
        if (nivel.post && post) {
          renderer.setRenderTarget(post.rtEscena); renderer.render(escena, camara); infoEscena = Object.assign({}, renderer.info.render);
          const w = post.rtEscena.width, h = post.rtEscena.height;
          post.brillo.uniforms.t.value = post.rtEscena.texture; post.brillo.uniforms.px.value.set(1 / w, 1 / h);
          pasada(post.brillo, post.rtA);
          const wa = post.rtA.width, ha = post.rtA.height;
          post.desenfoque.uniforms.t.value = post.rtA.texture; post.desenfoque.uniforms.dir.value.set(1.5 / wa, 0); pasada(post.desenfoque, post.rtB);
          post.desenfoque.uniforms.t.value = post.rtB.texture; post.desenfoque.uniforms.dir.value.set(0, 1.5 / ha); pasada(post.desenfoque, post.rtA);
          post.final.uniforms.t.value = post.rtEscena.texture; post.final.uniforms.b.value = post.rtA.texture;
          post.final.uniforms.vel.value = f * f; pasada(post.final, null);
        } else {
          renderer.setRenderTarget(null);
          renderer.render(escena, camara); infoEscena = Object.assign({}, renderer.info.render);
        }
      },
      info() { const i = infoEscena; return { llamadas: i.calls, triangulos: i.triangles, trozos: trozos.size }; },
    };
    return api;
  };
})(window.N = window.N || {});
