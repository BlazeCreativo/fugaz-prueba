// Dibujo con three.js (r128, global THREE desde vendor/three.min.js). Solo lee la «vista» del mundo,
// así sirve igual para la partida y para la repetición del clip.
// Ejes: (x, s) del mundo pasa a (x, altura, -s) en three.js; los coches miran hacia -z.

import { C } from './config.js';
import { hash01 } from './azar.js';

const T = window.THREE;
const COLORES_TRAFICO = [0x8a93a6, 0x6b2430, 0x2d4a7a, 0x4a3a6b, 0x3a5c43, 0x5c4a2d];
const BLOQUE = 26; // m por edificio
const N_EDIF = 13; // por lado
const ALTO_MOVIL = matchMedia('(pointer: coarse)').matches;

export function crearEscena(lienzo) {
  const renderer = new T.WebGLRenderer({ canvas: lienzo, antialias: !ALTO_MOVIL, powerPreference: 'high-performance' });
  let ratio = Math.min(devicePixelRatio || 1, ALTO_MOVIL ? 1.5 : 2);
  renderer.setPixelRatio(ratio);
  const escena = new T.Scene();
  const FONDO = 0x0b1022;
  escena.background = new T.Color(FONDO);
  escena.fog = new T.Fog(FONDO, 70, 250);
  const camara = new T.PerspectiveCamera(60, 1, 0.5, 320);
  escena.add(new T.HemisphereLight(0x9fb4ff, 0x1a1626, 0.95));
  const sol = new T.DirectionalLight(0xffe2c0, 0.55);
  sol.position.set(-0.4, 1, 0.3);
  escena.add(sol);

  const caja = new T.BoxGeometry(1, 1, 1);
  const plano = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const basic = (color, extra) => new T.MeshBasicMaterial({ color, ...extra });
  const lambert = (color, extra) => new T.MeshLambertMaterial({ color, ...extra });

  // ------------------------------------------------------------ calzada, aceras, marcas
  const suelo = new T.Group();
  escena.add(suelo);
  const asfalto = new T.Mesh(plano, lambert(0x1b2133));
  asfalto.scale.set(C.mitadCalzada * 2, 1, 600);
  suelo.add(asfalto);
  for (const lado of [-1, 1]) {
    const acera = new T.Mesh(plano, lambert(0x2a3148));
    acera.scale.set(8, 1, 600);
    acera.position.set(lado * (C.mitadCalzada + 4), 0.18, 0);
    suelo.add(acera);
    const bordillo = new T.Mesh(caja, basic(0x4f6dff));
    bordillo.scale.set(0.18, 0.2, 600);
    bordillo.position.set(lado * C.mitadCalzada, 0.1, 0);
    suelo.add(bordillo);
  }
  const N_RAYAS = 3 * 32;
  const rayas = new T.InstancedMesh(caja, basic(0xc9d2e8), N_RAYAS);
  escena.add(rayas);

  // ------------------------------------------------------------ edificios con ventanas (textura hecha aquí, sin recursos externos)
  const tex = (() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#05070d'; g.fillRect(0, 0, 64, 128);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 4; x++) {
      const r = hash01(x * 31 + y * 7);
      g.fillStyle = r > 0.55 ? (r > 0.85 ? '#ffd38a' : '#8fb4ff') : '#111727';
      g.fillRect(4 + x * 15, 3 + y * 8, 10, 5);
    }
    const t = new T.CanvasTexture(c);
    t.magFilter = T.NearestFilter;
    return t;
  })();
  const edif = new T.InstancedMesh(caja, new T.MeshLambertMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveMap: tex, map: tex }), N_EDIF * 2);
  edif.instanceColor = new T.InstancedBufferAttribute(new Float32Array(N_EDIF * 2 * 3), 3);
  escena.add(edif);
  const N_FAROLAS = 2 * 10;
  const farolas = new T.InstancedMesh(caja, basic(0xffc76b), N_FAROLAS);
  const postes = new T.InstancedMesh(caja, lambert(0x30364a), N_FAROLAS);
  escena.add(farolas, postes);

  // Cruces: asfalto transversal, paso de cebra y semáforos ámbar que parpadean.
  const cruces = [0, 1].map(() => {
    const g = new T.Group();
    const a = new T.Mesh(plano, lambert(0x1b2133));
    a.scale.set(200, 1, 14); a.position.y = 0.2;
    g.add(a);
    const cebra = new T.InstancedMesh(caja, basic(0xd9deea), 8);
    const mm = new T.Matrix4();
    for (let i = 0; i < 8; i++) { mm.makeScale(1.0, 0.02, 2.4); mm.setPosition(-7 + i * 2, 0.22, 8.5); cebra.setMatrixAt(i, mm); }
    g.add(cebra);
    const luz = basic(0xffb020);
    for (const lado of [-1, 1]) {
      const l = new T.Mesh(caja, luz);
      l.scale.set(0.7, 0.7, 0.7); l.position.set(lado * 8.6, 4.5, 7.5);
      g.add(l);
    }
    g.userData.luz = luz;
    g.visible = false;
    escena.add(g);
    return g;
  });

  // Túnel de salida: la meta de los 75 s.
  const tunel = new T.Group();
  {
    const boca = lambert(0x232a40);
    for (const [x, y, w, h] of [[-10, 6, 4, 12], [10, 6, 4, 12], [0, 13.5, 24, 3]]) {
      const b = new T.Mesh(caja, boca); b.scale.set(w, h, 4); b.position.set(x, y, 0); tunel.add(b);
    }
    const letrero = new T.Mesh(caja, basic(0x3ddc84));
    letrero.scale.set(10, 1.6, 0.3); letrero.position.set(0, 10.6, 2.2);
    tunel.add(letrero);
    const fondo = new T.Mesh(new T.PlaneGeometry(16, 12), basic(0xfff2c4));
    fondo.position.set(0, 6, -30);
    tunel.add(fondo);
    tunel.visible = false;
    escena.add(tunel);
  }

  // ------------------------------------------------------------ coches
  const sombraMat = basic(0x000000, { transparent: true, opacity: 0.45, depthWrite: false });
  const traseraMat = basic(0xff2a3c);
  const faroMat = basic(0xfff4d6);
  function coche(colorCarro, { techo = 0x0d1220, brillo = 0 } = {}) {
    const g = new T.Group();
    const carro = new T.Mesh(caja, lambert(colorCarro, { emissive: colorCarro, emissiveIntensity: brillo }));
    carro.scale.set(C.coche.ancho, 0.75, C.coche.largo); carro.position.y = 0.6;
    const cabina = new T.Mesh(caja, lambert(techo));
    cabina.scale.set(1.6, 0.6, 2.1); cabina.position.set(0, 1.25, 0.25);
    const trasera = new T.Mesh(caja, traseraMat);
    trasera.scale.set(1.75, 0.2, 0.08); trasera.position.set(0, 0.8, C.coche.largo / 2);
    const faros = new T.Mesh(caja, faroMat);
    faros.scale.set(1.6, 0.16, 0.08); faros.position.set(0, 0.7, -C.coche.largo / 2);
    const sombra = new T.Mesh(plano, sombraMat);
    sombra.scale.set(2.4, 1, 5); sombra.position.y = 0.03;
    g.add(sombra, carro, cabina, trasera, faros);
    g.userData.carro = carro;
    escena.add(g);
    return g;
  }
  const traficoMats = COLORES_TRAFICO.map((c) => lambert(c));
  const trafico = Array.from({ length: 36 }, () => coche(0x888888));
  const jugador = coche(0x7fe3ff, { techo: 0x10243a, brillo: 0.35 });
  {
    const neon = new T.Mesh(plano, basic(0x7fe3ff, { transparent: true, opacity: 0.35, depthWrite: false }));
    neon.scale.set(3.4, 1, 6.4); neon.position.y = 0.05;
    jugador.add(neon);
  }
  const rojo = basic(0xff2244), azul = basic(0x2f6bff), apagado = basic(0x222833);
  const policias = Array.from({ length: 6 }, () => {
    const g = coche(0xe8ecf4, { techo: 0x111a33 });
    const r = new T.Mesh(caja, rojo); r.scale.set(0.8, 0.32, 0.5); r.position.set(-0.42, 1.7, 0.2);
    const b = new T.Mesh(caja, azul); b.scale.set(0.8, 0.32, 0.5); b.position.set(0.42, 1.7, 0.2);
    // Aviso de embestida: un triángulo rojo encima que parpadea.
    const aviso = new T.Mesh(new T.ConeGeometry(0.7, 1.2, 3), basic(0xff3355));
    aviso.rotation.x = Math.PI; aviso.position.y = 3.3;
    g.add(r, b, aviso);
    g.userData = { ...g.userData, r, b, aviso };
    return g;
  });
  const pintadaFuera = lambert(0x2a2a2a);

  // Barreras: bloques naranja y blanco con hueco.
  const N_BLOQ = 60;
  const bloques = new T.InstancedMesh(caja, lambert(0xff7a1a, { emissive: 0xff5a00, emissiveIntensity: 0.35 }), N_BLOQ);
  const franjas = new T.InstancedMesh(caja, basic(0xf4f4f4), N_BLOQ);
  escena.add(bloques, franjas);
  // El hueco de cada barrera, marcado en verde en el suelo: se lee desde lejos a 170 km/h.
  const huecos = [0, 1, 2].map(() => {
    const h = new T.Mesh(plano, basic(0x3ddc84, { transparent: true, opacity: 0.55, depthWrite: false }));
    h.visible = false; escena.add(h); return h;
  });

  // Efectos: explosiones y señal de lo que te ha matado.
  const booms = Array.from({ length: 6 }, () => {
    const m = new T.Mesh(new T.SphereGeometry(1, 10, 8), basic(0xffa040, { transparent: true, depthWrite: false }));
    m.visible = false; escena.add(m); return m;
  });
  const anillo = new T.Mesh(new T.RingGeometry(2.6, 3.3, 32).rotateX(-Math.PI / 2), basic(0xff3355, { transparent: true, side: T.DoubleSide, depthTest: false }));
  anillo.renderOrder = 10;
  anillo.visible = false;
  escena.add(anillo);

  const M = new T.Matrix4(), Q = new T.Quaternion(), V = new T.Vector3(), E = new T.Vector3(), COL = new T.Color();
  const ponerCaja = (malla, i, x, y, z, sx, sy, sz) => { M.makeScale(sx, sy, sz); M.setPosition(x, y, z); malla.setMatrixAt(i, M); };

  let ancho = 1, alto = 1;
  function tamano(w, h) {
    ancho = w; alto = h;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ dibujar una vista
  function dibujar(v, { sacudida = 0, lenta = false } = {}) {
    const j = v.jug;
    const zJ = -j.s;
    const parpadeo = Math.floor(v.t * 8) % 2 === 0;

    // Cámara: detrás y arriba. En vertical (móvil) más alta para ver los cuatro carriles.
    const vertical = camara.aspect < 1;
    const alturaCam = vertical ? 15 : 8.5, atras = vertical ? 14 : 13, delante = vertical ? 30 : 30;
    const fov = (vertical ? 80 : 56) + Math.max(0, v.v - 30) * 0.35 + (lenta ? -8 : 0);
    if (Math.abs(camara.fov - fov) > 0.05) { camara.fov = fov; camara.updateProjectionMatrix(); }
    const sx = sacudida ? (hash01(Math.floor(v.t * 60)) - 0.5) * sacudida : 0;
    camara.position.set(j.x * 0.55 + sx, alturaCam + sx * 0.5, zJ + atras);
    camara.lookAt(j.x * 0.8, 0, zJ - delante);

    suelo.position.z = zJ - 200;
    // Rayas discontinuas cada 10 m entre carriles.
    const base = Math.floor(j.s / 10) * 10 - 20;
    let k = 0;
    for (const x of [-4, 0, 4]) for (let i = 0; i < 32; i++) ponerCaja(rayas, k++, x, 0.02, -(base + i * 10), 0.16, 0.02, 3.2);
    rayas.instanceMatrix.needsUpdate = true;

    // Edificios: uno cada BLOQUE m por lado, con altura y color estables según su índice.
    const k0 = Math.floor((j.s - 30) / BLOQUE);
    let n = 0;
    for (let i = 0; i < N_EDIF; i++) {
      const kb = k0 + i;
      const sC = kb * BLOQUE + BLOQUE / 2;
      const enCruce = v.cruces.some((c) => Math.abs(c - sC) < BLOQUE / 2 + 6);
      for (const lado of [-1, 1]) {
        const h = hash01(kb * 2 + (lado > 0 ? 1 : 0));
        const alturaE = enCruce ? 0.001 : 10 + h * h * 55;
        const fondo = 12 + hash01(kb * 5 + lado) * 10;
        ponerCaja(edif, n, lado * (C.mitadCalzada + 6 + fondo / 2), alturaE / 2, -sC, fondo, alturaE, BLOQUE - 3);
        COL.setHSL(0.6 + hash01(kb * 3 + lado) * 0.15, 0.35, 0.18 + h * 0.12);
        edif.setColorAt(n, COL);
        n++;
      }
    }
    edif.instanceMatrix.needsUpdate = true;
    edif.instanceColor.needsUpdate = true;
    const f0 = Math.floor(j.s / 30) * 30 - 30;
    for (let i = 0; i < N_FAROLAS / 2; i++) for (const lado of [-1, 1]) {
      const idx = i * 2 + (lado > 0 ? 1 : 0);
      const z = -(f0 + i * 30);
      ponerCaja(postes, idx, lado * (C.mitadCalzada + 1.2), 3.5, z, 0.25, 7, 0.25);
      ponerCaja(farolas, idx, lado * (C.mitadCalzada + 0.4), 7, z, 1.8, 0.25, 0.6);
    }
    postes.instanceMatrix.needsUpdate = true;
    farolas.instanceMatrix.needsUpdate = true;

    cruces.forEach((g, i) => {
      const s = v.cruces[i];
      g.visible = s != null;
      if (g.visible) { g.position.z = -s; g.userData.luz.color.setHex(parpadeo ? 0xffb020 : 0x3a2a08); }
    });
    tunel.visible = v.salida != null;
    if (tunel.visible) tunel.position.z = -v.salida;

    // Coches.
    jugador.position.set(j.x, 0, zJ);
    jugador.rotation.set(0, -j.yaw, j.vivo ? 0 : 0.4);
    jugador.visible = true;
    let t = 0;
    for (const c of v.coches) {
      if (t >= trafico.length) break;
      if (c.s < j.s - 25 || c.s > j.s + 270) continue;
      const g = trafico[t++];
      g.visible = true;
      g.position.set(c.x, 0, -c.s);
      g.rotation.y = c.eje === 'x' ? (c.dir > 0 ? -Math.PI / 2 : Math.PI / 2) : 0;
      g.userData.carro.material = traficoMats[c.col % traficoMats.length];
    }
    for (; t < trafico.length; t++) trafico[t].visible = false;
    policias.forEach((g, i) => {
      const p = v.pol[i];
      g.visible = !!p;
      if (!p) return;
      g.position.set(p.x, 0, -p.s);
      g.rotation.set(0, -p.yaw, p.fuera ? 0.25 : 0);
      const u = g.userData;
      u.carro.material = p.fuera ? pintadaFuera : u.carroBlanco || (u.carroBlanco = u.carro.material);
      u.r.material = p.fuera ? apagado : parpadeo ? rojo : apagado;
      u.b.material = p.fuera ? apagado : parpadeo ? apagado : azul;
      u.aviso.visible = !p.fuera && p.aviso && Math.floor(v.t * 12) % 2 === 0;
    });

    // Barreras: bloques de 1,2 m a lo ancho de la calzada, salvo en el hueco.
    let b = 0;
    for (const br of v.bar) {
      for (let x = -C.mitadCalzada + 0.6; x < C.mitadCalzada; x += 1.25) {
        if (Math.abs(x - br.hueco) < br.ancho / 2 + 0.3 || b >= N_BLOQ) continue;
        ponerCaja(bloques, b, x, 0.55, -br.s, 1.15, 1.1, 0.7);
        ponerCaja(franjas, b, x, 0.75, -br.s + 0.36, 1.16, 0.22, 0.02);
        b++;
      }
    }
    for (let i = b; i < N_BLOQ; i++) { ponerCaja(bloques, i, 0, -10, 0, 0, 0, 0); ponerCaja(franjas, i, 0, -10, 0, 0, 0, 0); }
    bloques.instanceMatrix.needsUpdate = true;
    huecos.forEach((h, i) => {
      const br = v.bar[i];
      h.visible = !!br;
      if (!br) return;
      h.position.set(br.hueco, 0.05, -br.s + 3);
      h.scale.set(br.ancho - 0.6, 1, 14);
      h.material.opacity = parpadeo ? 0.6 : 0.4;
    });
    franjas.instanceMatrix.needsUpdate = true;

    booms.forEach((m, i) => {
      const f = v.fx[v.fx.length - 1 - i];
      m.visible = !!f && f.edad < 1.2;
      if (!m.visible) return;
      const r = 1 + f.edad * 7;
      m.position.set(f.x, 1, -f.s);
      m.scale.set(r, r * 0.7, r);
      m.material.opacity = Math.max(0, 0.9 - f.edad * 0.8);
    });
    anillo.visible = !!v.asesino;
    if (anillo.visible) {
      anillo.position.set(v.asesino.x, 0.4, -v.asesino.s);
      anillo.material.opacity = parpadeo ? 1 : 0.5;
    }

    renderer.render(escena, camara);
  }

  // Proyecta un punto del mundo a la pantalla (0..1), para señalar patrullas fuera de cuadro.
  function proyectar(x, s) {
    V.set(x, 1, -s).project(camara);
    return { x: (V.x + 1) / 2, y: (1 - V.y) / 2, delante: V.z < 1 };
  }

  function bajarCalidad() {
    if (ratio <= 0.75) return false;
    ratio = Math.max(0.75, ratio - 0.25);
    renderer.setPixelRatio(ratio);
    tamano(ancho, alto);
    return true;
  }

  return { renderer, dibujar, tamano, proyectar, bajarCalidad, get ratio() { return ratio; }, lienzo };
}
