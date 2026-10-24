# Kit de agentes para repos de juego (24-oct-2026)

5 agentes en castellano, texto propio, solo instrucciones (sin hooks, sin scripts, sin MCP que se instale). Informe: handoff/herramientas/juegos-estudio-2026-10-24.md.

| Agente | Para qué |
|---|---|
| disenador-juego | diversión, ritmo, "una más", curva de dificultad |
| probador-qa | jugar con Playwright, capturas, consola, fallos reproducibles |
| rendimiento-movil | fps, llamadas de dibujo, memoria, carga (Three.js r128 y Electron) |
| preparador-steam | página, cápsulas, demo, Next Fest, empaquetado, encuesta de IA de Steam |
| guardian-licencias-assets | licencia comercial de cada asset y declaración de IA |

Uso: copiar `.claude/agents/*.md` al `.claude/agents/` del repo del juego en un commit propio. NO copiar mientras una sesión de nube trabaje en ese repo (FUGAZ rama v13-noche, RICOCHET rama claude/ricochet-prototype): entregarlo como encargo (ENCARGOS/) o por la API de GitHub al acabar. Tras copiar, comprobar con `/agents` en el repo destino los nombres de las herramientas de Playwright (cambian si Playwright va como plugin: mcp__plugin_playwright_...). Revisor antes de copiar: los `tools` de probador-qa y rendimiento-movil nombran herramientas MCP de Playwright; si el repo no las tiene, Claude Code las ignora.
