# Ficha del proyecto (español)

> English version: [PROJECT_PAGE.md](PROJECT_PAGE.md)

**Nombre del proyecto:** TrendSleuth

**Equipo:** Narek Vásconez, Alejandro Benítez, Jorge Chapi, Andrés Albán, Alexander Escobar · NASA Space Apps Challenge 2026 · Sangolquí (ESPE), Ecuador

**Reto:** Be An Earth System Trend Detective!

**App en línea:** https://kello69xddddd.github.io/trendsleuth/
**Repositorio:** https://github.com/kello69xddddd/trendsleuth (licencia MIT)
**Pitch deck (7 diapositivas):** https://github.com/kello69xddddd/trendsleuth/blob/main/docs/pitch/TrendSleuth_pitch_ES.pdf · [English](https://github.com/kello69xddddd/trendsleuth/blob/main/docs/pitch/TrendSleuth_pitch_EN.pdf)

## Resumen

Los datos de la Tierra suben y bajan todo el tiempo, y saber si un cambio es real exige descargar datos, quitar las estaciones y correr estadística. TrendSleuth lo hace en segundos.
Eliges una variable (lluvia, temperatura, humedad del suelo y más) y el globo se pinta: verde donde una subida está confirmada, rojo donde una bajada está confirmada y sin color donde no hay nada confirmado. Luego eliges cualquier lugar por nombre, coordenadas o con un toque. La herramienta lee hasta 45 años de datos de la NASA y da un solo veredicto: **¿hay tendencia y qué tan fuerte es la evidencia?** Si la tendencia está confirmada y es un riesgo, muestra una alerta, cuánto cambiaría hasta 2050 si sigue igual y qué hacer.

Primero quita las estaciones y los ritmos naturales del clima (El Niño y diez fenómenos repetitivos más), luego prueba lo que queda con estadística estándar y, en lluvia, lo compara con un segundo dataset de la NASA. La respuesta tiene tres niveles: Beginner (la respuesta), Intermediate (los gráficos) y Pro (todas las pruebas).

**Público:** estudiantes de los últimos años de colegio y universitarios, y sus docentes.

## Cómo responde al reto

| El reto pide | TrendSleuth responde |
|---|---|
| Elegir variables | Siete variables de la NASA con definiciones simples |
| ¿Dónde está cambiando? | Mapa global de tendencias por variable, cualquier punto del planeta (datos en vivo de NASA POWER) y una lista "Top trends" automática |
| Ver el cambio en el tiempo | Series interactivas: dato crudo, sin estaciones y sin el ritmo natural |
| ¿Cuánto cambia? | Pendiente de Sen por década, en unidades reales y en porcentaje, con rango del 95 % |
| ¿Es significativo? | Mann-Kendall estacional, prueba t corregida, intervalo de confianza y tres pruebas de robustez |
| ¿Es un problema? | Alerta (Warning / Watch / Low concern) con proyección a 2050 y una recomendación basada en el IPCC AR6 |
| Formar detectives de datos | Demo guiada, nueve casos resueltos y un glosario de 31 palabras |

## Cómo funciona

Anomalías mensuales para quitar el ciclo anual. Regresión contra diez índices climáticos (Niño 3.4, Niño 1+2, IOD, NAO, AO, PNA, Atlántico tropical norte y sur, SAM, QBO), con desfase de 0 a 6 meses; se quita el ritmo más fuerte solo si es significativo (Bonferroni). La PDO se reporta sin quitarla. Luego: Mann-Kendall estacional (corrección Hirsch-Slack), pendiente de Sen con IC 95 % y prueba t con errores AR(1). Robustez: meses neutros, registro sin los últimos dos años y segundo dataset. El mapa global aplica la misma prueba a 51 840 celdas con una tasa de falsos descubrimientos del 5 % (Benjamini-Hochberg). El motor de Python está validado contra `pymannkendall` y datos sintéticos, y el motor del navegador lo reproduce.

## Qué encontramos

1. **Mismo Niño, resultados opuestos.** La lluvia de la Costa de Ecuador sigue al Niño costero (37 % de la variación mensual). La cuenca del Coca, sobre la mayor hidroeléctrica del país, responde al revés. No hay tendencia de lluvia a largo plazo: es un ciclo.
2. **Una pista falsa.** Un solo dataset de la NASA muestra más lluvia en esa cuenca (p = 0,0003). El segundo no lo confirma. En tierra, solo el 25 % de las tendencias de lluvia significativas de MERRA-2 las confirma IMERG.
3. **Una tendencia oculta.** En Nauru y Kiribati el dato crudo no muestra tendencia (p = 0,56). Al quitar El Niño, la lluvia baja cerca de 15 % por década desde 1998 (p < 0,001), y el segundo dataset coincide. Es una pista para revisar con pluviómetros, no un resultado final.
4. **Antes y ahora.** En esas islas, El Niño 2015–16 trajo 113 % más lluvia de lo normal; El Niño 2026, con el mismo pico, 72 % hasta ahora.

## Alcance y límites

Solo tendencias en línea recta. Con 28 a 46 años no se puede separar una tendencia forzada de una variabilidad natural lenta. Una relación con un ritmo es asociación, no causa. La proyección a 2050 es una señal para investigar, no un pronóstico de un modelo climático.

## Datos de la NASA

Archivos de NASA POWER v10 con MERRA-2, GPM IMERG y CERES SYN1deg; la API mensual de NASA POWER; y la imagen NASA Blue Marble. Tabla completa con enlaces: [DATA_AND_REFERENCES.md](DATA_AND_REFERENCES.md).

- NASA POWER: https://power.larc.nasa.gov/
- MERRA-2 (GMAO): https://gmao.gsfc.nasa.gov/reanalysis/MERRA-2/
- GPM IMERG: https://gpm.nasa.gov/data/imerg
- Blue Marble: https://visibleearth.nasa.gov/collection/1484/blue-marble

## Otros datos y referencias

Índices climáticos de NOAA PSL (11 series), fronteras de Natural Earth (dominio público), librerías abiertas globe.gl, three.js y Plotly.js. Referencias de los métodos en [DATA_AND_REFERENCES.md](DATA_AND_REFERENCES.md).

## Uso de inteligencia artificial

Usamos Claude (Anthropic) para investigación, código, análisis, diseño de la interfaz y redacción, bajo la dirección y revisión del equipo. No usamos imágenes, audio ni video generados con IA. No usamos el logo de la NASA. Declaración completa, con el trabajo hecho antes del evento: [AI_AND_PRIOR_WORK.md](AI_AND_PRIOR_WORK.md).
