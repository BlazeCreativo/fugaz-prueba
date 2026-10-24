// Texturas hechas a mano con canvas al arrancar (sin archivos de imagen): asfalto, ventanas, túnel, carteles,
// silueta de la ciudad y halos de luz. Todo es propio, sin recursos de terceros.
(function (N) {
  function lienzo(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function tex(c, repetir) {
    const t = new THREE.CanvasTexture(c);
    if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 4;
    return t;
  }

  N.crearTexturas = function (pista, rnd) {
    const T = {};
    // ---- asfalto: el ancho de la textura es todo el tablero (de muro a muro); una repetición = 12 m
    {
      const [c, g] = lienzo(512, 512);
      g.fillStyle = '#17181c'; g.fillRect(0, 0, 512, 512);
      const img = g.getImageData(0, 0, 512, 512), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 16; d[i] += n; d[i + 1] += n; d[i + 2] += n + 1; }
      g.putImageData(img, 0, 0);
      // rodadas más gastadas (más brillantes: reflejan) en el centro de cada carril
      const W = pista.muro * 2, px = (x) => (x + pista.muro) / W * 512;
      for (let n = 0; n < N.C.carriles; n++) for (const off of [-0.9, 0.9]) {
        const x = px(pista.carril(n) + off);
        const gr = g.createLinearGradient(x - 10, 0, x + 10, 0);
        gr.addColorStop(0, 'rgba(60,64,78,0)'); gr.addColorStop(0.5, 'rgba(60,64,78,0.35)'); gr.addColorStop(1, 'rgba(60,64,78,0)');
        g.fillStyle = gr; g.fillRect(x - 10, 0, 20, 512);
      }
      g.fillStyle = '#cfd2d6';
      const ancho = 0.15 / W * 512;
      for (let k = 1; k < N.C.carriles; k++) { // discontinuas: 4,5 m pintado de cada 12 m
        const x = px(-pista.mitad + k * N.C.anchoCarril);
        g.fillRect(x - ancho / 2, 0, ancho, 512 * 4.5 / 12);
      }
      g.fillStyle = '#e8c66a'; // borde izquierdo amarillo, derecho blanco
      g.fillRect(px(-pista.mitad) - ancho, 0, ancho * 1.6, 512);
      g.fillStyle = '#d8dade';
      g.fillRect(px(pista.mitad) - ancho * 0.6, 0, ancho * 1.6, 512);
      T.asfalto = tex(c, true);
    }
    // ---- halo redondo (luces) y haz (faros)
    {
      const [c, g] = lienzo(64, 64);
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.18, 'rgba(255,255,255,0.85)');
      gr.addColorStop(0.45, 'rgba(255,255,255,0.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      T.halo = tex(c);
    }
    {
      const [c, g] = lienzo(128, 256); // v=0 cerca del coche, v=1 lejos
      for (let y = 0; y < 256; y++) {
        const v = 1 - y / 256, abre = 0.25 + 0.75 * v;
        const a = Math.pow(1 - v, 1.4) * Math.min(1, v * 8) * 0.9;
        const gr = g.createLinearGradient(64 - 64 * abre, 0, 64 + 64 * abre, 0);
        gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.fillRect(0, y, 128, 1);
      }
      T.haz = tex(c);
    }
    // ---- fachadas: 16 columnas × 32 filas de ventanas, con el borde oscuro (los tejados usan la esquina)
    T.fachadas = [0, 1, 2].map((variante) => {
      const [c, g] = lienzo(256, 512);
      g.fillStyle = variante === 2 ? '#0d1017' : '#0a0b10'; g.fillRect(0, 0, 256, 512);
      const encendidas = [0.33, 0.5, 0.18][variante];
      const tonos = [['#ffd890', '#ffe7b8', '#ffc870'], ['#cfe6ff', '#e9f3ff', '#a9cfff'], ['#ffd890', '#9fd0ff', '#ffffff']][variante];
      for (let fy = 0; fy < 32; fy++) {
        const pisoEncendido = rnd() < 0.85;
        for (let fx = 0; fx < 16; fx++) {
          const x = fx * 16 + 3, y = fy * 16 + 4;
          if (pisoEncendido && rnd() < encendidas) {
            g.fillStyle = tonos[Math.floor(rnd() * tonos.length)];
            g.globalAlpha = 0.55 + rnd() * 0.45;
          } else { g.fillStyle = '#1a1e28'; g.globalAlpha = 1; }
          g.fillRect(x, y, variante === 1 ? 11 : 10, variante === 1 ? 9 : 8);
        }
      }
      g.globalAlpha = 1;
      g.fillStyle = '#07080b'; g.fillRect(0, 0, 3, 3);
      return tex(c, true);
    });
    // ---- túnel: azulejo claro con franja
    {
      const [c, g] = lienzo(128, 128);
      g.fillStyle = '#5b5f66'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = '#43464c'; g.lineWidth = 2;
      for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
      g.fillStyle = '#2c4f7a'; g.fillRect(0, 88, 128, 10);
      T.tunel = tex(c, true);
    }
    // ---- carteles verdes (fuente del propio juego)
    T.cartel = (lineas) => {
      const [c, g] = lienzo(512, 160);
      g.fillStyle = '#0d6b3a'; g.fillRect(0, 0, 512, 160);
      g.strokeStyle = '#e8f2ec'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 144);
      g.fillStyle = '#f2f7f4'; g.textBaseline = 'middle';
      g.font = '800 54px "Saira Extra Condensed", "Arial Narrow", sans-serif';
      g.fillText(lineas[0], 28, 56);
      g.font = '600 44px "Saira Extra Condensed", "Arial Narrow", sans-serif';
      g.fillText(lineas[1], 28, 116);
      return tex(c);
    };
    // ---- silueta de la ciudad para el horizonte
    {
      const [c, g] = lienzo(2048, 256);
      const gr = g.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, '#05060c'); gr.addColorStop(0.55, '#0d1022'); gr.addColorStop(0.85, '#2a1a2e'); gr.addColorStop(1, '#4a2a26');
      g.fillStyle = gr; g.fillRect(0, 0, 2048, 256);
      for (let capa = 0; capa < 2; capa++) {
        let x = 0;
        while (x < 2048) {
          const w = 14 + rnd() * 50, h = (capa ? 30 : 60) + rnd() * (capa ? 70 : 140);
          g.fillStyle = capa ? '#0b0c14' : '#07080e';
          g.fillRect(x, 256 - h, w, h);
          for (let k = 0; k < w * h / 60; k++) {
            g.fillStyle = rnd() < 0.7 ? 'rgba(255,214,150,0.8)' : 'rgba(170,210,255,0.8)';
            g.fillRect(x + rnd() * (w - 2), 256 - h + rnd() * h, 1.5, 1.5);
          }
          if (!capa && h > 150 && rnd() < 0.5) { g.fillStyle = '#ff2a2a'; g.fillRect(x + w / 2 - 1, 256 - h - 2, 3, 3); }
          x += w + rnd() * 6;
        }
      }
      T.horizonte = tex(c, true);
    }
    return T;
  };
})(window.N = window.N || {});
