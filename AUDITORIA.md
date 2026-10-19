# Auditoría de fugaz-prueba

## Resumen (5 líneas)
1. **Qué es:** un videojuego de persecución policial en 3D, llamado FUGAZ, que corre en el navegador del móvil. Ahora va por la versión v12. No tiene nada que ver con persianas ni con Accesos Nordeste.
2. **Estado:** es un prototipo avanzado. Es un único archivo `index.html` de unos 650 KB, con el código del juego dentro. Parece publicado en GitHub Pages (hay un archivo `.nojekyll`), pero no he podido comprobarlo.
3. **Para el negocio:** no aporta nada a las webs de SEO local ni a las urgencias 24 h. Cada hora que se le dedique es una hora que no va a captar clientes.
4. **Recomendación:** no invertir más dinero ni tiempo del negocio. Si es una afición tuya, déjalo como proyecto aparte. Si lo quieres lanzar como producto, antes hay que decidir un modelo de negocio, y hoy no lo hay.
5. **Falta** lo que se detalla al final: objetivo declarado, visitas reales, y quién lo mantiene.

## Detalle

### Qué hay en la carpeta
- Solo hay `index.html`, `.nojekyll` y el historial de git. No hay README, documentación, pruebas ni notas de diseño.
- El repositorio se clonó desde `github.com/BlazeCreativo/fugaz-prueba` (`.git/config`). Es una cuenta distinta a la de la empresa.
- Solo hay un clon y un commit local en el registro. El historial de commits sí muestra las versiones: v6, v7, v10, v11 y v12.

### Qué hace el juego
- La descripción interna dice: *«prototipo de la fase 0: pierde a la policía rompiendo su línea de visión»* (línea 9).
- Es un mapa de una autopista en anillo de 2.051 m alrededor de un barrio de 460 × 460 m (línea 626).
- Las versiones añaden esto, según los comentarios del código y los commits:
  - Un taller de mejoras (frenos, dirección, nitro y blindaje).
  - Un modo REALISTA con vuelcos y vuelos.
  - Choques en cadena y explosiones.
  - Hora punta, con muros de tráfico.
  - Cabina con espejo retrovisor y pantalla.
- Hay peticiones de usuario citadas en el código, por ejemplo la de Alberto del 26/09 sobre las aceras. Esto apunta a que el desarrollo está guiado por pruebas tuyas desde el móvil.
- Funciona bien en táctil: tiene controles táctiles, zonas seguras para el móvil y respeta la preferencia de menos movimiento.
- Guarda datos con `localStorage` y no envía nada a servidores.

### Calidad y riesgos
- **Visibilidad:** lleva `noindex, nofollow`, así que Google no lo indexa. Es coherente con ser una prueba privada.
- **Dependencias externas:** carga three.js r128 desde cdnjs y fuentes de Google Fonts. Si esos servicios fallan o cambian, el juego deja de arrancar. Se arregla incluyendo esos archivos en el propio repositorio.
- **Mantenimiento:** el código ocupa 6.000+ líneas en un solo archivo generado. Parece que se compila desde una carpeta `src/` que no está en este repositorio (se ve `// ---- src/logica/azar.js`). Sin ese código fuente, cada cambio obliga a editar a mano un archivo enorme.
- **Rendimiento:** no he medido nada. Un juego 3D con física detallada puede ir lento en móviles baratos. Esa prueba solo puedes hacerla tú, en tu móvil.
- **Legal:** no he revisado cumplimiento. Si se publica de forma abierta, conviene mirar tres cosas:
  - Las normas de menores.
  - Los avisos de privacidad (hoy no guarda nada fuera del móvil).
  - Que el contenido no promueva conducta ilegal real.
  Esto último es un tema de imagen, no una prohibición.

### ¿Merece continuar?
- **Para Accesos Nordeste: no.** No genera llamadas, ni presupuestos, ni posicionamiento local.
- **Como proyecto personal: sí, si te divierte.** El prototipo es sólido y sigue avanzando.
- **Como producto comercial: todavía no hay base para decidirlo.** No hay datos de jugadores, ni plan de ingresos, ni público definido.

### Qué haría falta si decides seguir
1. Decidir si es afición o producto. Es una decisión solo tuya.
2. Rescatar el código fuente (`src/`) y guardarlo en el repositorio.
3. Quitar la dependencia de CDN, incluyendo three.js y las fuentes en el repositorio.
4. Medir el rendimiento en 2 o 3 móviles reales.
5. Si es producto, añadir:
   - Un modelo de ingresos.
   - Un mínimo legal.
   - Analítica de uso.

## Material que faltaría
- Dónde está publicado, para ver si es accesible y quién lo visita. No pude consultar internet.
- La carpeta `src/` con el código fuente original.
- El objetivo que quieres darle: afición, producto o escaparate.
- Quién lo desarrolla (la cuenta BlazeCreativo) y si cuesta dinero o tiempo de la empresa.
- Los registros de ESTADO.md, DECISIONES.md y la «decisión 69» que cita el código. No están en esta carpeta.
- Resultados de pruebas en móviles reales.
