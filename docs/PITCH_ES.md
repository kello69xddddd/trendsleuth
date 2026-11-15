# Pitch local (5 minutos, español)

La versión en inglés (B2) y el guion del video están en `docs/PITCH.md`. Este es el mismo pitch para practicarlo en español.

**Idea en una línea:** Analizar datos de la Tierra es un problemón. Con TrendSleuth es fácil saber cuándo una tendencia es de verdad significativa y cuándo no.

**0:00 · Gancho (30 s)**
"Estos son 45 años de lluvia en un solo lugar. Sube, baja. ¿Está cambiando o es solo el clima de siempre?
Hoy, para responder, hay que descargar archivos, limpiarlos, quitar las estaciones y correr estadística. Son horas. Nosotros lo hacemos en segundos."

**0:30 · Problema (40 s)**
- En una frase: quien decide sobre agua, cultivos o energía no sabe si un cambio en los datos es real o una falsa alarma. Actuar con una pista falsa cuesta dinero; ignorar una tendencia real cuesta cosechas y energía.
- La NASA tiene miles de variables para cada lugar del planeta. Nadie puede leer todos esos gráficos.
- Una línea que sube no siempre es una tendencia. Las estaciones, El Niño y otros ritmos naturales pueden parecer una tendencia o esconderla.
- Una sola fuente de datos puede estar equivocada.

**1:10 · Solución (50 s) · mostrar la app**
- Paso 1: eliges la variable. El globo se pinta de verde donde hay subida confirmada y de rojo donde hay bajada confirmada. Más intenso = cambio más rápido. Sin color = no confirmada.
- Paso 2: eliges el lugar por nombre, por coordenadas o tocando el mapa. La app te dice la provincia y el país. Paso 3: lees el veredicto.
- Si la tendencia está confirmada, la app dice si es un riesgo (alerta), cuánto cambiaría hasta 2050 si continúa y qué hacer. Es una señal para investigar, no un pronóstico de un modelo climático.
- Capa 1: hay tendencia o no, y qué tan fuerte es (aún ninguna, débil, moderada, fuerte).
- Capa 2: los gráficos. Capa 3: cada prueba estadística. Cada quien profundiza hasta donde quiera.
- "Top trends" muestra de forma automática los cambios confirmados más fuertes del planeta.

**2:00 · Caso 1: tendencia real (30 s)**
- Temperatura cerca de Quito: +0,21 °C por década, 5 de 5 pruebas aprobadas. Veredicto: fuerte.

**2:30 · Caso 2: pista falsa (40 s)**
- Un dataset de la NASA dice que la cuenca del Coca se está mojando (p = 0,0003). El segundo dataset no está de acuerdo.
- Veredicto: débil. En tierra, solo el 25 % de las tendencias "significativas" de lluvia de un dataset las confirma el otro.

**3:10 · Caso 3: tendencia oculta (60 s)**
- Nauru y Kiribati: el dato crudo no muestra nada (p = 0,56).
- Probamos 11 ritmos naturales, no solo El Niño. Aquí El Niño explica el 65 % de la variación. Lo quitamos.
- Ahora la tendencia es clara: 15 % menos lluvia por década. 6 de 6 pruebas aprobadas.
- "Antes vs ahora": El Niño de 2015–16 trajo 113 % más lluvia de lo normal; El Niño de 2026, 72 % hasta ahora.

**4:10 · Confianza y cierre (50 s)**
- Métodos estándar: Mann-Kendall, pendiente de Sen, prueba t, intervalos de confianza. Validado contra una librería de referencia.
- Datos abiertos de la NASA, código abierto, límites declarados, diseño con normas de accesibilidad (WCAG).
- "Los datos de la Tierra son difíciles de leer. TrendSleuth los lee por ti y te dice cuándo un cambio es real."

## Preguntas probables

| Pregunta | Respuesta corta |
|---|---|
| ¿Solo sirve para El Niño? | No. Probamos 10 fenómenos repetitivos y reportamos uno lento (PDO). Además buscamos cualquier ritmo sin nombre. El ciclo anual siempre se quita primero. |
| ¿Qué significa "significativo"? | Menos de 5 % de probabilidad de que el cambio sea casualidad, corrigiendo la memoria de los datos. Para "fuerte" además debe pasar las pruebas de robustez. |
| ¿Por qué no Giovanni? | Pide login de Earthdata. Usamos los mismos productos (MERRA-2, IMERG) desde el archivo abierto de NASA POWER. |
| ¿Correlación o causa? | Asociación. La app lo dice. |
| ¿Y si la tendencia oculta es variabilidad lenta? | Puede ser. Con 28–46 años no se puede separar. Está en los límites. |
| ¿Qué hizo la IA? | Está declarado en `docs/AI_AND_PRIOR_WORK.md`. |
| ¿Funciona sin internet? | Los nueve casos y el globo sí. Los lugares en vivo necesitan internet (API de NASA POWER). |
