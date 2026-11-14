# La conversación de Néstor con Qwen, y lo que se decidió (2026-11-14)

Néstor habló con Qwen antes de integrarlo a las dos apps y pegó la
conversación entera en el chat. Aquí va guardada para que no se pierda: primero
lo que Qwen propuso (los cuatro prompts, tal cual), después lo que Néstor
decidió, que es lo que manda.

⚠️ **El análisis de EUR/USD de Qwen se hizo días antes del 2026-11-14** y con
datos que el propio Qwen llamó «simulados». Por eso sus precios (~1.1220) no
coinciden con los de ese día (1.1027). No es un error de Qwen: así se le pidió.

---

## 1. Lo que Qwen propuso

### La configuración que recomienda para tareas financieras

- La versión más reciente, con razonamiento paso a paso.
- **Temperatura baja (0,1-0,2):** respuestas frías y repetibles.
- **Intérprete de código activado:** que no calcule de memoria tamaños de
  posición, correlaciones ni ratios.
- **Contexto amplio con datos estructurados:** calendario, niveles, sentimiento.
- **Salida en formato estricto:** tablas, listas o JSON.

### Los 4 prompts fijos (copiados tal cual)

**PROMPT 1 — El Escáner Macroeconómico y Fundamental** (a primera hora).
Objetivo: definir el sesgo direccional del día.

> «Actúa como un Estratega Macro de Forex con 20 años de experiencia en bancos
> de inversión. Hoy es [Fecha]. Analiza el siguiente contexto fundamental para
> el par [Ej: EUR/USD] y el índice DXY.
> Datos de entrada: Eventos económicos de hoy: [Ej: 14:30 IPC EE.UU., 16:00
> Discurso de Powell] · Noticias geopolíticas relevantes: [Ej: Tensiones en
> Oriente Medio, datos de crecimiento en China] · Diferencial de rendimientos de
> bonos a 2 años (EE.UU. vs Zona Euro): [Ej: US 2Y en 4.8%, DE 2Y en 2.9%].
> Tu tarea: Evalúa el sesgo fundamental predominante (Alcista, Bajista o
> Neutral) y justifica por qué en máximo 3 frases. Identifica el mayor riesgo de
> cola (tail risk) o evento sorpresa que podría invalidar este sesgo hoy.
> Clasifica el entorno de mercado actual en una de estas 4 fases: Expansión,
> Desaceleración, Contracción o Recuperación, y explica qué divisas se benefician
> históricamente en esta fase.»

**PROMPT 2 — El Analista de Estructura de Mercado y Acción del Precio.**
Objetivo: alinear el análisis técnico con la liquidez institucional.

> «Actúa como un Trader Profesional de Acción del Precio y Flujo de Órdenes
> (Order Flow). Analiza la estructura de mercado del par [Ej: GBP/JPY] basándote
> en los siguientes datos.
> Datos de entrada: Tendencia en Diario (D1): [Ej: Alcista, haciendo altos y
> bajos más altos] · Tendencia en 4 Horas (H4): [Ej: Retroceso correctivo hacia
> una zona de demanda] · Niveles clave de liquidez/soporte/resistencia: [Ej:
> Soporte en 185.50, Resistencia en 187.20, FVG en 186.00] · Comportamiento
> reciente de las velas: [Ej: Vela de rechazo alcista con mecha larga en H4
> tocando el soporte].
> Tu tarea: Define la estructura de mercado actual (Tendencia, Rango o
> Transición). Identifica dónde está la liquidez institucional más probable
> (Buy-side o Sell-side liquidity) que el mercado podría buscar antes de moverse
> en la dirección de la tendencia. Proporciona 2 escenarios operativos claros:
> Escenario A (Continuación de tendencia) y Escenario B (Invalidación y
> reversión), con sus niveles de precio exactos.»

**PROMPT 3 — El Rastreador de Sentimiento y Flujo Institucional.**
Objetivo: operar en contra de la multitud minorista y a favor del «dinero
inteligente».

> «Actúa como un Gestor de Fondos de Cobertura especializado en análisis de
> sentimiento contrarian. Evalúa el entorno de sentimiento para el par [Ej:
> USD/CAD].
> Datos de entrada: Posicionamiento minorista (Retail Sentiment): [Ej: 75% de
> minoristas están largos en USD/CAD] · Datos COT (Commitment of Traders) más
> recientes: [Ej: Los gestores de dinero aumentaron posiciones cortas en CAD la
> semana pasada] · Correlación con materias primas: [Ej: El petróleo WTI ha caído
> un 3% hoy].
> Tu tarea: Aplica la lógica contrarian: ¿El posicionamiento minorista sugiere
> una trampa de liquidez? Explica por qué. Evalúa si el flujo institucional (COT
> y correlaciones) confirma o contradice el movimiento actual del precio.
> Concluye con una puntuación de convicción del 1 al 10 sobre la probabilidad de
> una operación en la dirección del flujo institucional.»

**PROMPT 4 — El Arquitecto del Plan de Trading y Gestión de Riesgo** (antes de
ejecutar). Objetivo: transformar el análisis en una orden con riesgo definido.

> «Actúa como un Auditor de Riesgo y Gestión de Capital de una mesa de dinero
> (prop firm). Voy a ejecutar una operación y necesito que audites y estructures
> mi plan.
> Datos de entrada: Par: [Ej: EUR/USD] · Dirección: [Ej: Corto] · Precio de
> entrada planeado: [Ej: 1.0850] · Nivel de Stop Loss (Invalidación lógica): [Ej:
> 1.0880] · Nivel de Take Profit 1 (Liquidez parcial): [Ej: 1.0800] · Nivel de
> Take Profit 2 (Objetivo final): [Ej: 1.0750] · Tamaño de mi cuenta: [Ej:
> $10,000] · Riesgo máximo por operación que permito: [Ej: 1%].
> Tu tarea: Calcula el Ratio Riesgo/Beneficio (R:R) para TP1 y TP2. Calcula el
> tamaño de la posición exacta en lotes (asumiendo un valor estándar de pip para
> ese par) para que la pérdida máxima sea exactamente el [1%] de la cuenta. Usa
> el intérprete de código para este cálculo si es necesario. Evalúa críticamente
> el plan: ¿El Stop Loss está en un lugar lógico de invalidación o es demasiado
> ajustado para el ruido del par? ¿El TP es realista en el contexto del rango
> diario promedio (ATR)? Dame un veredicto final: 'APROBADO', 'APROBADO CON
> AJUSTES' o 'RECHAZADO', con una breve justificación.»

(En el original de Qwen la última línea de datos decía «que允许o», una errata
con un carácter chino; se corrigió a «que permito».)

### Las 3 reglas de oro de Qwen

1. **La IA no opera por ti, tú operas con la IA.** La ejecución y la disciplina
   son 100 % del trader.
2. **El contexto lo es todo.** Un prompt sin datos reales es basura elegante.
3. **La gestión de riesgo no es negociable.** El Prompt 4 es el más importante.

### Lo que Qwen dijo sobre integrarse a las apps

- **No tiene memoria entre sesiones.** La app tiene que mandarle en cada
  consulta sus instrucciones (el «system prompt») y los datos.
- **No se conecta solo:** las apps le mandan los datos por una API.
- **No ejecuta operaciones**, ni debería.
- **Tres capas:** (1) el system prompt maestro con el rol, los 4 prompts, las
  reglas y el historial resumido; (2) los datos del día en JSON (precio, velas
  H1/H4/D1, RSI, EMA, ATR, soportes, resistencias, calendario, sentimiento, las
  últimas 30 operaciones); (3) un registro de aciertos: lo que dijo contra lo que
  pasó, % de aciertos en el sesgo, % de niveles tocados, acierto de los
  escenarios A y B, Sharpe.
- **Cómo combinarlos:** en Intradía, prompts 2 y 4 a cada sesión, el 1 al inicio
  del día y el 3 solo con COT nuevo. En Swing, prompts 1, 3 y 2 una vez al día y
  el 4 solo ante una operación concreta.
- **Sus tres advertencias:** sobreajuste (no ajustar el prompt a los últimos 30
  días), latencia en intradía, y nunca ejecutar sin confirmación humana.

---

## 2. Lo que decidió Néstor (2026-11-14) — esto es lo que manda

| tema | decisión |
|---|---|
| **Cambiar las instrucciones de Qwen** | **Se pueden cambiar cuando haga falta.** Si no hay resultados, se cambia lo que haya que cambiar. |
| **Prompts 3 y 4** | **Tal cual, incluidas la puntuación del 1 al 10 y el veredicto**, para MEDIRLOS. Las apps todavía no son públicas y se pueden hacer esas pruebas. |
| **Prompt 4** | Además de lo suyo, dice si el plan **cumple las reglas del propio perfil** del suscriptor. |
| **Fases del mercado y «qué divisas se benefician históricamente»** | No está medido → **se mide.** |
| **Contradicciones de Qwen** | Se espera a ver qué muestra; si no cuadra, se corrige. |
| **Los números** | **Los pone la app. Qwen no cambia ningún dato de las apps.** |
| **Qwen fuera de las apps** | **SÍ**, a petición o con autorización del usuario: puede combinar la información de las apps con información de fuera (internet). |
| **Límite** | **5 consultas al día por suscripción.** Quien quiera más se las pide al desarrollador y las **paga por adelantado**. |
| **Medir a Qwen** | **A la VISTA, no en la sombra:** resultados y métricas diarios, **con todos los pares de cada app** (14 en Swing, 18 en Intradía). |
| **«Explícamelo con Qwen»** | En cada noticia de los bancos centrales, el calendario, las tasas y el COT (pedido el 2026-11-13). |

### Cómo se cumple cada decisión sin perder lo que ya se sabe

⚠️ **Cambiar las instrucciones, sí; pero cada versión con su NÚMERO y su
FECHA, y sus resultados por separado.** No es para impedir cambios: es para
saber cuál funcionó. Si se cambia el prompt a mitad de camino y se suman los
resultados de antes y de después, el número final no describe a ninguna de las
dos versiones. Es lo que pasó con «comprar la caída» el 2026-10-12, cuando su
geometría cambió y las 29 operaciones viejas hubo que contarlas aparte.

⚠️ **Los números que Qwen da y la app no calcula** (las probabilidades de los
escenarios, la puntuación del 1 al 10, el veredicto) **se guardan y se
miden**, que es la decisión de Néstor. Para que se puedan medir hay que
anotarlos tal cual los da, con la fecha y el par. Al resolverse se contesta,
por ejemplo: cuando Qwen dio 8 o más de convicción, ¿acertó más que cuando dio
3?

⚠️ **Lo que dice el aviso en pantalla, mientras tanto:** las cifras de Qwen
están EN PRUEBAS y todavía no tienen 150 operaciones detrás. Lo mismo que las
otras reglas, pero a la vista y con su propio bloque.

📌 **Sobre el Prompt 3:** pide el «posicionamiento minorista» (el % de
pequeños comprados o vendidos en un bróker). **Ese dato no lo tiene la app:**
se buscó en seis fuentes el 2026-09-14 y ninguna lo publica de forma
utilizable. Lo que sí tiene es el **COT** (lo que tienen comprado los fondos
grandes y los pequeños en los futuros de Chicago). Así que Qwen recibe el COT y
se le dice que el dato minorista no está; si lo busca por internet a petición
del usuario, tiene que decir de dónde salió. **La puntuación del 1 al 10 se
queda**, por decisión de Néstor, para medirla.

📌 **Sobre internet:** Qwen puede leer fuera cuando el usuario lo pida, pero
la app **no copia ni guarda artículos de terceros**. Investing.com, investingLive
y otros no lo permiten en una app de pago (condiciones leídas el 2026-11-13).
Lo que Qwen traiga de fuera va **con su enlace** y rotulado como de fuera.

### Las piezas, en el orden acordado

1. **Néstor crea la cuenta de Qwen** (Alibaba Cloud, Model Studio) y le pone un
   tope de gasto. La llave **nunca** se pega en el chat ni va al repositorio:
   va a Cloudflare, como la del reloj.
2. **Un puente en Cloudflare** que guarda la llave, solo atiende a miembros
   aprobados y lleva la cuenta de las **5 consultas diarias**.
3. **Una sonda** que le hace a Qwen unas preguntas de prueba y mide cuánto
   tarda, cuánto cuesta y si respeta el formato. Con eso se elige el modelo.
4. **«Explícamelo con Qwen»** en noticias, calendario, tasas y COT.
5. **El Analizador con Qwen**: los 4 prompts sobre los datos de la app, y lo de
   fuera a petición.
6. **La medición diaria a la vista**: una vez al día el vigía le pregunta por
   todos los pares de cada app con los 4 prompts, se anota lo que dice y se
   resuelve con los precios reales. Con su propia pantalla de resultados.

⚠️ **Lo que falta medir antes del paso 6: el COSTE.** Preguntar cada día por
14 + 18 = 32 pares con varios prompts son muchas consultas. La sonda del paso 3
lo dirá antes de comprometerse.
