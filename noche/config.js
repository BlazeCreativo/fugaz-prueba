// FUGAZ v13 «Noche en autopista»: todos los números de ajuste en un sitio.
// Unidades: metros, segundos y m/s (las velocidades en km/h llevan «Kmh» en el nombre).
(function (N) {
  N.C = {
    duracion: 90,            // s de partida
    vidas: 3,                // choques que aguantas
    invulTrasChoque: 1.6,    // s de respiro tras un golpe

    // Autopista
    carriles: 4,
    anchoCarril: 3.6,
    arcen: 0.7,              // de la última raya al muro
    paso: 2,                 // m entre muestras de la curva

    // Coche del jugador
    largo: 4.4, ancho: 1.85,
    velIniKmh: 150, velMaxKmh: 255, // la velocidad de crucero sube de una a otra en rampaCrucero s
    rampaCrucero: 55,
    turboKmh: 45,            // gas a fondo suma esto
    velMinKmh: 60,
    acel: 7, frenada: 20,    // m/s²
    lateralMax: 10,          // m/s de desplazamiento lateral con giro a tope
    respuestaLateral: 9,     // 1/s
    empujeCurva: 0.035,      // fracción de v²·curvatura que te saca hacia fuera
    roceMuro: 22,            // m/s² que pierdes rozando el muro

    // Tráfico
    trafVelKmh: [85, 125],
    densidad: [11, 22],      // coches por cada 400 m, al principio y al final
    apareceDelante: [260, 420],
    cambioCarril: [5, 13],   // s entre intentos de cambiar de carril
    intermitente: 1.1,       // s de aviso antes de cambiar
    duracionCambio: 1.7,

    // Puntos
    roceHueco: 1.25,         // m de hueco máximo para contar un roce
    alLimite: 0.45,          // m de hueco para «al límite»
    puntosRoce: 250,
    subeMult: 0.5, multMax: 10,
    comboVida: 4.5,          // s sin roces y se pierde el combo
    puntosMetro: 0.4,
    frenoPierdeCombo: 0.18,  // s frenando y se pierde el combo
  };
  N.kmh = (v) => v * 3.6;
  N.ms = (k) => k / 3.6;
})(typeof window !== 'undefined' ? (window.N = window.N || {}) : (globalThis.N = globalThis.N || {}));
