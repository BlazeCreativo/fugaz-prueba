// Métricas de validación (tarea 140), solo en localStorage. Nada sale del móvil salvo que se exporte a mano.
//  · primera partida completada sin explicación
//  · partidas por sesión
//  · tiempo hasta «una más» (del final de una partida al inicio de la siguiente)
//  · clips compartidos (botón compartir usado y resultado)
//  · vuelta al día siguiente
//  · «no entiendo qué me mata» (botón de queja de un toque tras morir), con la causa real de la muerte

const CLAVE = 'fugazEscape.metricas';
const MAX_PARTIDAS = 1000;
const PAUSA_SESION = 30 * 60 * 1000; // 30 min sin jugar = sesión nueva

const hoy = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const diaSiguiente = (dia) => {
  const [a, m, d] = dia.split('-').map(Number);
  return hoy(new Date(a, m - 1, d + 1).getTime());
};

function vacio() {
  return { version: 1, creado: Date.now(), dias: [], sesiones: [], partidas: [], compartidos: [], quejas: [], ultimaActividad: 0 };
}

function cargar() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE));
    if (d && d.version === 1 && Array.isArray(d.partidas) && Array.isArray(d.sesiones) && Array.isArray(d.dias)) {
      for (const k of ['compartidos', 'quejas']) if (!Array.isArray(d[k])) d[k] = [];
      return d;
    }
  } catch { /* dato corrupto: se empieza de cero */ }
  return vacio();
}

export function crearMetricas() {
  let d = cargar();
  let sesion = null;
  let actual = null;      // partida en curso
  let finAnterior = null; // { t, n } de la última partida terminada en esta sesión

  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(d)); } catch { /* lleno o bloqueado */ } };

  function tocarSesion() {
    const ahora = Date.now();
    if (!sesion || ahora - d.ultimaActividad > PAUSA_SESION) {
      sesion = { n: d.sesiones.length + 1, inicio: ahora, dia: hoy(ahora), partidas: 0 };
      d.sesiones.push(sesion);
      finAnterior = null;
    }
    if (!d.dias.includes(hoy(ahora))) d.dias.push(hoy(ahora));
    d.ultimaActividad = ahora;
  }

  const api = {
    inicioSesion() { tocarSesion(); guardar(); },

    inicioPartida({ tutorial, entrada }) {
      tocarSesion();
      const ahora = Date.now();
      actual = {
        n: d.partidas.length + 1, sesion: sesion.n, inicio: ahora, dia: hoy(ahora),
        primera: d.partidas.length === 0, tutorial, entrada,
        tiempoHastaUnaMasMs: finAnterior ? ahora - finAnterior.t : null,
        final: 'abandono', causa: null, duracion: 0, puntos: 0, roces: 0, caidas: 0, multMax: 1,
        superoTutorial: false, queja: false, compartido: false, fpsMedio: null,
      };
      sesion.partidas++;
      d.partidas.push(actual);
      if (d.partidas.length > MAX_PARTIDAS) d.partidas.splice(0, d.partidas.length - MAX_PARTIDAS);
      guardar();
      return actual.n;
    },

    finPartida(datos) {
      if (!actual) return;
      Object.assign(actual, datos);
      finAnterior = { t: Date.now(), n: actual.n };
      d.ultimaActividad = Date.now();
      actual = null;
      guardar();
    },

    // La pestaña se cierra o pasa a segundo plano con la partida a medias.
    abandono(datos) {
      if (!actual) return;
      Object.assign(actual, datos, { final: 'abandono' });
      guardar();
    },

    queja(n, causa) {
      const p = d.partidas.find((q) => q.n === n);
      if (p) p.queja = true;
      d.quejas.push({ t: Date.now(), partida: n, causa });
      guardar();
    },

    compartir(n, { metodo, ok, formato }) {
      const p = d.partidas.find((q) => q.n === n);
      if (p && ok) p.compartido = true;
      d.compartidos.push({ t: Date.now(), partida: n, metodo, ok, formato });
      guardar();
    },

    resumen() {
      const ps = d.partidas;
      const primera = ps[0] || null;
      const esperas = ps.map((p) => p.tiempoHastaUnaMasMs).filter((x) => x != null).sort((a, b) => a - b);
      const mediana = esperas.length ? esperas[Math.floor(esperas.length / 2)] : null;
      const porSesion = d.sesiones.map((s) => s.partidas);
      const primerDia = d.dias[0] || null;
      const causas = {};
      for (const q of d.quejas) causas[q.causa] = (causas[q.causa] || 0) + 1;
      const terminadas = ps.filter((p) => p.final !== 'abandono');
      return {
        partidas: ps.length,
        primeraPartidaCompletadaSinExplicacion: primera ? primera.final !== 'abandono' && primera.superoTutorial : null,
        primeraPartida: primera && { final: primera.final, causa: primera.causa, duracion: primera.duracion, superoTutorial: primera.superoTutorial },
        sesiones: d.sesiones.length,
        partidasPorSesion: porSesion,
        partidasPorSesionMedia: porSesion.length ? +(porSesion.reduce((a, b) => a + b, 0) / porSesion.length).toFixed(2) : 0,
        tiempoHastaUnaMasMedianaMs: mediana,
        unaMasEnMenosDe5s: esperas.filter((x) => x < 5000).length,
        clipsCompartidos: d.compartidos.filter((c) => c.ok).length,
        botonCompartirUsado: d.compartidos.length,
        diasJugados: d.dias.length,
        volvioAlDiaSiguiente: primerDia ? d.dias.includes(diaSiguiente(primerDia)) : false,
        algunaVueltaDiaSiguiente: d.dias.some((x) => d.dias.includes(diaSiguiente(x))),
        quejasNoEntiendo: d.quejas.length,
        quejasPorCausa: causas,
        porcentajeQuejas: terminadas.length ? +(100 * d.quejas.length / terminadas.length).toFixed(1) : 0,
        escapes: ps.filter((p) => p.final === 'escape').length,
        fpsMedio: (() => { const f = ps.map((p) => p.fpsMedio).filter(Boolean); return f.length ? +(f.reduce((a, b) => a + b, 0) / f.length).toFixed(1) : null; })(),
      };
    },

    exportar() {
      return JSON.stringify({ exportado: new Date().toISOString(), agente: navigator.userAgent, resumen: api.resumen(), datos: d }, null, 2);
    },

    borrar() { d = vacio(); sesion = null; finAnterior = null; actual = null; guardar(); tocarSesion(); guardar(); },
    get datos() { return d; },
  };
  return api;
}
