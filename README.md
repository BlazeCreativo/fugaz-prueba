# FUGAZ (fugaz-prueba)

Videojuego 3D de persecución policial que corre en el navegador del móvil y del PC. En el repositorio hay dos cosas:

- **`index.html`**: el juego FUGAZ original (v12), un único archivo con el código dentro.
- **`escape/`**: el prototipo **«persecución y escape»** (encargo de la tarea 140, concepto C). Son partidas de 60 a 90 s: huyes de la policía por una avenida de FUGAZ a más de 100 km/h y solo tienes que girar, con un pulgar o con las flechas. Puntúas más si pasas rozando sin chocar. Al terminar, la partida genera un clip vertical para compartir.

Las dos versiones usan three.js r128 y las fuentes de `vendor/`, así que funcionan sin internet. Guardan los datos solo en `localStorage` y no envían nada a ningún servidor. No hay anuncios, cuentas, música ni modelos de terceros: el sonido se sintetiza en el navegador y los gráficos se hacen con cajas.

## Cómo se ejecuta

Necesitas Python 3 (y Node.js solo para las pruebas).

```bash
python3 -m http.server 8000
```

- Prototipo de escape: `http://localhost:8000/escape/`
- FUGAZ original: `http://localhost:8000/index.html`

Hace falta servirlo por http, porque el prototipo usa módulos ES y abriendo el archivo con doble clic no carga.

### Probarlo en el móvil (red local, sin publicar nada)

1. En el ordenador: `python3 -m http.server 8000 --bind 0.0.0.0`.
2. Busca la IP del ordenador en la wifi (por ejemplo, `ip addr` o los ajustes de red; algo como `192.168.1.40`).
3. Con el móvil en la misma wifi, abre `http://192.168.1.40:8000/escape/`.

Límites de probarlo así:

- Por `http://` el móvil no ofrece el menú «Compartir» del sistema (solo funciona en https o en localhost). El botón compartir descarga el clip y la métrica cuenta igual.
- Para probar el menú de verdad hace falta un enlace https de prueba. Eso lo decide el despacho (ver TODO.md).
- Las métricas se guardan por dirección: las de `192.168.1.40:8000` son distintas de las de `localhost:8000`.

## Cómo se juega

- **Móvil:** apoya el pulgar donde quieras y deslízalo a izquierda o derecha. El giro depende de cuánto lo deslizas, como un volante invisible.
- **PC:** ← → o A D. Espacio o Intro para empezar y para «una más».
- **Qué te mata:**
  - Chocar con un coche del tráfico, con uno que cruza (los cruces tienen semáforos ámbar parpadeando) o con una barrera fuera de su hueco verde.
  - Tres embestidas de la policía (los tres escudos de arriba a la izquierda). Una patrulla avisa con un triángulo rojo 0,45 s antes de embestir. Si la embistes tú primero, la apartas; si la estampas contra la acera o el tráfico, queda fuera.
- **Puntos:**
  - Cada metro recorrido suma, multiplicado por el multiplicador.
  - Cada roce (pasar a menos de 1 m sin tocar) sube el multiplicador ×0,5, hasta ×8.
  - Cada patrulla que hagas chocar suma 400 puntos y sube el multiplicador ×1.
  - El multiplicador baja si pasas 3 s sin arriesgar.
  - A los 75 s llegas al túnel y escapas, con un 25 % de bonificación.
- **Primera partida:** empieza con 10 s de tutorial sin texto:
  - una mano que desliza (o las teclas ← → en el PC);
  - dos coches en tu carril que te obligan a girar;
  - una barrera con el hueco marcado.
  - Después llegan las sirenas.
- **Métricas:** 5 toques seguidos en el logo FUGAZ (o Mayús+M, o `#metricas` en la dirección) abren un panel oculto. Desde ahí se exportan las métricas en JSON. Solo se abre en el inicio o en la pantalla final.

## Métricas de validación (se guardan solo en `localStorage`)

| Métrica | Cómo se mide |
|---|---|
| Partida completada sin explicación | La primera partida llega al final (escape o muerte) sin abandonar y pasando los 10 s del tutorial. |
| Partidas por sesión | Una sesión termina tras 30 min sin jugar. Se guarda la lista y la media. |
| Tiempo hasta «una más» | Milisegundos desde la pantalla final hasta el inicio de la siguiente partida (mediana, y cuántas en menos de 5 s). |
| Clips compartidos | Veces que se pulsa el botón compartir y resultado: compartido, cancelado o descargado. |
| Vuelta al día siguiente | Días jugados (fecha local). Indica si se jugó el día después del primero. |
| «No entiendo qué me mata» | Botón «?» de un toque tras morir. Se guarda la causa real (tráfico, cruce, barrera, embestidas). |

Cada partida guarda también la duración, los puntos, los roces, las patrullas fuera, el multiplicador máximo y los **fps medios**: el dato de rendimiento en móviles reales sale de aquí. El JSON exportado incluye el resumen y los datos en bruto.

## Pruebas automáticas

```bash
npm install
npx playwright install chromium  # una vez
npx playwright test               # o: npm test
```

- `pruebas/arranque.spec.js` comprueba que FUGAZ original arranca sin errores ni peticiones a internet.
- `pruebas/escape.spec.js` comprueba en el prototipo:
  - partida completa en PC con teclado y en un Pixel 5 emulado con el dedo;
  - muerte, queja de un toque y «una más» en menos de 2 s;
  - clip generado y entregado por el botón compartir;
  - exportación de métricas desde el panel oculto, vuelta al día siguiente y datos corruptos.

Herramientas (con el servidor en `127.0.0.1:8123` las que usan navegador):

- `node herramientas/simular.mjs 40`: simula 40 partidas sin pantalla con un piloto automático, para ajustar la dificultad.
- `node herramientas/medir.mjs`: coste de la lógica y fps en Chromium sin GPU.
- `node herramientas/capturas.mjs`: capturas para el informe.

## Estructura

- `escape/index.html`: pantalla, HUD y estilos del prototipo.
- `escape/js/`:
  - `config.js`: todos los números de ajuste.
  - `mundo.js`: la lógica pura (sin three.js ni DOM).
  - `escena.js`: el dibujo 3D.
  - `entrada.js`: pulgar y teclado.
  - `metricas.js`.
  - `clip.js`: repetición, vídeo e imagen-resumen.
  - `audio.js`.
  - `main.js`: el bucle.
- `index.html`: FUGAZ original (archivo generado; su código fuente `src/` no está en el repositorio).
- `vendor/`: three.js y fuentes.
- `pruebas/`: Playwright.
- `herramientas/`: simulador, medición, capturas y vendorización.
- `ENCARGOS/`: encargos e informes (`ENCARGOS/informes/prototipo-escape.md`).

## Qué falta

Ver `TODO.md`.

Estado: el prototipo de escape funciona de principio a fin en Chromium de escritorio y en un móvil emulado, y las 9 pruebas pasan. No se ha probado en un móvil real y los 60 fps en un móvil medio no se han medido. No hay nada publicado.
