// Bucle de «Noche en autopista»: menú → cuenta → partida → (golpe a cámara lenta) → final → «una más».
(function (N) {
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const PRUEBA = params.get('prueba') === '1';
  const fmt = (n) => Math.round(n).toLocaleString('es-ES');
  const esMovil = matchMedia('(pointer: coarse)').matches;

  // ---------------------------------------------------------------- datos guardados (validados)
  const CLAVE_RECORD = 'fugazNoche.record', CLAVE_AJUSTES = 'fugazNoche.ajustes', CLAVE_GUIA = 'fugazNoche.guiaVista';
  const leer = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (_) { /* modo privado */ } };
  const leerRecord = () => { const r = Number(leer(CLAVE_RECORD)); return Number.isFinite(r) && r > 0 ? Math.round(r) : 0; };
  const AJ_VALIDOS = { camara: ['cabina', 'fuera'], control: ['pulgar', 'zonas', 'inclinar'], calidad: ['auto', 'baja', 'media', 'alta'] };
  const ajustes = { camara: 'cabina', control: 'pulgar', calidad: 'auto' };
  try {
    const a = JSON.parse(leer(CLAVE_AJUSTES) || '{}');
    if (a && typeof a === 'object') for (const k in AJ_VALIDOS) if (AJ_VALIDOS[k].includes(a[k])) ajustes[k] = a[k];
  } catch (_) { /* dato corrupto: valores por defecto */ }
  const guardarAjustes = () => guardar(CLAVE_AJUSTES, JSON.stringify(ajustes));

  // ---------------------------------------------------------------- piezas
  const lienzoRelojes = $('relojesFuera');
  const escena = N.crearEscena($('lienzo'), { movil: esMovil, lienzoRelojes });
  const relojes = N.crearRelojes(lienzoRelojes);
  const entrada = N.crearEntrada($('juego'), { modo: ajustes.control });

  let estado = 'inicio', tEstado = 0, mundo = null, semillaMenu = 7;
  let tGolpe = 0, ultimoFin = 0, nPartidas = 0, esRecord = false;
  const fps = { n: 0, t: 0, ventana: [], media: 60, cambios: 0 };

  function cambiar(e) { estado = e; tEstado = 0; document.body.dataset.estado = e; entrada.jugando = e === 'jugando'; }

  // ---------------------------------------------------------------- calidad
  function nivelInicial() {
    if (ajustes.calidad !== 'auto') return ajustes.calidad;
    if (params.get('calidad') && N.NIVELES[params.get('calidad')]) return params.get('calidad');
    return esMovil ? 'baja' : 'media';
  }
  escena.ponerNivel(nivelInicial());
  // Auto: cada 2 s mira los fps; baja si van flojos y sube si sobran (en móvil como mucho «media»).
  function ajustarCalidad(dtReal) {
    fps.n++; fps.t += dtReal;
    if (fps.t < 2) return;
    fps.media = fps.n / fps.t; fps.n = 0; fps.t = 0;
    if (ajustes.calidad !== 'auto' || estado !== 'jugando') return;
    const orden = ['baja', 'media', 'alta'], i = orden.indexOf(escena.nivel);
    const tope = esMovil ? 1 : 2;
    if (fps.media < (esMovil ? 38 : 50) && i > 0) { escena.ponerNivel(orden[i - 1]); fps.cambios++; fps.subir = 0; }
    else if (fps.media > 58.5 && i < tope) { fps.subir = (fps.subir || 0) + 1; if (fps.subir >= 2 && fps.cambios < 3) { escena.ponerNivel(orden[i + 1]); fps.cambios++; fps.subir = 0; } }
    else fps.subir = 0;
  }

  // ---------------------------------------------------------------- tamaño
  function tamano() { escena.tamano(innerWidth, innerHeight); }
  addEventListener('resize', tamano);
  tamano();

  // ---------------------------------------------------------------- menú
  function pintarOpciones() {
    for (const [id, k] of [['opCamara', 'camara'], ['opControl', 'control'], ['opCalidad', 'calidad']]) {
      for (const b of $(id).querySelectorAll('button')) b.classList.toggle('si', b.dataset.v === ajustes[k]);
    }
    $('opControl').hidden = !esMovil;
    $('ayuda').innerHTML = esMovil
      ? { pulgar: 'Desliza el pulgar a los lados para esquivar. Abajo frena, arriba turbo.',
        zonas: 'Toca la izquierda o la derecha para esquivar. Las dos a la vez frenan.',
        inclinar: 'Inclina el móvil para esquivar. Mantén el dedo para frenar.' }[ajustes.control]
        + '<br>Roza los coches sin tocarlos: cada roce sube el multiplicador. Frenar o chocar lo pierde.'
      : '← → esquivar · ↑ turbo · ↓ frenar · C cámara · Intro empezar<br>Mando: stick, gatillos (RT turbo, LT freno), A empezar, Y cámara.'
        + '<br>Roza los coches sin tocarlos: cada roce sube el multiplicador. Frenar o chocar lo pierde.';
    const r = leerRecord();
    $('record').innerHTML = r ? `Récord <b>${fmt(r)}</b>` : '';
  }
  for (const [id, k] of [['opCamara', 'camara'], ['opControl', 'control'], ['opCalidad', 'calidad']]) {
    $(id).addEventListener('click', async (ev) => {
      const v = ev.target.dataset && ev.target.dataset.v;
      if (!v) return;
      if (k === 'control' && v === 'inclinar') { const ok = await entrada.pedirInclinacion(); if (!ok) { avisoMenu('Este móvil no deja usar la inclinación'); return; } }
      ajustes[k] = v; guardarAjustes();
      if (k === 'camara') escena.ponerVista(v);
      if (k === 'control') entrada.modo = v;
      if (k === 'calidad') { escena.ponerNivel(v === 'auto' ? nivelInicial() : v); fps.cambios = 0; }
      pintarOpciones();
    });
  }
  function avisoMenu(t) { $('ayuda').textContent = t; }
  escena.ponerVista(ajustes.camara);
  if (ajustes.control === 'inclinar') entrada.pedirInclinacion(); // en Android no hace falta permiso; en iOS se vuelve a pedir al tocar
  pintarOpciones();

  // ---------------------------------------------------------------- partida
  function nuevaPartida() {
    const op = { semilla: Number(params.get('semilla')) || ((Math.random() * 1e9) >>> 0) };
    if (PRUEBA && params.get('duracion')) op.duracion = Number(params.get('duracion'));
    if (PRUEBA && params.get('invulnerable') === '1') op.invulnerable = true;
    if (PRUEBA && params.get('sinTrafico') === '1') op.sinTrafico = true;
    mundo = N.crearMundo(op);
    nPartidas++;
    esRecord = false;
    entrada.reiniciar();
    $('inicio').hidden = true; $('fin').hidden = true; $('hud').hidden = false;
    pintarVidas();
    $('avisos').innerHTML = '';
    const guia = leer(CLAVE_GUIA) !== '1';
    $('guia').hidden = !guia;
    $('guia').querySelector('.tactil').hidden = !esMovil;
    $('guia').querySelector('.teclas').hidden = esMovil;
    $('guia').querySelector('.tactil .fila').textContent = { pulgar: 'desliza para esquivar · abajo frena', zonas: 'toca un lado para esquivar · los dos frenan', inclinar: 'inclina para esquivar · dedo frena' }[entrada.modo];
    $('btnCam').hidden = false;
    cambiar('cuenta');
  }
  function empezar() {
    if (estado === 'inicio') nuevaPartida();
    else if (estado === 'fin' && performance.now() - ultimoFin > 350) nuevaPartida();
  }
  entrada.alPulsar = (a) => {
    if (a === 'empezar') empezar();
    else if (a === 'camara') cambiarCamara();
  };
  function cambiarCamara() {
    ajustes.camara = ajustes.camara === 'cabina' ? 'fuera' : 'cabina';
    guardarAjustes(); escena.ponerVista(ajustes.camara); pintarOpciones();
  }
  $('jugar').addEventListener('click', (ev) => { ev.stopPropagation(); nuevaPartida(); });
  $('unamas').addEventListener('click', (ev) => { ev.stopPropagation(); nuevaPartida(); });
  $('menu').addEventListener('click', () => { $('fin').hidden = true; $('inicio').hidden = false; $('hud').hidden = true; pintarOpciones(); cambiar('inicio'); $('jugar').focus(); });
  $('btnCam').addEventListener('pointerdown', (ev) => ev.stopPropagation());
  $('btnCam').addEventListener('click', (ev) => { ev.stopPropagation(); cambiarCamara(); });

  // ---------------------------------------------------------------- HUD
  function pintarVidas() {
    const v = $('vidas').children;
    for (let i = 0; i < v.length; i++) v[i].classList.toggle('fuera', i >= mundo.jug.vidas);
  }
  function aviso(texto, clase) {
    const d = document.createElement('div');
    d.className = 'aviso ' + (clase || ''); d.textContent = texto;
    $('avisos').appendChild(d);
    setTimeout(() => d.remove(), 950);
  }
  let pulsoT = 0;
  function eventos() {
    for (const e of mundo.eventos) {
      if (e.tipo === 'roce') {
        aviso((e.limite ? '¡AL LÍMITE! +' : 'ROCE +') + fmt(e.puntos), e.limite ? 'limite' : '');
        $('mult').classList.add('pulso'); pulsoT = 0.15;
        if (navigator.vibrate && esMovil) navigator.vibrate(e.limite ? 25 : 12);
      } else if (e.tipo === 'comboPerdido') {
        if (e.combo > 0 && e.motivo !== 'choque') aviso({ freno: 'FRENASTE · COMBO FUERA', muro: 'MURO · COMBO FUERA', tiempo: 'COMBO FUERA' }[e.motivo] || 'COMBO FUERA', 'malo');
      } else if (e.tipo === 'choque') {
        escena.sacudir(1);
        const f = $('flash'); f.style.transition = 'none'; f.style.opacity = 1;
        requestAnimationFrame(() => { f.style.transition = 'opacity 0.5s'; f.style.opacity = 0; });
        if (navigator.vibrate && esMovil) navigator.vibrate([60, 30, 90]);
        pintarVidas();
        if (!mundo.fin) aviso('¡GOLPE!', 'malo');
      }
    }
    mundo.eventos.length = 0;
  }
  function pintarHud(dt) {
    $('puntos').textContent = fmt(mundo.puntos);
    $('mult').textContent = '×' + (Math.round(mundo.mult * 10) / 10).toLocaleString('es-ES');
    $('comboBarra').firstElementChild.style.width = (mundo.comboT > 0 ? (mundo.comboT / N.C.comboVida) * 100 : 0) + '%';
    $('tiempo').textContent = Math.max(0, Math.ceil(mundo.duracion - mundo.t));
    if (pulsoT > 0) { pulsoT -= dt; if (pulsoT <= 0) $('mult').classList.remove('pulso'); }
    $('relojesFuera').hidden = escena.vista !== 'fuera';
  }

  // ---------------------------------------------------------------- final
  function mostrarFin() {
    const f = mundo.fin;
    const r = leerRecord();
    esRecord = f.puntos > r;
    if (esRecord) guardar(CLAVE_RECORD, String(f.puntos));
    guardar(CLAVE_GUIA, '1');
    $('finTitulo').textContent = f.final === 'choque' ? 'SINIESTRO' : 'FIN DEL TIEMPO';
    $('finTitulo').classList.toggle('malo', f.final === 'choque');
    $('finPuntos').textContent = fmt(f.puntos);
    $('finRecord').hidden = !esRecord;
    $('finDatos').innerHTML = [['Roces', f.roces], ['Al límite', f.alLimite], ['Mult. máx.', '×' + f.multMax.toLocaleString('es-ES')],
      ['Punta', f.velMaxKmh + ' km/h'], ['Récord', fmt(Math.max(r, f.puntos))]].map(([k, v]) => `<div><b>${v}</b>${k}</div>`).join('');
    $('hud').hidden = true; $('fin').hidden = false;
    ultimoFin = performance.now();
    cambiar('fin');
    $('unamas').focus();
  }

  // ---------------------------------------------------------------- bucle
  const PASO = 1 / 60;
  let acumulado = 0, ant = performance.now();
  const NEUTRO = { giro: 0, freno: 0, gas: 0 };
  let entradaActual = NEUTRO;
  // mundo de decorado para el menú (sin tráfico peligroso: solo pasa)
  let decorado = N.crearMundo({ semilla: semillaMenu, invulnerable: true });

  function cuadro(ahora) {
    const dtReloj = Math.min(1, Math.max(0, (ahora - ant) / 1000)); ant = ahora;
    const dtReal = Math.min(0.1, dtReloj);
    tEstado += dtReloj; // la cuenta atrás y las pausas van con el reloj de verdad, aunque el móvil vaya lento
    ajustarCalidad(dtReloj);
    let visible = mundo || decorado;
    let dtVista = dtReal;
    if (estado === 'inicio' || (estado === 'fin' && !mundo)) {
      // el menú enseña la autopista con el piloto a velocidad de crucero
      decorado.paso(dtReal, N.piloto(decorado)); decorado.eventos.length = 0;
      if (decorado.fin) decorado = N.crearMundo({ semilla: ++semillaMenu, invulnerable: true });
      visible = decorado;
      entrada.leer(dtReal); // el mando también sirve en el menú (A empieza)
    } else if (estado === 'fin') {
      entrada.leer(dtReal);
    } else if (estado === 'cuenta') {
      const dur = nPartidas > 1 ? 0.8 : 1.2;
      const k = Math.ceil((dur - tEstado) / (dur / 3));
      $('cuenta').hidden = false; $('cuenta').textContent = k > 0 ? String(k) : '';
      if (tEstado >= dur) { $('cuenta').hidden = true; cambiar('jugando'); }
      entrada.leer(dtReal); // descarta lo que haya
    } else if (estado === 'jugando') {
      entradaActual = entrada.leer(dtReal);
      acumulado += dtReal;
      while (acumulado >= PASO) { mundo.paso(PASO, entradaActual); acumulado -= PASO; if (mundo.fin) break; }
      eventos();
      if (mundo.t > 6 && !$('guia').hidden) $('guia').hidden = true;
      if (mundo.fin) { cambiar(mundo.fin.final === 'choque' ? 'golpe' : 'golpe'); tGolpe = 0; acumulado = 0; }
      pintarHud(dtReal);
    } else if (estado === 'golpe') {
      // medio segundo a cámara lenta antes de la pantalla final
      tGolpe += dtReloj;
      dtVista = dtReal * 0.25;
      if (tGolpe > (mundo.fin.final === 'choque' ? 0.6 : 0.2)) mostrarFin();
    }
    const turbo = estado === 'jugando' && entradaActual.gas > 0.5;
    const relojesNuevos = relojes.dibujar(visible.jug, turbo, dtReal);
    escena.dibujar(visible, dtVista, { turbo: turbo ? 1 : 0, relojesNuevos });
    if (mostrarFps) $('fps').textContent = `${fps.media.toFixed(0)} fps · ${escena.nivel} · ${escena.info().llamadas} llamadas`;
    requestAnimationFrame(cuadro);
  }
  const mostrarFps = params.get('fps') === '1';
  $('fps').hidden = !mostrarFps;
  requestAnimationFrame(cuadro);

  // ---------------------------------------------------------------- para las pruebas
  window.__noche = {
    get estado() { return estado; },
    get mundo() { return mundo; },
    get fps() { return fps.media; },
    get nivel() { return escena.nivel; },
    escena, entrada,
    // simula segundos de partida de golpe (con la entrada que se le pase)
    avanzar(seg, ent = NEUTRO) {
      if (estado === 'cuenta') { cambiar('jugando'); $('cuenta').hidden = true; }
      if (estado !== 'jugando') return;
      for (let i = 0; i < Math.round(seg / PASO) && !mundo.fin; i++) mundo.paso(PASO, ent);
    },
  };
})(window.N = window.N || {});
