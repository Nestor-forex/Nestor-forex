# El curso y la página web (2026-11-18)

Néstor pidió arrancar el curso (punto 8 del plan) y trajo otra conversación con
recomendaciones para la página web, el tutorial y el curso. Esta nota guarda
qué se toma de esa conversación, qué se corrige y cómo va a ser el curso.

⚠️ **Nada de esto está construido todavía.** Es el plan. La página web va la
última (punto 7) y el curso se empieza ahora.

---

## 1. Lo que se toma de la otra conversación

| recomendación | por qué sí |
|---|---|
| Seis páginas, cada una contesta una pregunta del visitante | es la forma correcta de ordenar una web de venta |
| Una página entera para la transparencia | es el mejor argumento que tiene el producto, y ninguna competidora lo tiene |
| Diseño sobrio, oscuro, **un solo color de acento** | ya es así en las apps: cian en Swing, dorado en Intradía |
| Carga en menos de 1,5 segundos | una página lenta se lee como poco seria |
| Tutorial por «misiones» cortas que dicen **para qué** sirve cada cosa | encaja con «Para qué sirve» que ya tienen las tarjetas |
| Curso por módulos, con progreso guardado y cada lección atada a una herramienta real | es justo el punto 8 del plan |
| Insignias por aprender, nunca por ganar | ya está hecho así (punto 4) |

## 2. Lo que se corrige, y por qué

1. **«IA integrada» en la franja de confianza.** Qwen no está instalada todavía
   (la cuenta se abre después del 2026-11-20). No se puede anunciar lo que no
   existe.
2. **«Muestre evidencia real de que esto funciona» y «leaderboard de
   rendimiento».** Hoy no hay esa evidencia: la app mide −0,04 por unidad de
   riesgo en Swing y −0,13 en Intradía, y los experimentos no han llegado a 150
   operaciones. La página de transparencia se queda, pero se llama por lo que
   es: **«Lo que medimos, lo que funciona y lo que no»**. Un leaderboard
   presenta las señales como producto, que es justo lo que la app no vende.
3. **Las cifras de la introducción** (credibilidad «en 50 milisegundos», «el
   75 % juzga por el diseño»). Vienen de estudios generales de hace casi veinte
   años, no del sector financiero. Sirven para orientarse; **no se publican en
   la web como hechos**.
4. **Módulo 10 «backtestear tu sistema».** Las apps no tienen un banco de
   pruebas para el usuario. La importación del bróker y «Tus números por
   grupos» miden tus operaciones reales, no un backtest. Se reescribe como
   **«Medir tus propios números sin engañarte»**.
5. **Un video de 3-5 minutos en cada lección.** Alguien tiene que grabarlos y
   volverlos a grabar cada vez que cambia una pantalla. Se empieza con texto,
   ejemplos con números reales, dibujos y capturas; los videos van después y
   solo donde de verdad ayuden.
6. **Tutorial dentro de una «versión demo» de la app en la web.** Exige una
   segunda copia de la app sin cuenta y con datos de mentira que hay que
   mantener aparte. Lo barato y útil: **el recorrido guiado va DENTRO de la
   app** (la primera vez que alguien entra), y en la web, un recorrido con
   capturas reales.
7. **La IA como «Asistente de Academia» en la web pública.** El puente de Qwen
   solo atiende a miembros aprobados, con 5 consultas al día, porque cada
   consulta cuesta dinero. En una web abierta se gastaría en visitantes. Se
   queda dentro de la app.
8. **«Certificado digital».** Un certificado de trading se puede leer como una
   titulación. Se usan las insignias, que no lo prometen.
9. **La tipografía Orbitron.** Es de ciencia ficción y choca con «aburrido a
   propósito», que la propia conversación recomienda.

## 3. Lo que a la otra conversación le faltó

- **El aviso de riesgo y lo legal**: no es asesoría financiera, el Forex tiene
  riesgo alto, política de privacidad (la app guarda datos en Firebase y manda
  avisos al celular) y condiciones de uso.
- **Las 16 explicaciones para suscriptores** que ya están escritas en
  `CLAUDE.md` (el volumen, TradingView, el margen de error, la rejilla, el
  cierre parcial…). **Son el contenido de la página de transparencia** y de
  buena parte del curso.
- **Las dos apps juntas.** Presentada sola, cada una parece incompleta: Swing
  no es para minuto a minuto y eso lo hace Intradía.
- **El cobro y la renovación**: pago anticipado, el robot que cierra la puerta
  al vencer, Venezuela en manual.
- **Nunca el nombre del bróker**, y **cada número con su fecha**.
- **El idioma.** Las apps están en 13 idiomas; el curso se escribe primero en
  español.

---

## 4. El curso

### Dónde vive

**Dentro de las apps, en una pestaña «Aprender»**, porque ahí puede hacer lo
que en una web no: abrir la herramienta de la que habla la lección, mandar el
ejercicio al modo práctica, guardar el progreso en la ficha y dar las insignias.

Las lecciones se escriben **una sola vez como datos** (un archivo por lección)
y se pintan en la app. Si más adelante se quieren los dos primeros módulos
gratis en la página web, se pintan desde los mismos archivos: nunca dos copias.

### Cómo es cada lección

1. **Qué vas a aprender** — una frase.
2. **La explicación**, en palabras sencillas, con un ejemplo de la vida diaria.
3. **Un ejemplo con números de la app**, con su fecha.
4. **La fórmula**, si la hay, con los números puestos.
5. **Lo que esto NO te dice.** Va siempre. Es lo que diferencia este curso.
6. **Hazlo en la app**: un botón que lleva a la herramienta. Si sirve, un
   ejercicio en el modo práctica (por ejemplo: «pon el Stop-loss a 1,5 ATR y
   mira qué pasa»).
7. **Tres preguntas** para comprobar que se entendió. Sin nota ni ranking.

### Las reglas que no se ablandan

- **Ninguna lección dice «compra» o «vende»** ni hacia dónde irá el precio.
- **El backtest y el registro real nunca van en la misma frase** sin decir de
  cuál es cada número.
- **Ningún número de acierto** sin su margen de error al lado.
- **Las insignias premian terminar, practicar y respetar el freno**, nunca
  ganar.
- **Cada número lleva fecha**, y si sale de la app se lee de la app, no se
  escribe a mano.

### El temario (borrador)

| nivel | módulo | qué aprende | herramienta de la app |
|---|---|---|---|
| **0. Antes de empezar** | 0. Qué es y qué no es esta app | información, no señales; experimentos y 150 operaciones; quién decide | «Qué es esta app» |
| **1. Fundamentos** | 1. El lenguaje del Forex | par, base y cotizada, pip, lote, spread, apalancamiento | Glosario, Calculadora |
| | 2. El riesgo primero | arriesgar un % fijo, Stop-loss, Take-profit, R/B, el lote sale del Stop | Mi perfil de riesgo, Calculadora |
| | 3. Tu freno del día | por qué se pierde más el día malo; el freno y las pérdidas seguidas | Tu freno de hoy, Diario |
| **2. Leer el mercado** | 4. Quién manda hoy | fuerza relativa entre divisas, divergencia, por qué 10 contra 0 no es «mucha diferencia» | Barrido, Tablero completo |
| | 5. Tendencia y rango | medias móviles, RSI, ATR, soportes y resistencias, compresión | Analizador, Compresión, Medias |
| | 6. Lo que cuesta operar | spread, swap, por qué en intradía el coste pesa 4 veces más | Lo que cuesta abrir, Tasas y swap |
| | 7. Noticias y bancos centrales | el calendario, lo previsto contra lo anterior, la sorpresa | Calendario, Noticias, ¿Qué significa? |
| | 8. Pares que son la misma apuesta | correlación, riesgo correlacionado, el oro y el dólar | Correlación, Oro (Swing), aviso del Diario |
| **3. Practicar** | 9. Del análisis a la operación | armar una tarjeta en el Analizador sin que la app elija la dirección | Analizador, Plantillas, ¿Cómo operas? |
| | 10. Practicar sin dinero | el modo práctica, el resultado en R, con spread y swap | Modo práctica |
| **4. Medirse con honestidad** | 11. Un número que significa algo | margen de error, 9 operaciones no dicen nada, backtest contra registro real | Tus números por grupos, Historial |
| | 12. Medir tus propios números | importar del bróker, el neto con swap y comisión, qué grupos mirar | Importar del bróker, Diario |

El COT y la correlación son solo de Swing; la lección lo dice y en Intradía se
salta.

### Por dónde se empieza

1. **El módulo 0 y el módulo 2** (qué es la app y el riesgo primero): son los
   que más protegen a un principiante y los que menos cambian con el tiempo.
2. La pestaña «Aprender» en las dos apps, con el progreso guardado.
3. Las insignias de lecciones (ya previstas en el punto 4).
4. Los demás módulos, uno por uno.

### Lo que decide Néstor antes de construir

1. **¿El curso vive dentro de las apps (recomendado) o en la página web?**
2. **¿Solo texto e imágenes al principio, o hay que grabar video desde ya?**
3. **¿Los primeros módulos gratis para quien no se ha suscrito?** Sirve para
   vender, pero exige que se vean sin cuenta.
