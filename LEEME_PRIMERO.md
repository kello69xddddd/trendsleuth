# TrendSleuth: qué hacer ahora (versión 4, sábado 14-nov, noche)

## 1. Abrir la app
- **Recomendado:** doble clic en `start.bat` (abre `http://localhost:8000`). Necesita Python instalado.
- **Sin servidor:** doble clic en `web/index.html`. Funciona igual (usa `web/data/offline.js`).
- Sin internet funcionan: el globo con tendencias, los nombres de lugar, Top trends, los 9 casos, el glosario y la demo. Un lugar nuevo necesita internet (API de NASA POWER).
- La versión anterior quedó en `web_v3_backup/`.

## 2. Qué cambió con la tercera lista de correcciones (`Correcciones_1.docx`)
| Corrección | Qué se hizo |
|---|---|
| Globo 3D satelital realista, HD, con más zoom | Imagen NASA Blue Marble 4096 × 2048 (antes 2048 × 1024) en sus colores reales: océanos azul profundo, relieve, costas y fronteras. Zoom con rueda o botones **+ / −** hasta más de 2 veces más cerca que antes. Halo azul alrededor de la esfera |
| Quitar el gris | Ya no se pinta lo "no confirmado": se ve la Tierra real. Solo se pinta **verde** (sube) y **rojo** (baja) |
| Verde y rojo más fuertes según el tamaño de la tendencia | Cada celda tiene una intensidad de 1 a 9 según su velocidad de cambio (9 = percentil 95 de esa variable). Tendencia pequeña = color tenue |
| Fondo espacial muy sutil | Estrellas pequeñas y poco brillantes en toda la página, en 3 capas que se mueven unos píxeles con el cursor (profundidad) |
| Ni muy oscuro ni muy claro, pastel según la tendencia | Página pizarra neutra, ventana oscura para el globo, panel de resultado claro que se pone **verde pastel** si sube, **rojo pastel** si baja y gris neutro si no hay tendencia |
| Top trends: 2 casillas sin región | Ya no hay casillas vacías (ver sección 3). Los porcentajes ▲ ▼ van en verde y rojo |
| "How it works" aburrido | Cuatro pasos con mini-gráficos animados y colores, tres cifras clave, cómo leer el globo, fuentes con enlaces y equipo |
| Equipo de 5 | Andrés Albán y Alexander Escobar añadidos en la app, `README.md`, `PROJECT_PAGE.md` y `AI_AND_PRIOR_WORK.md` |
| Menos es más, nada repetido | El lugar aparece **una sola vez** (la caja de búsqueda del paso 2). Se quitaron la etiqueta sobre el globo, las cajas Lat/Lon/Go, las 3 tarjetas y 2 de los 3 botones del resultado. La cifra ya no se repite en la frase |
| Glosario entre TrendSleuth y los niveles | Botón **Glossary**: 31 palabras con ejemplo y unidades, buscador y 3 grupos (Basics, Tests, Units) |
| Verdict / Evidence / Details | Ahora **Beginner · The answer**, **Intermediate · The charts**, **Pro · The tests**, con barras que suben de nivel. Cada dato vive en un solo nivel |
| "1 What? 2 Where?" | **1 Choose a variable**, **2 Choose a place**, **3 Read the result**, en un color naranja que nada más usa |
| Pantalla de bienvenida | La app abre con variable y lugar ya elegidos (Temperature, Pichincha). La bienvenida es una ventana emergente con X: tres pasos y qué hay en cada nivel |
| Datos con links | Enlaces en "How it works" y en **Pro → Data and sources** |
| Logo de la NASA | **No se añadió** (ver sección 4) |

## 3. Las 2 casillas "No confirmed region" de Top trends
Regla original: región de al menos 12 celdas con 70 % del área confirmada en la misma dirección.
- **Temperatura que baja:** solo 4 % del mapa baja y el 95 % de esas celdas está en el mar. En tierra ninguna región grande cumple. Se usa la mejor región pequeña: **Honduras, −0,16 °C por década** (9 celdas, 78 % confirmado). Sale marcada "small area".
- **Noches frías que bajan:** ninguna región de tierra llega ni al 30 %. La bajada está en el océano alrededor de la Antártida. Se usa un bloque de mar: **mar de Weddell, −0,55 °C por década** (91 % confirmado). Sale marcado "open sea".
- Las otras 12 casillas no cambian. Siguen siendo pistas de un solo reanálisis, no conclusiones.

## 4. Logo de la NASA: por qué no está
Las reglas de Space Apps no permiten usar la insignia ni otros identificadores de la NASA sin permiso expreso. Nuestro `AI_AND_PRIOR_WORK.md` ya declara que no los usamos. La app dice "Built with NASA open data" con los enlaces. Sí se puede usar el **logo de NASA Space Apps** (spaceappschallenge.org/brand); si lo descargan, se añade en 2 minutos.

## 5. Lo que hay que saber explicar
- **Regla del globo:** Mann-Kendall estacional por celda con 5 % de falsos descubrimientos. En lluvia, MERRA-2 e IMERG deben coincidir, por eso casi no tiene color (94 % sin confirmar). Sin color es "no confirmada", no "no cambia".
- **Globo vs resultado:** el globo es un escaneo con una prueba; el resultado de un lugar usa todas. Pueden diferir.
- **Colores:** verde = sube, rojo = baja, en toda la app (globo, titular, panel, Top trends). Solo cuando la tendencia está confirmada.
- **Al cambiar de variable** con un caso resuelto abierto, la app analiza ese lugar en vivo (necesita internet).

## 6. Números del mapa
| Variable | Sube | Baja | No confirmada |
|---|---|---|---|
| Temperatura | 70 % | 4 % | 26 % |
| Días calurosos | 64 % | 4 % | 33 % |
| Noches frías | 74 % | 3 % | 22 % |
| Humedad del suelo (tierra) | 21 % | 13 % | 66 % |
| Humedad | 26 % | 9 % | 65 % |
| Viento | 10 % | 8 % | 82 % |
| Lluvia (dos datasets) | 3 % | 3 % | 94 % |

Los números de los casos no cambian: Quito +0,21 °C por década; pista falsa del Coca (solo 25 % confirmadas); Nauru y Kiribati −15 % de lluvia por década al quitar El Niño; El Niño 2015–16 +113 % vs 2026 +72 %.

## 7. Publicar y entregar
1. Repositorio público en GitHub con toda la carpeta (sin `data/raw`, `data/proc`, `web_v*_backup`, `_to_delete`). Settings → Pages → `main` / root.
2. Video de 30 s con el guion de `docs/PITCH.md`.
3. Texto de la página: `docs/PROJECT_PAGE.md`. Datos y referencias: `docs/DATA_AND_REFERENCES.md`.
4. `docs/AI_AND_PRIOR_WORK.md`: **complétenla (lo que revisó una persona) antes de enviar.**
5. Envío local: domingo antes de las 11:00. Global: domingo 23:59. Marquen "Submit for Judging".

## 8. Pendiente
- Probar en la laptop del pitch con su tarjeta gráfica real y un lugar en vivo con internet (las pruebas automáticas usan render por software y una respuesta simulada de la API).
- Opcional, más nitidez al máximo zoom: reemplazar `web/data/earth.jpg` por la Blue Marble de 8192 × 4096 de NASA Visible Earth y correr `python scripts/build_web_data.py`. El código la usa sin cambios.
- Rehacer las diapositivas (`docs/slides/`) y `TrendSleuth_project.zip`: son de la interfaz anterior.
