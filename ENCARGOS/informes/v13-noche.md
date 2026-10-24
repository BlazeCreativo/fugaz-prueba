# FUGAZ v13 «Noche en autopista» · informe (24-oct-2026)

Rama `v13-noche`, sacada de `main` con el prototipo de escape fusionado. `main` y GitHub Pages no se han tocado.

## Qué se ha hecho

- **Modo nuevo «Noche en autopista»** (`index.html` + `noche/`):
  - Autopista elevada de 4 carriles, sin fin, con curvas suaves, subidas y bajadas, túneles cortos de 140-260 m cada ~1 km y pórticos con carteles verdes (textos inventados).
  - Farolas naranjas con charco de luz y reflejo largo en el asfalto, muretes con captafaros, calzada contraria con faros que vienen de frente, edificios con ventanas encendidas y neones, luces de la ciudad abajo y silueta de la ciudad en el horizonte.
  - Tráfico denso (turismos, furgonetas y camiones) con pilotos rojos, luz de freno, reflejo rojo en el suelo e intermitente 1 s antes de cambiar de carril.
- **Sensación de velocidad:**
  - El campo de visión se abre con la velocidad.
  - Rayas de luz que pasan a los lados (más en los túneles).
  - Temblor de cámara que crece con la velocidad, golpe de cámara al chocar y chispas al rozar el muro.
  - Halos en todas las luces en todos los niveles. En calidad alta, además, brillo real (bloom) y desenfoque radial de velocidad, con shaders propios.
  - Cabina por defecto: salpicadero, volante que gira, montantes, retrovisor, y cuentarrevoluciones y velocímetro con marcha. Los relojes se dibujan aparte, sin desenfoque, para que se lean.
  - Cámara exterior con C, la Y del mando o el botón redondo; en esa vista los relojes salen abajo.
- **Juego:**
  - Roce (pasar a menos de 1,25 m sin tocar) con puntos según cercanía y velocidad. «Al límite» (menos de 0,45 m) vale más.
  - Multiplicador hasta ×10, con barra de combo. Se pierde al frenar, rozar el muro, chocar o pasar 4,5 s sin roces.
  - 3 vidas, 1,6 s de respiro tras cada golpe. Partida de 90 s.
  - Récord local; «una más» con Intro, A, espacio o el botón (menos de 2 s, medido en las pruebas).
  - Guía sin texto largo solo la primera vez.
- **Controles:**
  - PC con teclado y mando (Gamepad API).
  - Móvil con tres modos: pulgar (por defecto: deslizar a los lados, abajo frena, arriba turbo), dos zonas e inclinación (pide permiso en iPhone al pulsar JUGAR; si no lo da, pasa a pulgar).
  - Menú corto en castellano.
- **Rendimiento:**
  - Casi todo es MeshBasicMaterial sin luces reales; los brillos son planos y puntos aditivos.
  - La autopista se construye por trozos de 96 m (como mucho 2 por fotograma) y se libera detrás.
  - 40-85 llamadas de dibujo por fotograma.
  - Calidad Auto/Baja/Media/Alta. Auto empieza en baja en el móvil y en media en el PC; cada 2 s baja de nivel si van flojos los fps y sube si sobran (en el móvil, como mucho a media).
- **Sin audio nuevo.** v13 no tiene sonido. El audio de escape no se ha tocado.
- **Versiones anteriores accesibles:** v12 está en `v12/index.html` (solo cambian las rutas a `../vendor/`) y escape sigue en `escape/`. Hay enlaces a las dos en el menú.
- **Arreglo en escape:** la cuenta atrás ahora usa el reloj real. Con GPU lenta se quedaba en «cuenta» y 4 de sus 7 pruebas fallaban ya en su rama original en este servidor.
- **Revisión de código** (agente revisor) antes de cerrar. Se corrigió:
  - Los coches de atrás te embestían si frenabas: ahora frenan ante ti.
  - «Una más» y «Menú» se podían pulsar sin querer al aparecer la pantalla final.
  - La inclinación en iPhone.
  - Coches chocados parados que formaban colas.
  - Salto del volante al cambiar de dedo.
  - Pausa (vuelta a la cuenta atrás) al cambiar de pestaña.
  - Relojes a 30 Hz.
  - Carteles pintados antes de cargar la fuente.

## Cómo jugar

- Abre `index.html` con doble clic (funciona sin servidor) y pulsa JUGAR.
- O con servidor: `python3 -m http.server 8000` y luego `http://localhost:8000/`.
- **PC:** ← → esquivar · ↑ turbo · ↓ frenar · C cámara · Intro empezar / una más.
- **Mando:** stick o cruceta · RT turbo · LT/B freno · A empezar · Y cámara.
- **Móvil:** desliza el pulgar a los lados; abajo frena, arriba turbo. Otros modos en «Control».
- **El truco:** pasa pegado a los coches sin tocarlos y no frenes. Con `?fps=1` en la dirección se ven los fps.

## Pruebas

`npx playwright test`: **20 de 20 pasan** (10 de v13, 1 de v13 abriendo con `file://`, 7 de escape y 2 de v12).

- **v13 en PC:** partida completa con teclado (girar, frenar, final, récord, «una más» en menos de 2 s, la guía solo sale la primera vez).
- **v13 sin trucos:** partida hasta el final.
- **Puntos:** roce que suma y sube el multiplicador, roce lejano que no cuenta, freno que pierde el combo.
- **Choques:** tres choques acaban en SINIESTRO.
- **Mando y calidad:** mando simulado (A, stick, Y), cambio de cámara y calidad alta con posproceso.
- **Robustez:** datos corruptos en `localStorage` y enlaces a v12 y escape.
- **v13 en móvil** (Pixel 5 emulado): a un pulgar (girar, frenar, partida completa, «una más» en menos de 2 s), dos zonas y botón de cámara.

## FPS medidos (y qué valen)

Medido con `node herramientas/noche-medir.mjs` en este servidor: **Chromium sin GPU** (swiftshader dibuja con la CPU) en una máquina de 2 núcleos compartida con otras sesiones (carga ~3).

**No he podido medir en un PC ni en un móvil de verdad.** Estas cifras sirven para comparar niveles entre sí; en una GPU real serán mucho más altas.

| Dispositivo (emulado) | Baja | Media | Alta |
|---|---|---|---|
| PC 1280×720 | 10,5 fps | 6,3 fps | 4,8 fps |
| PC 960×540 | 17,8 fps | 10,3 fps | — |
| Pixel 5 emulado (393×851 a 2,75×) | 49,2 fps | 33,6 fps | — |

- Coste por fotograma: 40-85 llamadas de dibujo y 8.000-14.000 triángulos. Es muy poco para cualquier GPU de los últimos años.
- La lógica cuesta unos 5-9 µs por paso, medido en node.
- En el PC, con swiftshader, el límite es rellenar píxeles con la CPU. Una gráfica integrada normal debería ir sobrada a 60 fps en media y alta, pero **no está medido**.
- Que el Pixel 5 emulado dé 49 fps en baja incluso dibujando con la CPU es buena señal para el objetivo de 40 en un móvil medio. Hay que confirmarlo en un móvil de verdad con `?fps=1`.

## Capturas y clip (`ENCARGOS/informes/v13/`)

- `1-menu.png`: menú (PC).
- `2-cabina-roce.png`: cabina a 236 km/h, ×2, con una furgoneta a punto de pasar al lado (calidad alta, con desenfoque de velocidad).
- `3-tunel.png`: dentro de un túnel.
- `4-movil-fuera.png`: móvil en vertical, cámara exterior, «¡AL LÍMITE! +1270».
- `5-final.png`: pantalla final con «NUEVO RÉCORD» (el récord anterior es de prueba).
- `clip.mp4`: 10 s a 30 fps, 960×540. Cabina pasando al límite entre coches colocados a los dos lados (10 roces); los últimos 4 s, desde fuera. Se graba fotograma a fotograma, así que sale fluido aunque el servidor sea lento. Los coches del clip se colocan por código (modo prueba).

## Lo que falta

Está también en `TODO.md`.

1. **Probar en aparatos reales:** fps en un PC normal y en un móvil medio, el mando de verdad y la inclinación en iPhone (necesita https). Solo lo puede hacer Alberto.
2. **Dificultad con personas:**
   - El piloto prudente llega al final casi siempre, pero puntúa poco.
   - El que busca roces hace unos 6 roces por partida.
   - Los números están en `noche/config.js`.
3. **Aspecto:**
   - Los coches son cajas con sombreado fijo.
   - Mejoras baratas pendientes: faros del tráfico iluminando el asfalto, retrovisor que refleje y lluvia ligera.
4. **Sonido:** no hay, por decisión de Alberto.
5. **Publicar:** no se ha tocado GitHub Pages. Si se fusiona en `main`, la raíz abre v13 y v12 queda en `v12/`. Hay que avisar si alguien tenía guardado el enlace antiguo a v12.

## Recursos y licencias

Todo es propio (geometría, texturas de canvas, carteles, relojes y shaders), salvo esto (detalle en `CREDITOS.md` y textos de licencia en `vendor/licencias/`):

| Recurso | Licencia | Uso comercial |
|---|---|---|
| three.js r128 | MIT | Sí |
| Fuentes Overpass y Overpass Mono | SIL OFL 1.1 | Sí (no vender la fuente sola) |
| Fuente Saira Extra Condensed | SIL OFL 1.1 | Sí (ídem) |

Nada de Assetto Corsa ni de fabricantes reales: ni modelos, ni texturas, ni marcas, ni nombres.
