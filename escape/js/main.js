// Bucle del prototipo: inicio → cuenta atrás → persecución → golpe (cámara lenta) → final → «una más».

import { C } from './config.js';
import { crearMundo } from './mundo.js';
import { semillaNueva } from './azar.js';
import { crearEscena } from './escena.js';
import { crearEntrada } from './entrada.js';
import { crearMetricas } from './metricas.js';
import { crearAudio } from './audio.js';
import { crearBuffer, grabarRepeticion, imagenResumen, lienzoABlob, compartirArchivo } from './clip.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const PRUEBA = params.get('prueba') === '1';
const fmt = (n) => Math.round(n).toLocaleString('es-ES');

const CLAVE_RECORD = 'fugazEscape.record';
const CLAVE_TUTORIAL = 'fugazEscape.tutorialSuperado';
const leerRecord = () => { const r = Number(localStorage.getItem(CLAVE_RECORD)); return Number.isFinite(r) && r > 0 ? r : 0; };

const escena = crearEscena($('lienzo'));
const entrada = crearEntrada($('juego'));
const metricas = crearMetricas();
const audio = crearAudio();
const buffer = crearBuffer();
metricas.inicioSesion();

const CAUSAS = {
  trafico: 'Te comiste un coche. Pasa cerca, no encima.',
  cruce: 'Un coche del cruce. Mira las luces ámbar.',
  barrera: 'La barrera. Busca el hueco verde.',
  golpes: 'Tres embestidas. Apártate cuando parpadee el triángulo… o embiste tú primero.',
};

let estado = 'inicio';
let mundo = crearMundo({ semilla: 7 });
let tEstado = 0;
let nPartida = 0;
let repeticion = null;
let clip = null;      // { blob, nombre, formato }
let esRecord = false;
let fps = { frames: 0, t: 0, ventanaF: 0, ventanaT: 0 };
let decoT = 0;        // reloj del decorado en el inicio

function tamano() { escena.tamano(innerWidth, innerHeight); }
addEventListener('resize', () => { if (estado !== 'fin') tamano(); });
tamano();

// ------------------------------------------------------------------ partida
function nuevaPartida() {
  if (repeticion) { repeticion.parar(); repeticion = null; }
  tamano();
  const tutorial = localStorage.getItem(CLAVE_TUTORIAL) !== '1';
  const opciones = { semilla: Number(params.get('semilla')) || semillaNueva(), tutorial };
  if (PRUEBA && params.get('duracion')) opciones.duracion = Number(params.get('duracion'));
  if (PRUEBA && params.get('invulnerable') === '1') opciones.invulnerable = true;
  mundo = crearMundo(opciones);
  buffer.vaciar();
  clip = null; esRecord = false;
  fps = { frames: 0, t: 0, ventanaF: 0, ventanaT: 0 };
  nPartida = metricas.inicioPartida({ tutorial, entrada: entrada.tipo });
  entrada.reiniciar();
  audio.iniciar();
  $('inicio').hidden = true; $('fin').hidden = true; $('hud').hidden = false;
  $('lienzo').style.visibility = 'visible';
  $('guia').hidden = !tutorial;
  const teclado = !matchMedia('(pointer: coarse)').matches;
  $('guia').querySelector('.mano').style.display = teclado ? 'none' : '';
  $('guia').querySelector('.flechas').style.display = teclado ? 'none' : '';
  $('guia').querySelector('.teclas').hidden = !teclado;
  pintarGolpes(0);
  cambiar('cuenta');
}

function cambiar(e) { estado = e; tEstado = 0; document.body.dataset.estado = e; }

function datosFin() {
  const m = mundo;
  return {
    final: m.fin ? m.fin.final : 'abandono', causa: m.fin?.causa ?? null,
    duracion: +m.t.toFixed(2), puntos: Math.round(m.puntos), roces: m.roces, caidas: m.caidas,
    multMax: m.multMax, superoTutorial: !m.tutorial || m.t >= m.tTutorial,
    fpsMedio: fps.t > 0 ? +(fps.frames / fps.t).toFixed(1) : null,
  };
}

function terminar() {
  const m = mundo;
  if (m.tutorial && m.t >= m.tTutorial) localStorage.setItem(CLAVE_TUTORIAL, '1');
  const record = leerRecord();
  esRecord = m.puntos > record;
  if (esRecord) localStorage.setItem(CLAVE_RECORD, String(Math.round(m.puntos)));
  metricas.finPartida(datosFin());

  $('hud').hidden = true;
  $('fin').hidden = false;
  const escapo = m.fin.final === 'escape';
  $('finTitulo').textContent = escapo ? 'ESCAPASTE' : m.fin.final === 'cazado' ? 'TE CAZARON' : 'CHOQUE';
  $('finTitulo').className = `titulo ${escapo ? 'escape' : 'muerte'}`;
  $('causa').textContent = escapo ? `${m.caidas} patrullas fuera · ${m.roces} roces` : CAUSAS[m.fin.causa] || '';
  $('finPuntos').textContent = fmt(m.puntos);
  $('finRecord').textContent = esRecord ? '¡NUEVO RÉCORD!' : `Récord ${fmt(Math.max(record, m.puntos))}`;
  $('queja').hidden = escapo;
  $('queja').disabled = false; $('queja').classList.remove('hecho');
  const bc = $('compartir');
  bc.disabled = true; bc.classList.add('cargando'); bc.classList.remove('hecho');

  // Imagen-resumen siempre (respaldo); vídeo si el navegador sabe grabar.
  const resumen = imagenResumen({ m, record: Math.max(record, m.puntos), esRecord });
  lienzoABlob(resumen).then((b) => {
    if (b && !clip) clip = { blob: b, nombre: `fugaz-${Math.round(m.puntos)}.png`, formato: 'imagen' };
    if (!repeticion?.conVideo) listoCompartir();
  });
  $('lienzo').style.visibility = 'hidden';
  const n = nPartida;
  repeticion = grabarRepeticion({
    escena, vistas: buffer.copia(), destino: $('clip'), final: m.fin, record: esRecord,
    alAcabar: () => { if (estado === 'fin') tamano(); },
  });
  repeticion.promesa.then((blob) => {
    if (n !== nPartida || !blob) return;
    const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
    clip = { blob, nombre: `fugaz-${Math.round(m.puntos)}.${ext}`, formato: 'video' };
    listoCompartir();
  });
  cambiar('fin');
}

function listoCompartir() {
  if (estado !== 'fin') return;
  $('compartir').disabled = !clip;
  $('compartir').classList.remove('cargando');
}

// ------------------------------------------------------------------ HUD
let avisoT = 0;
function aviso(texto, color) {
  const a = $('aviso');
  a.textContent = texto; a.style.color = color; a.classList.add('ver');
  avisoT = 0.7;
}
function pintarGolpes(n) {
  [...$('golpes').children].forEach((el, i) => el.classList.toggle('roto', i >= C.golpesMuerte - n));
}
const marcasPatrulla = Array.from({ length: 6 }, () => {
  const d = document.createElement('div'); d.className = 'patrulla'; d.hidden = true; $('patrullas').appendChild(d); return d;
});
let multAnterior = 1;
function pintarHud(dt) {
  const m = mundo, j = m.jug;
  $('puntos').textContent = fmt(m.puntos);
  const mult = $('mult');
  mult.textContent = m.mult > 1 ? `x${m.mult.toFixed(1)}` : '';
  if (m.mult > multAnterior) { mult.classList.add('sube'); setTimeout(() => mult.classList.remove('sube'), 120); }
  multAnterior = m.mult;
  $('progreso').firstElementChild.style.width = `${Math.min(100, (100 * m.t) / m.duracionTotal)}%`;
  $('velo').textContent = `${Math.round(j.v * 3.6)} km/h`;
  // Patrullas detrás o fuera de cuadro: flecha roja abajo, que late si está a punto de alcanzarte.
  marcasPatrulla.forEach((d, i) => {
    const p = m.pol[i];
    const ver = p && !p.fuera && p.s < j.s - 2;
    d.hidden = !ver;
    if (!ver) return;
    const x = 50 + ((p.x - j.x * 0.55) / 16) * 100;
    d.style.left = `${Math.max(6, Math.min(94, x))}%`;
    d.classList.toggle('cerca', j.s - p.s < 14);
  });
  if (avisoT > 0) { avisoT -= dt; if (avisoT <= 0) $('aviso').classList.remove('ver'); }
  // Guía del tutorial: se va cuando has girado a los dos lados (o al acabar el tutorial).
  if (!$('guia').hidden && ((m.giros.izq && m.giros.der) || m.t > m.tTutorial)) $('guia').hidden = true;
}

function tratarSucesos(lista) {
  for (const s of lista) {
    if (s.tipo === 'roce') { aviso(`¡ROCE! x${s.mult.toFixed(1)}`, 'var(--ambar)'); audio.roce(); navigator.vibrate?.(15); }
    else if (s.tipo === 'caida') { aviso('¡PATRULLA FUERA!', 'var(--verde)'); audio.boom(); navigator.vibrate?.(40); }
    else if (s.tipo === 'empujon') { audio.golpe(); }
    else if (s.tipo === 'golpe') {
      pintarGolpes(s.golpes); audio.golpe(); navigator.vibrate?.(60);
      $('vineta').classList.add('golpe'); setTimeout(() => $('vineta').classList.remove('golpe'), 160);
    } else if (s.tipo === 'choque' || s.tipo === 'cazado') { audio.boom(); navigator.vibrate?.(180); cambiar('muriendo'); }
    else if (s.tipo === 'escape') { aviso('¡ESCAPASTE!', 'var(--verde)'); cambiar('muriendo'); }
  }
}

// ------------------------------------------------------------------ bucle
let ultimo = performance.now();
function bucle(ahora) {
  requestAnimationFrame(bucle);
  const dtReloj = Math.min(1, Math.max(0, (ahora - ultimo) / 1000));
  const dtReal = Math.min(0.1, dtReloj);
  ultimo = ahora;
  tEstado += dtReloj; // cuenta atrás y pausas con el reloj de verdad, aunque el dispositivo vaya lento
  const mando = entrada.leer(dtReal);

  if (estado === 'inicio') {
    decoT += dtReal;
    const v = mundo.vista();
    v.t = decoT; v.jug.s = decoT * 12; v.v = 12;
    escena.dibujar(v);
    return;
  }
  if (estado === 'fin') return; // la repetición dibuja por su cuenta

  if (estado === 'cuenta') {
    const quedan = C.cuenta - tEstado;
    $('cuenta').hidden = quedan <= 0;
    $('cuenta').textContent = String(Math.max(1, Math.ceil((quedan / C.cuenta) * 3)));
    if (quedan <= 0) cambiar('jugando');
  } else if (estado === 'jugando') {
    const pasos = Math.max(1, Math.ceil(dtReal / (1 / 60)));
    for (let i = 0; i < pasos && estado === 'jugando'; i++) tratarSucesos(mundo.paso(dtReal / pasos, mando));
    fps.frames++; fps.t += dtReal; fps.ventanaF++; fps.ventanaT += dtReal;
    if (fps.ventanaT > 2) { // calidad adaptable: si no llega a 50 fps, menos píxeles
      if (fps.ventanaF / fps.ventanaT < 50) escena.bajarCalidad();
      if (!$('fps').hidden) $('fps').textContent = `${(fps.ventanaF / fps.ventanaT).toFixed(0)} fps · x${escena.ratio}`;
      fps.ventanaF = 0; fps.ventanaT = 0;
    }
  } else if (estado === 'muriendo') {
    mundo.paso(dtReal * 0.25, mando);
    if (tEstado >= C.muriendo) { terminar(); return; }
  }

  const v = mundo.vista();
  if (estado === 'jugando' || estado === 'muriendo') buffer.meter(v);
  escena.dibujar(v, { sacudida: mundo.jug.golpeT > 0.3 ? 0.6 : estado === 'muriendo' ? 1.2 : 0, lenta: estado === 'muriendo' });
  pintarHud(dtReal);
  const cerca = mundo.pol.reduce((a, p) => (p.fuera ? a : Math.max(a, 1 - Math.min(1, Math.abs(mundo.jug.s - p.s) / 60))), 0);
  audio.marcha(mundo.jug.v, cerca, mundo.t, estado === 'jugando' || estado === 'cuenta');
}
requestAnimationFrame(bucle);

// ------------------------------------------------------------------ botones
const pulsar = (el, fn) => el.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); fn(); });
pulsar($('jugar'), nuevaPartida);
pulsar($('unamas'), nuevaPartida);
pulsar($('queja'), () => {
  if ($('queja').disabled) return;
  metricas.queja(nPartida, mundo.fin?.causa ?? null);
  $('queja').disabled = true; $('queja').classList.add('hecho'); $('queja').textContent = '✓';
  setTimeout(() => { $('queja').textContent = '?'; }, 1500);
});
pulsar($('compartir'), async () => {
  if (!clip) return;
  const n = nPartida;
  const r = await compartirArchivo(clip.blob, clip.nombre);
  metricas.compartir(n, { ...r, formato: clip.formato });
  if (r.ok) $('compartir').classList.add('hecho');
});
pulsar($('sonido'), () => { $('sonido').style.opacity = audio.alternar() ? 1 : 0.4; });
$('sonido').style.opacity = audio.activo ? 1 : 0.4;
addEventListener('keydown', (e) => {
  if ((e.key === ' ' || e.key === 'Enter') && (estado === 'inicio' || (estado === 'fin' && tEstado > 0.25))) { e.preventDefault(); nuevaPartida(); }
  if (e.key === 'M' && e.shiftKey) abrirPanel();
});

// Partida a medias al cerrar o cambiar de app: queda como abandono.
addEventListener('pagehide', () => { if (estado === 'jugando' || estado === 'cuenta') metricas.abandono(datosFin()); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (estado === 'jugando' || estado === 'cuenta')) metricas.abandono(datosFin());
});

// ------------------------------------------------------------------ panel oculto de métricas
// Se abre con 5 toques seguidos en el logo, con Mayús+M o con #metricas en la dirección.
let toquesLogo = [];
pulsar($('logo'), () => {
  const t = performance.now();
  toquesLogo = toquesLogo.filter((x) => t - x < 4000).concat(t);
  if (toquesLogo.length >= 5) { toquesLogo = []; abrirPanel(); }
});
function abrirPanel() {
  if (estado !== 'inicio' && estado !== 'fin') return; // nunca a mitad de partida
  $('panelTexto').textContent = JSON.stringify(metricas.resumen(), null, 2);
  $('panel').hidden = false;
}
pulsar($('cerrar'), () => { $('panel').hidden = true; });
pulsar($('exportar'), () => {
  const blob = new Blob([metricas.exportar()], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fugaz-metricas-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
});
pulsar($('copiar'), () => { navigator.clipboard?.writeText(metricas.exportar()); });
pulsar($('borrar'), () => {
  if (confirm('¿Borrar todas las métricas de este dispositivo?')) { metricas.borrar(); abrirPanel(); }
});
if (location.hash === '#metricas') abrirPanel();
if (params.get('fps') === '1') $('fps').hidden = false;

const r = leerRecord();
$('recordInicio').textContent = r ? `RÉCORD ${fmt(r)}` : '';

// Ganchos para las pruebas automáticas (Playwright). No cambian el juego.
window.__escape = {
  get estado() { return estado; },
  get mundo() { return mundo; },
  get clip() { return clip; },
  metricas,
  // Avanza la lógica sin dibujar (con el piloto que se le pase o sin girar).
  avanzar(segundos, piloto) {
    const n = Math.round(segundos * 60);
    for (let i = 0; i < n && estado === 'jugando'; i++) tratarSucesos(mundo.paso(1 / 60, piloto ? piloto(mundo) : { giro: 0 }));
    return estado;
  },
};
