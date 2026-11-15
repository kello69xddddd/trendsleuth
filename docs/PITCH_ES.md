# Pitch local (5 minutos, español) · versión final

> English: [PITCH.md](PITCH.md) · Deck: [pitch/TrendSleuth_pitch_ES.pdf](pitch/TrendSleuth_pitch_ES.pdf)

Estructura de 7 diapositivas de la guía de la sede. Hablan dos personas: **Voz 1 (Narek)** y **Voz 2** (maneja la demo).

Equipo y roles: Narek Vásconez (líder), Alejandro Benítez (frontend), Jorge Chapi (backend), Andrés Albán (diseño visual), Alexander Escobar (impacto).

| Tiempo | Diapositiva | Voz |
|---|---|---|
| 0:00–0:25 | 1 Portada e identificación | Voz 1 |
| 0:25–1:00 | 2 El problema y su relevancia | Voz 1 |
| 1:00–1:30 | 3 La solución y su valor | Voz 2 |
| 1:30–2:10 | 4 Datos NASA y sustento científico | Voz 2 |
| 2:10–3:35 | 5 Arquitectura y demo en vivo | Voz 2 |
| 3:35–4:25 | 6 Impacto, usabilidad y escalabilidad | Voz 1 |
| 4:25–4:55 | 7 Transparencia, recursos y equipo | Voz 1 |

**1 · Voz 1.** "Buenos días. Somos el equipo TrendSleuth, de la sede Sangolquí. Octubre de 2026: el Niño costero llega a más 4,3 grados frente a nuestra Costa. Y todos nos preguntamos: ¿esto es el clima de siempre… o algo está cambiando para siempre? (pausa) Responder eso con datos es exactamente el reto que elegimos: Be An Earth System Trend Detective. Nuestra respuesta es TrendSleuth: detecta, con datos de la NASA, si un cambio en la Tierra es real o una falsa alarma."

**2 · Voz 1.** "Pero responderlo no es fácil. Son 28 años de lluvia en el Pacífico, medidos por satélite. ¿Sube? ¿Baja? A simple vista, nadie lo sabe. Hay tres trampas: El Niño puede esconder una tendencia o inventarla; un solo dataset puede mentir; y hacerlo bien exige código y estadística de nivel científico. ¿Por qué es crítico? Solo una de cada cuatro 'tendencias' de lluvia de un dataset de la NASA la confirma el otro. Tres de cada cuatro alarmas podrían ser falsas. Y con eso deciden estudiantes que investigan, docentes que enseñan, GAD que planifican agua y energía, y el agro."

**3 · Voz 2.** "TrendSleuth lo resuelve en tres pasos. Uno: eliges una variable y el globo se pinta: verde si sube, rojo si baja, y solo si está confirmado. Dos: eliges un lugar, cualquiera del planeta. Tres: lees el veredicto en palabras simples: tendencia real, pista falsa o ciclo natural. Y si es un riesgo, te avisa cuánto cambiará hasta 2050 y qué hacer. Sin código. Sin estadística. Sin login. Un estudiante lo usa en dos minutos."

**4 · Voz 2.** "Todo sale de datos oficiales de la NASA. MERRA-2, el reanálisis del GMAO: un modelo que combina observaciones de satélites, con 45 años y siete variables. GPM IMERG, la lluvia de la misión GPM, medida con radar y satélites: es nuestro segundo testigo. Y la API de NASA POWER, para cualquier punto del planeta. Esta es la capa de lluvia: solo se pinta lo que confirman los dos datasets. El método: quitamos las estaciones, quitamos El Niño y nueve ritmos naturales más, aplicamos cuatro pruebas —Mann-Kendall, pendiente de Sen, prueba t corregida y robustez— y pedimos el segundo testigo. Así revisamos 52 000 celdas del planeta, con máximo 5 % de falsos positivos."

**5 · Voz 2 (demo en vivo).** "No nos crean a nosotros: veámoslo en vivo. Caso uno, Quito: más 0,21 grados por década; todas las pruebas pasan: tendencia real, fuerte. Y la alerta: desde 1995 el cambio ya supera la variación normal; si sigue así, medio grado más hasta 2050. Caso dos, la cuenca del Coca: un dataset de la NASA dice que llueve cada vez más, con p de 0,0003. Cualquier herramienta diría 'tendencia'. Pero el segundo testigo dice que no: pista falsa, sin alerta. Caso tres, Nauru y Kiribati: en el dato crudo no hay nada, p de 0,56. Quitamos El Niño, que explica el 65 % de la variación… y aparece: 15 % menos lluvia por década. Una sequía escondida. Por dentro: Python procesa los datos de la NASA y los guarda en JSON; el mismo motor estadístico corre en el navegador con un globo 3D. Está en línea y los casos funcionan sin internet."

**6 · Voz 1.** "¿Qué cambia con TrendSleuth? Menos falsas alarmas: tres de cada cuatro 'tendencias' de lluvia de un solo dataset ya no pasan como reales. Segundos, sin código y sin login. Y una alerta con una acción concreta. En Ecuador es urgente hoy: el Niño costero está en más 4,3 grados, y la cuenca del Coca, la de Coca Codo Sinclair, responde al revés que la Costa. En el mundo, encuentra la misma sequía de la Amazonía sur que ya documenta la ciencia: 9 % menos lluvia por década. Es para estudiantes de bachillerato y de universidad, como pide el reto, y para sus docentes. Y escala: piloto en colegios en diciembre y versión en español para las aulas en 2027."

**7 · Voz 1.** "Todo es abierto. Declaramos el uso de IA: Claude escribió buena parte del código; nuestro equipo eligió el reto, definió el enfoque y revisó cada resultado. Los créditos científicos son de la NASA, NOAA y el IPCC, y el código es abierto con licencia MIT. Somos Narek, Alejandro, Jorge, Andrés y Alexander. (pausa) Volvamos a la pregunta del inicio: ¿es el clima de siempre… o algo está cambiando para siempre? Los datos de la Tierra son difíciles de leer. TrendSleuth te dice cuándo un cambio es real. Gracias."
