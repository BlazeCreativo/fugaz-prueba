// Clip vertical compartible: se guardan las últimas «vistas» de la partida (unos pocos números por fotograma)
// y al terminar se vuelve a dibujar esa repetición en vertical (9:16) sobre un lienzo 2D con el marcador encima,
// grabándolo con MediaRecorder. Si el navegador no sabe grabar, queda la imagen-resumen con el recorrido.

import { C } from './config.js';

export const CLIP_W = 405, CLIP_H = 720;

export function crearBuffer(segundos = C.clipSegundos) {
  const lista = [];
  return {
    meter(v) {
      lista.push(v);
      while (lista.length > 2 && lista[lista.length - 1].t - lista[0].t > segundos) lista.shift();
    },
    copia: () => lista.slice(),
    vaciar: () => { lista.length = 0; },
  };
}

export function tipoVideo() {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null;
  for (const t of ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) {
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return null;
}

const fmt = (n) => Math.round(n).toLocaleString('es-ES');

function rotulos(g, w, h, v, { final, record }) {
  g.save();
  const grad = g.createLinearGradient(0, 0, 0, 110);
  grad.addColorStop(0, 'rgba(7,10,18,0.85)'); grad.addColorStop(1, 'rgba(7,10,18,0)');
  g.fillStyle = grad; g.fillRect(0, 0, w, 110);
  g.fillStyle = '#7FE3FF';
  g.font = '800 34px "Saira Extra Condensed", "Arial Narrow", sans-serif';
  g.textAlign = 'left';
  g.fillText('FUGAZ', 18, 44);
  g.fillStyle = '#E8EDF7';
  g.font = '700 28px "Overpass Mono", monospace';
  g.textAlign = 'right';
  g.fillText(fmt(v.puntos), w - 18, 42);
  if (v.mult > 1) { g.fillStyle = '#FFB020'; g.font = '700 20px "Overpass Mono", monospace'; g.fillText(`x${v.mult.toFixed(1)}`, w - 18, 68); }
  if (final) {
    g.fillStyle = 'rgba(7,10,18,0.78)'; g.fillRect(0, h * 0.36, w, h * 0.28);
    g.textAlign = 'center';
    g.fillStyle = final.final === 'escape' ? '#3DDC84' : '#FF3355';
    g.font = '800 64px "Saira Extra Condensed", "Arial Narrow", sans-serif';
    g.fillText(final.final === 'escape' ? 'ESCAPÉ' : final.final === 'cazado' ? 'ME CAZARON' : 'CHOQUÉ', w / 2, h * 0.36 + 72);
    g.fillStyle = '#E8EDF7';
    g.font = '700 40px "Overpass Mono", monospace';
    g.fillText(fmt(v.puntos), w / 2, h * 0.36 + 124);
    g.fillStyle = '#9AA6BC';
    g.font = '600 20px "Overpass", sans-serif';
    g.fillText(record ? '¡RÉCORD! ¿Me superas?' : '¿Me superas?', w / 2, h * 0.36 + 162);
  }
  g.restore();
}

// Reproduce la repetición en `destino` (lienzo 2D vertical). Devuelve { parar(), promesa → Blob|null }.
export function grabarRepeticion({ escena, vistas, destino, final, record, alAcabar }) {
  const g = destino.getContext('2d');
  destino.width = CLIP_W; destino.height = CLIP_H;
  const mime = tipoVideo();
  let grabador = null, trozos = [];
  if (mime) {
    try {
      grabador = new MediaRecorder(destino.captureStream(30), { mimeType: mime, videoBitsPerSecond: 2_500_000 });
      grabador.ondataavailable = (e) => { if (e.data && e.data.size) trozos.push(e.data); };
    } catch { grabador = null; }
  }
  let resolver;
  const promesa = new Promise((r) => { resolver = r; });
  if (grabador) {
    grabador.onstop = () => resolver(trozos.length ? new Blob(trozos, { type: mime.split(';')[0] }) : null);
    grabador.start(250);
  }

  escena.tamano(CLIP_W, CLIP_H);
  const t0 = vistas.length ? vistas[0].t : 0;
  const tFin = vistas.length ? vistas[vistas.length - 1].t : 0;
  const TARJETA = 1.6; // s con el resultado al final
  let inicio = null, i = 0, parado = false;

  function fotograma(ahora) {
    if (parado) return;
    if (inicio === null) inicio = ahora;
    // Los últimos 1,2 s antes del final van a cámara lenta (la mitad de velocidad).
    let te = (ahora - inicio) / 1000;
    const lentoDesde = Math.max(0, tFin - t0 - 1.2);
    let tv = te <= lentoDesde ? te : lentoDesde + (te - lentoDesde) * 0.5;
    const enTarjeta = t0 + tv > tFin;
    tv = Math.min(tv, tFin - t0);
    while (i < vistas.length - 1 && vistas[i + 1].t - t0 <= tv) i++;
    const v = vistas[i];
    if (v) {
      escena.dibujar(v, { lenta: te > lentoDesde });
      g.drawImage(escena.lienzo, 0, 0, CLIP_W, CLIP_H);
      rotulos(g, CLIP_W, CLIP_H, v, { final: enTarjeta ? final : null, record });
    }
    const duracion = lentoDesde + (tFin - t0 - lentoDesde) * 2 + TARJETA;
    if (te >= duracion || !v) { terminar(); return; }
    requestAnimationFrame(fotograma);
  }
  function terminar() {
    if (parado) return;
    parado = true;
    if (grabador && grabador.state !== 'inactive') grabador.stop(); else resolver(null);
    alAcabar?.();
  }
  requestAnimationFrame(fotograma);
  return { parar: terminar, promesa, conVideo: !!grabador };
}

// Imagen-resumen 1080×1920: marcador, récord, datos y el recorrido visto desde arriba.
export function imagenResumen({ m, record, esRecord }) {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#070A12'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#7FE3FF';
  g.font = '800 120px "Saira Extra Condensed", "Arial Narrow", sans-serif';
  g.textAlign = 'center';
  g.fillText('FUGAZ', W / 2, 170);
  const fin = m.fin || { final: 'abandono' };
  g.fillStyle = fin.final === 'escape' ? '#3DDC84' : '#FF3355';
  g.font = '800 96px "Saira Extra Condensed", "Arial Narrow", sans-serif';
  g.fillText(fin.final === 'escape' ? 'ESCAPÉ' : fin.final === 'cazado' ? 'ME CAZARON' : 'CHOQUÉ', W / 2, 300);
  g.fillStyle = '#E8EDF7';
  g.font = '700 110px "Overpass Mono", monospace';
  g.fillText(fmt(m.puntos), W / 2, 440);
  g.fillStyle = esRecord ? '#FFB020' : '#9AA6BC';
  g.font = '600 44px "Overpass", sans-serif';
  g.fillText(esRecord ? '¡NUEVO RÉCORD!' : `Récord: ${fmt(record)}`, W / 2, 510);
  g.fillStyle = '#9AA6BC';
  g.font = '600 38px "Overpass", sans-serif';
  g.fillText(`${Math.round(m.t)} s · ${Math.round(m.jug.s)} m · ${m.roces} roces · ${m.caidas} patrullas fuera · x${m.multMax.toFixed(1)}`, W / 2, 580);

  // Recorrido: la avenida en vertical, de abajo (salida) a arriba (final).
  const x0 = 240, x1 = W - 240, y0 = H - 160, y1 = 680;
  g.fillStyle = '#1b2133'; g.fillRect(x0, y1, x1 - x0, y0 - y1);
  g.strokeStyle = '#4f6dff'; g.lineWidth = 6; g.strokeRect(x0, y1, x1 - x0, y0 - y1);
  const r = m.recorrido;
  const sMax = Math.max(1, m.jug.s);
  const px = (x) => x0 + ((x + C.mitadCalzada) / (2 * C.mitadCalzada)) * (x1 - x0);
  const py = (s) => y0 - (s / sMax) * (y0 - y1);
  g.strokeStyle = '#7FE3FF'; g.lineWidth = 8; g.lineJoin = 'round';
  g.beginPath();
  r.forEach(([s, x], k) => (k ? g.lineTo(px(x), py(s)) : g.moveTo(px(x), py(s))));
  g.stroke();
  for (const [s, x, suceso] of r) {
    if (!suceso) continue;
    g.fillStyle = suceso === 'roce' ? '#FFB020' : suceso === 'caida' ? '#3DDC84' : '#FF3355';
    g.beginPath(); g.arc(px(x), py(s), suceso === 'fin' ? 26 : 14, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#9AA6BC'; g.font = '600 32px "Overpass", sans-serif';
  g.fillText('● roce   ● patrulla fuera   ● final', W / 2, H - 90);
  return c;
}

export const lienzoABlob = (c, tipo = 'image/png') => new Promise((r) => c.toBlob(r, tipo));

// Comparte con el menú del sistema si se puede; si no, descarga el archivo.
export async function compartirArchivo(blob, nombre) {
  const archivo = new File([blob], nombre, { type: blob.type });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'FUGAZ', text: '¿Me superas en FUGAZ?' });
      return { metodo: 'compartir', ok: true };
    } catch (e) {
      return { metodo: 'compartir', ok: false, error: e?.name || 'error' };
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  return { metodo: 'descarga', ok: true };
}
