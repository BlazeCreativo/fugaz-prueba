// Sonido sintetizado con WebAudio (sin archivos ni música de terceros): motor, sirena, roces y golpes.

export function crearAudio() {
  let ctx = null, motor, motorGain, sirena, sirenaGain, maestro, ruido;
  const a = { activo: localStorage.getItem('fugazEscape.sonido') !== '0' };

  function iniciar() {
    if (ctx || !a.activo) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    maestro = ctx.createGain(); maestro.gain.value = 0.5; maestro.connect(ctx.destination);
    motor = ctx.createOscillator(); motor.type = 'sawtooth';
    const filtro = ctx.createBiquadFilter(); filtro.type = 'lowpass'; filtro.frequency.value = 420;
    motorGain = ctx.createGain(); motorGain.gain.value = 0;
    motor.connect(filtro).connect(motorGain).connect(maestro); motor.start();
    sirena = ctx.createOscillator(); sirena.type = 'square';
    const fs = ctx.createBiquadFilter(); fs.type = 'bandpass'; fs.frequency.value = 900;
    sirenaGain = ctx.createGain(); sirenaGain.gain.value = 0;
    sirena.connect(fs).connect(sirenaGain).connect(maestro); sirena.start();
    ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function golpeRuido(dur, frec, tipo, vol) {
    if (!ctx) return;
    const s = ctx.createBufferSource(); s.buffer = ruido;
    const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = frec;
    const g = ctx.createGain(); const t = ctx.currentTime;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f).connect(g).connect(maestro); s.start(t); s.stop(t + dur);
  }

  Object.assign(a, {
    iniciar() { iniciar(); ctx?.resume?.(); },
    alternar() {
      a.activo = !a.activo;
      localStorage.setItem('fugazEscape.sonido', a.activo ? '1' : '0');
      if (!a.activo && ctx) { ctx.close(); ctx = null; } else iniciar();
      return a.activo;
    },
    // v: velocidad (m/s); cercania: 0..1 de la patrulla más próxima; t: tiempo de juego.
    marcha(v, cercania, t, enMarcha) {
      if (!ctx) return;
      const now = ctx.currentTime;
      motor.frequency.setTargetAtTime(40 + v * 2.2, now, 0.05);
      motorGain.gain.setTargetAtTime(enMarcha ? 0.18 : 0, now, 0.1);
      sirena.frequency.setTargetAtTime(Math.floor(t * 2.5) % 2 ? 960 : 720, now, 0.01);
      sirenaGain.gain.setTargetAtTime(enMarcha ? cercania * 0.12 : 0, now, 0.1);
    },
    roce() { golpeRuido(0.25, 2500, 'highpass', 0.5); },
    golpe() { golpeRuido(0.3, 600, 'lowpass', 0.9); },
    boom() { golpeRuido(0.9, 300, 'lowpass', 1.2); },
  });
  return a;
}
