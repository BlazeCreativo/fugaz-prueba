// Cuentarrevoluciones y velocímetro del salpicadero, dibujados en un canvas que la cabina usa como textura
// (y que en la vista exterior se enseña tal cual en una esquina).
(function (N) {
  const MARCHAS = [0, 62, 98, 135, 172, 212, 400]; // km/h a los que cambia de marcha

  N.crearRelojes = function (lienzo) {
    const g = lienzo.getContext('2d');
    const W = lienzo.width, H = lienzo.height;
    let rpmMostrada = 1000;

    function esfera(cx, cy, r, valor, max, rojo, marcas, etiqueta, texto, sub) {
      g.save();
      g.translate(cx, cy);
      g.fillStyle = '#05070b'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#1d2733'; g.lineWidth = 4; g.stroke();
      const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
      const ang = (v) => a0 + (a1 - a0) * Math.min(1, Math.max(0, v / max));
      // arco rojo
      g.strokeStyle = 'rgba(255,50,40,0.85)'; g.lineWidth = 8;
      g.beginPath(); g.arc(0, 0, r - 12, ang(rojo), a1); g.stroke();
      // marcas
      for (let i = 0; i <= marcas; i++) {
        const a = a0 + (a1 - a0) * i / marcas, larga = i % 2 === 0;
        g.strokeStyle = i / marcas >= rojo / max ? '#ff5b4c' : '#c7d6e6'; g.lineWidth = larga ? 4 : 2;
        g.beginPath(); g.moveTo(Math.cos(a) * (r - 8), Math.sin(a) * (r - 8)); g.lineTo(Math.cos(a) * (r - (larga ? 24 : 16)), Math.sin(a) * (r - (larga ? 24 : 16))); g.stroke();
        if (larga) {
          g.fillStyle = '#8fa3b8'; g.font = '600 15px "Overpass Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText(String(Math.round(max * i / marcas / (max > 1000 ? 1000 : 1))), Math.cos(a) * (r - 38), Math.sin(a) * (r - 38));
        }
      }
      // aguja
      const a = ang(valor);
      g.strokeStyle = '#ff6a2a'; g.lineWidth = 5; g.shadowColor = '#ff6a2a'; g.shadowBlur = 12;
      g.beginPath(); g.moveTo(-Math.cos(a) * 12, -Math.sin(a) * 12); g.lineTo(Math.cos(a) * (r - 16), Math.sin(a) * (r - 16)); g.stroke();
      g.shadowBlur = 0;
      g.fillStyle = '#1b222c'; g.beginPath(); g.arc(0, 0, 10, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#eaf2fb'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '800 46px "Saira Extra Condensed", sans-serif'; g.fillText(texto, 0, r * 0.42);
      g.fillStyle = '#7f93a8'; g.font = '600 15px "Overpass Mono", monospace'; g.fillText(etiqueta, 0, r * 0.7);
      if (sub) { g.fillStyle = '#19c6d8'; g.font = '800 30px "Saira Extra Condensed", sans-serif'; g.fillText(sub, 0, -r * 0.36); }
      g.restore();
    }

    return {
      // devuelve true si ha redibujado (para subir la textura)
      dibujar(J, turbo, dt) {
        const kmh = N.kmh(J.v);
        let m = 1; while (m < 6 && kmh > MARCHAS[m]) m++;
        const lo = MARCHAS[m - 1], hi = Math.min(MARCHAS[m], 300);
        const rpm = 2600 + 5600 * Math.min(1, (kmh - lo) / Math.max(1, hi - lo)) + (turbo ? 400 : 0);
        rpmMostrada += (rpm - rpmMostrada) * Math.min(1, dt * 10);
        g.clearRect(0, 0, W, H);
        g.fillStyle = '#020305'; g.fillRect(0, 0, W, H);
        esfera(W * 0.26, H * 0.52, H * 0.46, rpmMostrada, 9000, 7200, 18, 'RPM ×1000', String(m), null);
        esfera(W * 0.74, H * 0.52, H * 0.46, kmh, 320, 400, 16, 'km/h', String(Math.round(kmh)), null);
        // testigos
        if (turbo) { g.fillStyle = '#19c6d8'; g.font = '800 22px "Saira Extra Condensed", sans-serif'; g.textAlign = 'center'; g.fillText('TURBO', W / 2, H * 0.18); }
        if (J.freno > 0.05) { g.fillStyle = '#ff3a30'; g.beginPath(); g.arc(W / 2, H * 0.82, 9, 0, Math.PI * 2); g.fill(); }
        return true;
      },
    };
  };
})(window.N = window.N || {});
