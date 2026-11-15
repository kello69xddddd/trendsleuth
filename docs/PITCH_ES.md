# Pitch local (5 minutos, español) · versión final (guía global)

> English: [PITCH.md](PITCH.md) · Deck: [pitch/TrendSleuth_pitch_ES.pdf](pitch/TrendSleuth_pitch_ES.pdf)

Equipo y roles: Narek Vásconez (líder), Alejandro Benítez (frontend), Jorge Chapi (backend), Andrés Albán (diseño visual), Alexander Escobar (impacto).

Sigue las 7 diapositivas de la guía global de Project Demo: Portada, Problema, Solución, Datos NASA, Prototipo, Resultados y Cierre. Son unas 700 palabras: 4:55 con pausas. Hablan dos personas: **Narek (Voz 1)** abre, plantea el problema, presenta los resultados y cierra; **Voz 2** explica la solución y los datos y maneja la demo. Hay solo dos relevos, en 1:05 y en 3:10. La historia abre y cierra con la misma pregunta: **¿el clima de siempre o algo que cambia para siempre?**

| Tiempo | Diapositiva (guía global) | Voz | Qué debe sentir el jurado |
| --- | --- | --- | --- |
| 0:00–0:30 | 1 Portada | Voz 1 (Narek) | "Es urgente y entendí qué hacen" |
| 0:30–1:05 | 2 Problema | Voz 1 (Narek) | "Solo 1 de 4 tendencias se confirma" |
| 1:05–1:40 | 3 Solución | Voz 2 | "Entrada, proceso, salida: lo entiendo" |
| 1:40–2:20 | 4 Datos NASA | Voz 2 | "Cada dato NASA tiene un uso real" |
| 2:20–3:10 | 5 Prototipo (demo en vivo) | Voz 2 (maneja la app) | "Funciona hoy, en vivo" |
| 3:10–4:15 | 6 Resultados | Voz 1 (Narek) | "Lo probaron y encontró algo oculto" |
| 4:15–4:55 | 7 Cierre | Voz 1 (Narek) | "Sé qué sigue y la frase se me queda" |

## 0:00–0:30 · Portada · Voz 1

[Esperar 2 segundos en silencio. Mirar al jurado.] "Buenos días. Somos el equipo TrendSleuth, de la sede Sangolquí. Octubre de 2026: el Niño costero llega a más 4,3 grados frente a nuestra Costa. Y todos nos preguntamos: ¿esto es el clima de siempre… o algo está cambiando para siempre?

(pausa)

Responder eso con datos es el reto que elegimos: Be An Earth System Trend Detective. Nuestra respuesta es TrendSleuth: detecta, con datos de la NASA, si un cambio en la Tierra es real o una falsa alarma."

## 0:30–1:05 · Problema · Voz 1

"Pero responderlo no es fácil. [Señalar el gráfico] Son 28 años de lluvia en el Pacífico, medidos por satélite. ¿Sube? ¿Baja? A simple vista, nadie lo sabe.

Hay tres trampas. El Niño puede esconder una tendencia, o inventarla. Un solo dataset puede mentir. Y hacerlo bien exige código y estadística de nivel científico.

¿Por qué importa? [Señalar el 1 de 4] Solo una de cada cuatro 'tendencias' de lluvia de un dataset de la NASA la confirma el otro. [Señalar "Afecta a"] Y con estos datos deciden estudiantes que investigan, docentes que enseñan, GAD que planifican agua y energía, y el agro."

## 1:05–1:40 · Solución · Voz 2

"TrendSleuth es una app web que le dice a cualquiera si un cambio en la Tierra es real. [Señalar cada tarjeta] Entrada: eliges una variable y cualquier lugar del planeta. Proceso: quita las estaciones y El Niño, aplica cuatro pruebas estadísticas y le pregunta a un segundo dataset de la NASA. Salida: un veredicto en palabras simples: tendencia real, pista falsa o ciclo natural. Y si es un riesgo, una alerta con qué hacer.

[Señalar la franja de abajo] Eso es justo lo que pide el reto: separar tendencias reales de ciclos naturales. Sin código, sin estadística, sin login."

## 1:40–2:20 · Datos NASA · Voz 2

"Todo sale de datos oficiales de la NASA, y cada fuente tiene una función. [Señalar la tabla] MERRA-2, el reanálisis del GMAO: siete variables desde 1981; con él probamos la tendencia en cada celda del planeta. GPM IMERG, la lluvia de la misión GPM: es nuestro segundo testigo. Una tendencia de lluvia solo cuenta si los dos coinciden. La API de NASA POWER trae cualquier lugar nuevo en vivo.

[Señalar el flujo] El método: quitamos las estaciones, quitamos El Niño y nueve ritmos naturales más, aplicamos cuatro pruebas y pedimos el segundo testigo. Así revisamos 52 000 celdas, con máximo 5 % de falsos positivos."

## 2:20–3:10 · Prototipo (demo en vivo) · Voz 2 maneja la app

"No nos crean a nosotros. Veámoslo en vivo." [App ya abierta en Temperature + Pichincha.]

"Uno: eliges una variable; el globo se pinta, verde donde la subida está confirmada. Dos: eliges un lugar: Quito. Tres: lees el veredicto. Sí, tendencia real: más 0,21 grados por década, todas las pruebas pasan. Y la alerta: desde 1995 el cambio ya supera la variación normal de la ciudad; si sigue así, medio grado más hasta 2050.

[Volver al deck, señalar "Ya funciona"] Y ya funciona hoy: está en línea, sin login, cualquier lugar del planeta con la API de NASA POWER, y los casos de demo incluso sin internet."

## 3:10–4:15 · Resultados · Voz 1

"¿Qué demostramos? Lo probamos en tres lugares. [Señalar cada captura] Quito: tendencia real, más 0,21 grados por década.

La cuenca del Coca, la que alimenta Coca Codo Sinclair: un dataset de la NASA dice que llueve cada vez más, con p de 0,0003. Cualquier herramienta diría: tendencia. Pero el segundo dataset no coincide, y TrendSleuth dice: pista falsa, sin alerta.

Nauru y Kiribati: en el dato crudo no hay nada, p de 0,56. Quitamos El Niño, que explica el 65 % de la variación… y aparece: 15 % menos lluvia por década. Una sequía escondida.

[Señalar la franja de abajo] En todo el planeta, solo una de cada cuatro tendencias de lluvia de un dataset la confirma el otro. Y la herramienta encuentra la sequía de la Amazonía sur que ya documenta la ciencia: 9 % menos por década. ¿Quién gana? Estudiantes de colegio y universidad, como pide el reto, y sus docentes. La diferencia: antes de llamar real a algo, un segundo dataset de la NASA tiene que coincidir."

## 4:15–4:55 · Cierre · Voz 1

"¿Qué sigue? Un piloto en colegios en diciembre, donde mediremos el tiempo de respuesta y los veredictos correctos, y en 2027 la versión en español validada con estaciones. Todo es abierto: la app está en línea, escaneen el código. Declaramos el uso de IA: Claude escribió buena parte del código; nuestro equipo eligió el reto, definió el enfoque y revisó cada resultado. Somos Narek, Alejandro, Jorge, Andrés y Alexander.

(pausa, mirar al jurado)

Volvamos a la pregunta del inicio: ¿es el clima de siempre… o algo está cambiando para siempre? Los datos de la Tierra son difíciles de leer. TrendSleuth te dice cuándo un cambio es real. Gracias."

