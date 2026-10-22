// Números aleatorios con semilla (mulberry32), el mismo generador que usa FUGAZ (src/logica/azar.js).

export function crearAzar(semilla) {
  let a = (semilla >>> 0) || 1;
  function num() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    num,
    rango: (min, max) => min + (max - min) * num(),
    entero: (min, max) => Math.floor(min + (max - min + 1) * num()),
    elegir: (lista) => lista[Math.floor(num() * lista.length)],
    probabilidad: (p) => num() < p,
  };
}

export function semillaNueva() {
  return ((Math.random() * 4294967296) >>> 0) || 1;
}

// Hash entero → [0, 1) para decorado estable (edificios) sin guardar nada.
export function hash01(n) {
  let h = Math.imul((n | 0) ^ 0x9E3779B9, 0x85EBCA6B);
  h = Math.imul(h ^ (h >>> 13), 0xC2B2AE35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
