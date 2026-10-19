# FUGAZ (fugaz-prueba)

Videojuego 3D de persecución policial que corre en el navegador (pensado para el móvil). Es un único `index.html` con el código dentro; three.js r128 y las fuentes van en `vendor/`, así que funciona sin internet. Guarda ajustes y récords solo en `localStorage`; no envía nada a ningún servidor.

## Instalación y uso

Necesitas Node.js y Python 3.

```bash
npm install                      # solo hace falta para las pruebas
python3 -m http.server 8000      # sirve la carpeta
```

Abre `http://localhost:8000/index.html` en el navegador (o la IP del ordenador desde el móvil, en la misma wifi).

## Pruebas automáticas

```bash
npx playwright install chromium  # una vez
npx playwright test
```

Comprueban que el juego arranca sin errores de JavaScript, que no pide nada a internet y que datos corruptos en `localStorage` no lo rompen.

## Estructura

- `index.html`: el juego (archivo generado, ver TODO.md).
- `vendor/`: three.js y fuentes. `herramientas/vendorizar.py` las regenera desde `node_modules`.
- `pruebas/`: pruebas Playwright.
- `AUDITORIA.md`: auditoría del 19-oct-2026.

## Qué falta

Ver `TODO.md`.

Estado: funciona en Chromium de escritorio (arranca sin errores y sin dependencias externas); no se ha probado en móviles reales ni medido el rendimiento.
