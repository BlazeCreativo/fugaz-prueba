// Ajustes del prototipo «persecución y escape». Todo en metros, segundos y m/s.
// Mundo: x hacia la derecha de la avenida, s hacia delante (distancia recorrida).

export const C = {
  // Avenida de 4 carriles de 4 m; las aceras y los edificios empiezan a ±8 m.
  carril: 4,
  carriles: [-6, -2, 2, 6],
  mitadCalzada: 8,
  limiteX: 7.05,

  // Tiempos de la partida: tutorial (solo la primera vez) + persecución = 60-90 s.
  tutorial: 10,
  duracion: 75,
  cuenta: 1.0,      // cuenta atrás 3-2-1 (el coche ya rueda y se puede girar)
  muriendo: 0.6,    // cámara lenta del golpe antes de la pantalla final

  // Jugador: acelera solo; solo se gira.
  vTutorial: 24,
  vInicial: 30,
  vFinal: 48,
  aceleracion: 7,
  giroVel: 15,      // m/s laterales con el dedo a tope
  giroResp: 11,     // 1/s: lo que tarda en responder el giro
  hitbox: 0.82,     // el jugador choca con una caja un 18 % más pequeña: que rozar sea posible y justo
  rozaPared: 0.55,  // pérdida de velocidad por segundo contra la acera

  coche: { ancho: 1.9, largo: 4.4 },

  // Multiplicador por riesgo: pasar a menos de `roce` m de un coche o barrera sin tocarlo.
  roce: 1.0,
  multPaso: 0.5,
  multMax: 8,
  multCaida: 3,     // s sin rozar nada → baja un paso

  // Policía.
  golpesMuerte: 3,  // embestidas que aguantas antes de que te cacen
  golpeRecupera: 7, // s sin golpes para recuperar uno
  reaccionMin: 0.12,
  reaccionMax: 0.42,

  // Tráfico y obstáculos.
  vista: 260,       // hasta dónde se generan cosas por delante
  cruceCada: 420,
  barreraCada: 22,  // s entre barreras (después del tutorial)
  barreraHueco: 5.6,

  // Repetición para el clip vertical.
  clipSegundos: 8,
};

// Velocidad base del jugador según el tiempo de persecución (0..duración).
export function velocidadBase(tJuego) {
  const k = Math.max(0, Math.min(1, tJuego / C.duracion));
  return C.vInicial + (C.vFinal - C.vInicial) * k;
}

// Patrullas activas según el tiempo de persecución.
export function patrullasObjetivo(tJuego) {
  if (tJuego < 0) return 0;
  if (tJuego < 15) return 1;
  if (tJuego < 35) return 2;
  if (tJuego < 55) return 3;
  return 4;
}

// Coches de tráfico que hay a la vez por delante.
export function densidadTrafico(tJuego) {
  return Math.round(7 + Math.min(tJuego, 75) * 0.11);
}
