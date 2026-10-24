# FUGAZ (fugaz-prueba)

Videojuego 3D de coches que corre en el navegador del móvil y del PC. En el repositorio hay tres versiones:

- **`index.html` → FUGAZ v13 «Noche en autopista»** (la de ahora). Autopista elevada de noche, vista desde la cabina, a más de 250 km/h y metiéndote entre el tráfico. Puntúas pasando rozando los coches; el multiplicador sube con cada roce y se pierde si frenas o chocas. Partidas de 90 s, tres golpes y fuera. El código está en `noche/`.
- **`v12/index.html`**: el FUGAZ original (v12 «hora punta»), un único archivo con el código dentro.
- **`escape/`**: el prototipo **«persecución y escape»**: partidas de 75 s huyendo de la policía, con un pulgar o con las flechas.

Las tres usan three.js r128 y las fuentes de `vendor/`, así que funcionan sin internet. Guardan los datos solo en `localStorage` y no envían nada a ningún servidor. No hay anuncios, cuentas ni modelos de terceros (ver `CREDITOS.md`). v13 no tiene sonido; escape sintetiza el suyo en el navegador.

## Cómo se ejecuta

- **v13**: abre `index.html` con doble clic y pulsa JUGAR. No necesita servidor (son scripts normales, no módulos).
- **escape** necesita servirse por http (usa módulos ES):

```bash
python3 -m http.server 8000
```

- FUGAZ v13: `http://localhost:8000/`
- Prototipo de escape: `http://localhost:8000/escape/`
- FUGAZ v12: `http://localhost:8000/v12/`

### Probarlo en el móvil (red local, sin publicar nada)

1. En el ordenador: `python3 -m http.server 8000 --bind 0.0.0.0`.
2. Busca la IP del ordenador en la wifi (por ejemplo, `ip addr` o los ajustes de red; algo como `192.168.1.40`).
3. Con el móvil en la misma wifi, abre `http://192.168.1.40:8000/` (v13) o `http://192.168.1.40:8000/escape/`.

Límites de probarlo así:

- Por `http://` el móvil no ofrece el menú «Compartir» del sistema (solo funciona en https o en localhost). El botón compartir de escape descarga el clip y la métrica cuenta igual.
- En iPhone, la inclinación de v13 pide permiso y solo funciona por https.
- Las métricas y el récord se guardan por dirección: los de `192.168.1.40:8000` son distintos de los de `localhost:8000`.

## Cómo se juega a v13 «Noche en autopista»

- **PC (teclado):** ← → (o A D) esquivar · ↑ (W) turbo · ↓ (S o espacio) frenar · C cámara cabina/fuera · Intro empezar y «una más».
- **Mando:** stick izquierdo o cruceta para girar · RT turbo · LT o B frenar · A empezar · Y cámara.
- **Móvil** (se elige en el menú, «Control»):
  - **Pulgar** (por defecto): apoya el pulgar donde quieras y deslízalo a los lados. Abajo frena, arriba turbo.
  - **Dos zonas**: toca la mitad izquierda o derecha. Las dos a la vez frenan.
  - **Inclinar**: inclina el móvil; mantener el dedo frena.
  - El botón redondo de arriba a la derecha cambia la cámara.
- **Puntos:**
  - Cada roce (pasar a menos de 1,25 m de un coche sin tocarlo) suma puntos según lo cerca y lo rápido que vas, y sube el multiplicador ×0,5. «Al límite» (menos de 0,45 m) vale más y lo sube ×1. Máximo ×10.
  - Los metros también suman, multiplicados.
  - El combo se pierde si frenas, si rozas el muro, si chocas o si pasas 4,5 s sin rozar a nadie.
- **Choques:** cada golpe quita una vida (los tres cuadrados de arriba a la izquierda). Al tercero, SINIESTRO. Si aguantas los 90 s, FIN DEL TIEMPO. El récord se guarda en el navegador.
- **Calidad:** «Auto» empieza en baja (móvil) o media (PC) y cambia cada 2 s según los fps. «Alta» añade brillo (bloom) y desenfoque de velocidad. Con `?fps=1` en la dirección se ven los fps en pantalla.
- **Tráfico:** turismos, furgonetas y camiones a 85-125 km/h. Cambian de carril con el intermitente puesto 1 s antes. Nunca tapan los cuatro carriles a la vez.

## Cómo se juega al prototipo de escape

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

- `pruebas/noche.spec.js` comprueba v13:
  - partida completa en PC con teclado (girar, frenar, final, récord y «una más» en menos de 2 s) y otra sin trucos hasta el final;
  - roce que suma y sube el multiplicador, y frenar que pierde el combo;
  - tres choques que acaban en SINIESTRO;
  - mando simulado (Gamepad API), cambio de cámara y calidad alta con posproceso;
  - móvil (Pixel 5 emulado): pulgar, frenar deslizando abajo, «una más», dos zonas y botón de cámara;
  - datos corruptos y enlaces a v12 y escape.
- `pruebas/arranque.spec.js` comprueba que FUGAZ v12 arranca sin errores ni peticiones a internet.
- `pruebas/escape.spec.js` comprueba en el prototipo:
  - partida completa en PC con teclado y en un Pixel 5 emulado con el dedo;
  - muerte, queja de un toque y «una más» en menos de 2 s;
  - clip generado y entregado por el botón compartir;
  - exportación de métricas desde el panel oculto, vuelta al día siguiente y datos corruptos.

Herramientas (con el servidor en `127.0.0.1:8123` las que usan navegador):

- `node herramientas/noche-simular.mjs 30`: simula 30 partidas de v13 con el piloto automático prudente.
- `node herramientas/noche-medir.mjs`: fps de v13 por nivel de calidad en Chromium sin GPU.
- `node herramientas/noche-capturas.mjs`: capturas y clip de v13 para `ENCARGOS/informes/v13/`.
- `node herramientas/noche-ver.mjs <carpeta> pc|movil cabina|fuera <segundos>`: captura rápida para revisar a ojo.

- `node herramientas/simular.mjs 40`: simula 40 partidas sin pantalla con un piloto automático, para ajustar la dificultad.
- `node herramientas/medir.mjs`: coste de la lógica y fps en Chromium sin GPU.
- `node herramientas/capturas.mjs`: capturas para el informe.

## Estructura

- `index.html`: pantalla, HUD y estilos de v13.
- `noche/`: v13 en scripts clásicos (funcionan con doble clic):
  - `config.js`: todos los números de ajuste.
  - `pista.js`: la autopista (curvas, túneles, pórticos), sin fin.
  - `mundo.js`: la lógica pura (coche, tráfico, roces, combo, choques) y los pilotos automáticos. Se puede simular en node.
  - `texturas.js`: texturas dibujadas con canvas.
  - `escena.js`: el dibujo 3D por trozos, la cabina, la cámara y el posproceso.
  - `relojes.js`: cuentarrevoluciones y velocímetro.
  - `entrada.js`: teclado, mando, pulgar, dos zonas e inclinación.
  - `main.js`: menú, partida, final, calidad automática y ganchos para las pruebas.
- `v12/index.html`: FUGAZ v12 (archivo generado; su código fuente `src/` no está en el repositorio).

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
- `vendor/`: three.js y fuentes.
- `pruebas/`: Playwright.
- `herramientas/`: simulador, medición, capturas y vendorización.
- `ENCARGOS/`: encargos e informes (`ENCARGOS/informes/v13-noche.md`, `ENCARGOS/informes/prototipo-escape.md`).
- `CREDITOS.md`: recursos de terceros y su licencia.

## Qué falta

Ver `TODO.md`.

Estado: v13 funciona de principio a fin en Chromium de escritorio y en un móvil emulado, y todas las pruebas pasan (ver `ENCARGOS/informes/v13-noche.md`). Los fps solo se han medido con GPU por software, no en un PC ni en un móvil reales. No hay nada publicado.
