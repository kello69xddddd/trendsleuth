# TrendSleuth (español)

> English: [README.md](README.md)

**¿Está cambiando de verdad? Los datos de la Tierra son difíciles de leer. TrendSleuth te dice cuándo un cambio es real.**

NASA Space Apps Challenge 2026 · *Be An Earth System Trend Detective!* · Sangolquí (ESPE), Ecuador
Equipo: Narek Vásconez, Alejandro Benítez, Jorge Chapi, Andrés Albán, Alexander Escobar

| | Enlace |
|---|---|
| App en línea | https://kello69xddddd.github.io/trendsleuth/ |
| Repositorio | https://github.com/kello69xddddd/trendsleuth |
| Ficha del proyecto | [docs/PROJECT_PAGE_ES.md](docs/PROJECT_PAGE_ES.md) · [English](docs/PROJECT_PAGE.md) |
| Datos y referencias | [docs/DATA_AND_REFERENCES.md](docs/DATA_AND_REFERENCES.md) |
| Declaración de IA | [docs/AI_AND_PRIOR_WORK.md](docs/AI_AND_PRIOR_WORK.md) |
| Licencia | [MIT](LICENSE) |

## Qué hace

1. **Eliges una variable** y el globo se pinta: verde donde una subida está confirmada, rojo donde una bajada está confirmada.
2. **Eliges un lugar** del planeta: por nombre, coordenadas o tocando el globo.
3. **Lees el veredicto:** tendencia real, pista falsa o ciclo natural, con la fuerza de la evidencia. Si es un riesgo, la app muestra una alerta y qué hacer.

## Datos de la NASA

MERRA-2 (reanálisis del GMAO, 1981–2026), GPM IMERG (lluvia de la misión GPM, 1998–2026) y NASA POWER (API v10 y archivo abierto). Globo con NASA Blue Marble.

## Cómo abrirla en tu computadora

- Windows: doble clic en `start.bat`. Otros sistemas: `sh start.sh`.
- O abre `web/index.html` en el navegador. Los casos resueltos funcionan sin internet; los lugares nuevos usan la API de NASA POWER.

## Reproducir los datos

`pip install -r requirements.txt`, luego los scripts de `scripts/` (ver `README.md`, sección del pipeline). Pruebas: `pytest tests/`.
