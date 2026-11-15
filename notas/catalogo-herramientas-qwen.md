# Catálogo de las dos apps, para Qwen

Escrito el 2026-11-15 a petición de Néstor: *«Qwen debe tener total acceso para
que vea cada una de las herramientas o indicadores de las apps para que sepa
qué hacer cuando se le pida que haga algo con cualquier cosa de las apps»*.

Este documento es la **fuente** de lo que Qwen tiene que saber. En la fase 5 su
contenido se resume dentro de las instrucciones del puente
(`puente-qwen/worker.js`, `SISTEMA_COMUN`), que es **un solo archivo** que se
pega en Cloudflare y no puede leer otros. Si una herramienta cambia, se cambia
aquí **y** allí, y la versión de las instrucciones (`VERSION`) sube de número.

> **Cada número de una herramienta lo calcula la app.** Qwen lo recibe
> ya calculado (función `analisisParaQwen`), lo explica y lo cruza con lo que
> lea fuera. **Nunca lo cambia ni se lo inventa.**

---

## 0. Las reglas que valen para todo

1. Las apps son de **INFORMACIÓN**. Lo que llaman «señales» son experimentos
   que se están midiendo; **ninguno ha pasado todavía su listón**.
2. **Nunca «compra» ni «vende»** como consejo. Se puede decir qué propone una
   regla de la app, siempre aclarando que es un experimento.
3. Todo porcentaje de acierto va con su **margen (±)** y con cuántas
   operaciones lo sostienen. Con menos de 150 operaciones no significa nada
   firme.
4. **No mezclar** el backtest (simulación sobre el pasado) con el registro real
   (lo que la app anotó de verdad). Decir siempre de cuál es cada número.
5. Lo que una herramienta **no** dice, no se le hace decir: el calendario no
   dice hacia dónde irá el precio, la actividad no dice dirección, el COT no
   dice qué par operar, la correlación no dice qué abrir.
6. **Nunca nombrar el bróker** del desarrollador. Se dice «una cuenta real del
   desarrollador de la app».
7. Terminar con el aviso: no es asesoría financiera; la decisión es del
   usuario.

## 1. Las dos apps

| | **Swing** | **Intradía** |
|---|---|---|
| Para qué | operaciones de horas a días | abrir y cerrar el mismo día |
| Velas | **diarias** (máximo, mínimo y cierre), sin sábados, domingo unido al lunes | **de una hora** |
| Pares | 14 (todos pedidos directos) | 18 (7 contra el dólar directos, 11 cruces derivados) |
| Tendencia de la app | EMA20 / EMA50 | EMA9 / EMA21 |
| Fuerza relativa | ventanas de 1, 5 y 20 días | ventanas de 1, 4 y 24 horas |
| Extra | COT, oro, correlación, «comprar la caída» | puntos pivote de sesión, modo rango |
| Cuándo se actualiza | el vigía una vez al día + barrido a las 11:20 y 19:20 UTC | cada hora |
| Lo que mide hoy | **−0,04** por unidad de riesgo (vara neutra 1:1) | **−0,13** |

Fuente de precios: **Twelve Data**. El spread y la actividad salen del puente
de MT5, conectado a una cuenta real del desarrollador.

## 2. Cómo decide la app una señal (las dos)

1. **Fuerza relativa**: cada divisa se compara contra las otras siete (escala
   0-10, que es un ORDEN: la más débil siempre vale 0 y la más fuerte 10).
2. **Diferencia de fuerza** entre las dos divisas del par (`dif`, en la escala
   cruda). Tiene que pasar el **umbral de fuerza** (0,5 en Swing; en Intradía
   0,5 × el factor de la hora, que sube en el solape de Londres y Nueva York).
3. **Tendencia** (en Swing basta precio sobre la EMA20 para comprar).
4. Niveles: Stop-loss bajo el mínimo de 10 velas menos medio ATR;
   Take-profit en el máximo de 20 velas o 2 ATR, lo más lejano.
5. **Las ventas de la app están en pausa** desde el 2026-08-12: se anotan pero
   no se proponen.
6. **Los avisos al celular de las señales de la app están en pausa.**

## 3. Las herramientas del Analizador (pestaña «Analizar»)

El usuario elige par, dirección y cómo poner el Stop-loss. **La app nunca
elige la dirección.** Métodos de Stop-loss: «el de la app», «simétrico»
(1,5 ATR a cada lado, R/B 1:1) y «estructura» (medio ATR por fuera del extremo
de 20 velas). El lote sale del **perfil de riesgo** del usuario.

| herramienta | qué enseña | dónde | lo que NO dice |
|---|---|---|---|
| `niveles` | soporte y resistencia (extremos de 20 velas) | las dos | que el precio vaya a rebotar ahí |
| `pivote` | pivote clásico y sus niveles (en Swing, de la penúltima vela) | las dos | dirección |
| `tendencia` | precio contra sus EMA de la app | las dos | que la tendencia siga |
| `rsi` | RSI de Wilder (14) | las dos | que esté «para comprar»; el RSI como filtro se midió y en Swing no ayuda |
| `atr` | cuánto se mueve el par normalmente (ATR y ATR%) | las dos | dirección |
| `fuerza` | la fuerza 0-10 de las dos divisas y su diferencia | las dos | que 10 contra 0 sea mucha diferencia (ver `dif`) |
| `compresion` | ATR de ahora / ATR de antes (estrechado o ensanchado) | las dos | dirección; cortes por percentil de cada app |
| `bollinger` | bandas 20/2 y su %B (0 abajo, 1 arriba) | las dos | señal; el toque de banda se mide en la sombra |
| `calendario` | noticias de las dos divisas en las próximas 48 h | las dos | hacia dónde moverá el precio |
| `swap` | tasas de los bancos centrales y de qué lado juega el swap | las dos | el swap exacto del bróker (no se publica) |
| `spread` | spread real, spread / Stop-loss, actividad (tick volume) | las dos | dirección; la actividad NO es volumen |
| `cot` | cómo están posicionados los fondos (CFTC), con su fecha | solo Swing | qué par operar; como filtro se midió dos veces y suspendió |
| `oro` | correlación del oro con el par y su cambio en 20 sesiones | solo Swing | causa; mide relación pasada |
| `correlacion` | pares con correlación ≥ 0,7 con éste | solo Swing | qué abrir; sirve para ver cuándo dos operaciones son la misma apuesta |
| `estacionalidad` | recorrido típico de hoy, este mes (y esta hora) y meses en verde | las dos | dirección; la tabla por mes lleva ±26 |
| `diario` | las operaciones del usuario en ese par | las dos | que sus resultados sigan igual (lleva ±) |
| `fvg` | huecos de valor justo vivos y su distancia | las dos | dirección; en Swing la regla FVG midió −0,055 |
| `medias` | SMA 20/50/200 y EMA (Swing 20/50/200; Intradía 9/21/50/200) | las dos | señal; la EMA necesita 3× su periodo de velas |
| `fibonacci` | 23,6 / 38,2 / 50 / 61,8 / 78,6 % del último movimiento | las dos | que el precio vaya a respetar un nivel |

## 4. Las tarjetas de información (pestaña Barrido)

- **Qué es esta app** — que nada es señal para copiar.
- **Calendario económico** — ForexFactory, próximas 48 h, «¿Qué significa?».
- **Noticias de los bancos centrales** — Fed, BCE, Nueva Zelanda e ING, titular
  tal cual con su divisa.
- **Lo que cuesta abrir la operación** — spread y actividad del puente.
- **Tasas de interés y swap** — BIS, con fecha de cada dato y su tendencia.
- **COT** (Swing) — fondos especulativos, con percentil de 156 semanas.
- **Oro** (Swing) — precio y correlación con los 14 pares.
- **Estacionalidad** — por hora (Intradía), día y mes, con su margen.
- **Avisos al celular**, y para el administrador **Avisos de los
  experimentos**.

En el **tablero completo**: tabla de los pares con su clima, correlación entre
pares, compresión y Fibonacci, glosario, «Lo que mide positivo» (Swing), y las
listas de señales con su aviso.

## 5. Las reglas en pruebas (experimentos)

Ninguna se propone como señal. Cada una necesita **150 operaciones reales**.

**Swing**

| regla | qué hace | geometría |
|---|---|---|
| Señales de la app | ver §2 | la de la app |
| Ventas en pausa | las ventas de la app, anotadas sin proponer | la de la app |
| **Comprar la caída** | compra el mínimo de 10 días sin esperar rebote (ver `regla-comprar-la-caida.md`) | 1,5 ATR, 1:1 |
| Reversión | compra lo débil y vende lo fuerte con el RSI estirado (40) | 1,5 ATR, 1:1 |
| Toque de banda de Bollinger | el precio se sale de su banda → apuesta a que vuelve | 1,5 ATR, 1:1 |
| Ruptura de estructura | el precio cierra más allá del último pivote (8 velas) | stop en el pivote, 1:1 |

**Intradía**: los dos modos de la app (**tendencia** y **rango**) y el
**retroceso**, que corre en la sombra.

**Cómo se comparan:** en unidades de riesgo, nunca en pips (ganada = su R/B,
perdida = −1). La pestaña Historial dice cuál va primera, y lo **calcula**.

**Familias medidas que NO funcionan** (no proponerlas como solución): filtro de
RSI en Swing, ADX, confluencia de marcos, barrido de liquidez, COT como filtro,
compresión como filtro, carry como filtro, Bollinger + RSI, FVG, Ichimoku,
mover el stop o alargar el objetivo, breakeven.

## 6. Lo del usuario

- **Mi perfil de riesgo**: capital, % de riesgo por operación (1/2/3 % o el
  suyo), pérdida máxima del día y pérdidas seguidas.
- **Tu freno de hoy**: cuánto lleva perdido hoy y cuántas pérdidas seguidas,
  contra su perfil. **Solo avisa, nunca bloquea** (la app no está conectada al
  bróker).
- **Diario**: sus operaciones; se pueden importar del informe de MT4/MT5.
- **Mis pares**: ver todos o solo los suyos (el ranking de fuerza no se filtra).
- **Mis avisos**: hasta 20 avisos de precio, RSI o %B que él mismo programa.
- **Calculadora de riesgo**: lote a partir del Stop-loss y su perfil.

## 7. Lo que Qwen puede hacer con todo esto

- Explicar cualquier herramienta, tarjeta o regla en palabras sencillas.
- Revisar un plan del usuario contra su propio perfil de riesgo.
- Cruzar los datos de la app con información de internet **si el usuario lo
  pide**, citando de dónde sale cada cosa.
- **Nunca**: cambiar un número de la app, elegir la dirección por el usuario,
  dar un acierto sin su ±, nombrar el bróker o presentar un experimento como
  señal.
