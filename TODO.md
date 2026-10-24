# Pendiente

## v13 «Noche en autopista» (`index.html` + `noche/`)

- **Medir en aparatos reales** (solo Alberto): un PC normal y un móvil de gama media. Abrir con `?fps=1` y apuntar los fps y el nivel de calidad que elige «Auto». Aquí solo se ha medido con GPU por software (ver el informe).
- **Dificultad con personas**: el piloto automático prudente llega al final casi siempre (frena mucho y puntúa poco); el que busca roces hace unos 6 roces y 1,7 golpes por partida. Ajustar en `noche/config.js`: densidad, velocidad del tráfico, hueco de roce (1,25 m) y vida del combo (4,5 s).
- **iPhone/Safari**: la inclinación pide permiso y solo va por https; no probado en un iPhone real.
- **Mando**: probado con un mando simulado en las pruebas; falta uno de verdad (Xbox/PlayStation por USB o Bluetooth).
- **Aspecto**: los coches son cajas con sombreado fijo. Siguientes mejoras baratas: faros del tráfico que iluminan el asfalto delante, retrovisor que refleje, lluvia ligera.
- **Sonido**: no hay (decisión de Alberto: «lo del audio, déjalo tranquilo de momento»).
- **Publicar**: no se ha tocado GitHub Pages ni `main`. Si se publica, `main` pasa a abrir v13 en la raíz y v12 queda en `v12/`.

## Prototipo «persecución y escape» (`escape/`)

- **Probar en 2 o 3 móviles reales** (Android medio y un iPhone) y apuntar:
  - si se entiende sin explicación;
  - los fps. Salen en el JSON de métricas (`fpsMedio` por partida) y en pantalla con `?fps=1`.
  - Solo lo puede hacer Alberto. En Chromium sin GPU da 39 fps en un Pixel 5 emulado, pero ese dato no vale para un móvil real.
- **Enlace de prueba https**: lo decide el despacho. Hace falta para el menú «Compartir» del sistema, porque por http en la red local el clip se descarga. No se ha publicado nada.
- **iPhone/Safari**:
  - el clip intenta grabar en mp4 y, si no puede, queda la imagen-resumen PNG; no comprobado en un iPhone real;
  - comprobar también que `navigator.vibrate` no hace falta (en iOS no existe y se ignora).
- **Dificultad**: el piloto automático (`herramientas/simular.mjs`) aguanta unos 26 s de media y casi siempre muere por tráfico. Hay que ajustar `escape/js/config.js` con partidas de personas:
  - densidad de tráfico;
  - cadencia de barreras;
  - patrullas por tiempo.
- **Legibilidad**: el anillo rojo de la repetición señala lo que te ha matado. Faltan:
  - un aviso previo de los coches que cruzan, más claro que el semáforo ámbar;
  - intermitentes si el tráfico llega a cambiar de carril (ahora no cambia).
- **Ritmo de «una más»**: 0,6 s de cámara lenta, la pantalla final y 1 s de cuenta atrás. En las pruebas el reinicio tarda menos de 2 s desde el toque. Comprobar con personas si la cuenta atrás sobra.
- **Clip**: dura los últimos 8 s, con cámara lenta en el último segundo y una tarjeta final. No lleva sonido. Falta decidir:
  - si se añade un enlace o un código QR, cuando haya un enlace aprobado por el despacho;
  - el formato definitivo para TikTok o Reels (ahora 405×720 en webm o mp4).
- **Métricas**: se guardan solo en este navegador. Para juntar las de varias personas hay que exportar a mano cada JSON y combinarlo; no hay ningún servidor, y así lo pide el encargo.
- El contexto de la tarea 140 está fuera de la carpeta del proyecto. Las normas del taller no permiten salir de ella, así que no se ha leído. Las métricas se han sacado de la lista del encargo. Revisar que coinciden con las definiciones exactas de la tarea 140.

## FUGAZ v12 (`v12/index.html`)

- Recuperar la carpeta `src/` (el código fuente original; `index.html` es un archivo generado). No está en este repositorio.
  - Los módulos se ven marcados dentro de `index.html` (`// ---- src/...`), así que se podría escribir un separador automático.
  - Para el prototipo de escape no ha hecho falta: es un conjunto de módulos aparte.
- Decidir si es afición o producto (ver AUDITORIA.md); si es producto: modelo de ingresos, mínimo legal, analítica.
- Las pruebas solo comprueban el arranque; faltan pruebas de partida (controles, colisiones, taller).
- Varios `innerHTML` en index.html usan texto propio, no entrada del usuario; revisar si algún día se muestra texto externo.
- Hay un script auxiliar `/tmp/vendorizar.py` que se creó por error fuera de la carpeta (sesión 1); no hace falta y conviene borrarlo (sin permiso de `rm`).
- Comprobar si el repo remoto es una cuenta distinta a la de la empresa (BlazeCreativo).
