# Créditos y licencias

Todo lo que se ve en FUGAZ v13 «Noche en autopista» está hecho con código del propio juego, salvo lo que sale en esta tabla. No hay modelos, texturas, sonidos, logotipos ni marcas de Assetto Corsa ni de ningún fabricante de coches. Lo mismo vale para el resto del juego (`v12/`): todos los coches del garaje llevan nombres inventados (Halcón, Zorro, Pantera, Tiburón…), sin marcas ni modelos reales, y los carteles y rótulos son inventados.

## Recursos de terceros que van dentro del juego

| Recurso | Dónde está | Licencia | ¿Uso comercial? |
|---|---|---|---|
| three.js r128 (© 2010-2021 Three.js Authors) | `vendor/three.min.js` | MIT (`vendor/licencias/MIT-three.txt`) | Sí, conservando el aviso de copyright |
| Fuente Overpass (© 2021 The Overpass Project Authors) | `vendor/fuentes/overpass-*.woff2` | SIL Open Font License 1.1 (`vendor/licencias/OFL-overpass.txt`) | Sí; no se puede vender la fuente sola |
| Fuente Overpass Mono (© 2021 The Overpass Project Authors) | `vendor/fuentes/overpass-mono-*.woff2` | SIL OFL 1.1 (`vendor/licencias/OFL-overpass-mono.txt`) | Sí; ídem |
| Fuente Saira Extra Condensed (© 2016 The Saira Project Authors) | `vendor/fuentes/saira-extra-condensed-*.woff2` | SIL OFL 1.1 (`vendor/licencias/OFL-saira-extra-condensed.txt`) | Sí; ídem |

Las fuentes se copiaron de los paquetes `@fontsource/*` de npm (`herramientas/vendorizar.py`).

## Hecho a mano en el código (propio)

- **Autopista, túneles, pórticos, farolas, edificios, coches y cabina**: cajas y planos generados en `noche/escena.js`.
- **Texturas**: se dibujan con canvas al arrancar (`noche/texturas.js`): asfalto con rayas, ventanas, azulejo del túnel, carteles verdes, silueta de la ciudad y halos de luz.
- **Carteles**: los textos son inventados («RONDA DEL FARO», «SALIDA 14 · PUERTO»…). No copian la señalización real de ninguna ciudad.
- **Relojes del salpicadero**: dibujados con canvas (`noche/relojes.js`).
- **Brillo y desenfoque de velocidad**: shaders propios (`noche/escena.js`, calidad alta).
- **Sonido**: v13 no tiene sonido.

## Solo para desarrollo (no van en el juego)

- Playwright (Apache-2.0): pruebas automáticas.
- ffmpeg (LGPL/GPL, instalado en el servidor): solo para montar el clip del informe a partir de capturas. No se distribuye.
