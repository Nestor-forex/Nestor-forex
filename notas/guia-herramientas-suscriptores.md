# Guía de las herramientas nuevas — para los suscriptores

> Escrita el 2026-11-13 a petición de Néstor, para la página de venta y para el
> tutorial con imágenes. Cada herramienta dice **dónde está**, **para qué
> sirve**, **cómo se usa paso a paso**, **un ejemplo** y **lo que NO hace**.
>
> Va con las catorce explicaciones para suscriptores que están en `CLAUDE.md`
> (el volumen, TradingView, la correlación, el swap…): aquéllas explican por
> qué la app no exagera; ésta explica cómo usarla.
>
> ⚠️ Antes de publicarla, comprobar que lo que dice sigue siendo verdad en la
> app de ese día. Si una pantalla cambia, esta guía se queda vieja en silencio.

---

## Antes de empezar: qué es esta app y qué no es

Las dos apps (**Swing**, para operaciones de horas a días, e **Intradía**, para
abrir y cerrar el mismo día) son **información para ahorrarte tiempo de
análisis**. Juntan en un sitio lo que de otro modo te llevaría una hora de mirar
gráficos.

**No te dicen qué comprar ni qué vender.** Las direcciones, Stop-loss y
Take-profit que ves en pantalla son **experimentos**: reglas que la app anota
cada día y resuelve con precios reales para saber si funcionan. Están ahí para
que veas cómo evolucionan, no para copiarlas. Cada experimento necesita llegar a
**150 operaciones reales** antes de que su número signifique algo.

La app **no está conectada a tu bróker**: nunca abre, cierra ni bloquea nada.
Las operaciones las abres tú, en tu plataforma.

**En qué app está cada herramienta:**

| Herramienta | Swing | Intradía |
|---|:---:|:---:|
| 1. Mi perfil de riesgo | ✅ | ✅ |
| 2. Tu freno de hoy | ✅ | ✅ |
| 3. El Analizador | ✅ | ✅ |
| 4. Mis pares | ✅ | ✅ |
| 5. Mis avisos | ✅ | ✅ |
| 6. Calendario económico | ✅ | ✅ |
| 7. Noticias de los bancos centrales | ✅ | ✅ |
| 8. «¿Qué significa?» | ✅ | ✅ (sin COT) |
| 9. Lo que señalaron las reglas en pruebas | ✅ | ✅ |
| 10. Lo que mide positivo | ✅ | — |
| 11. Ventas en pausa a la vista | ✅ | — |

Tu perfil de riesgo, tus pares y tus avisos se guardan **en tu cuenta**: valen en
las dos apps y en cualquier teléfono donde inicies sesión.

---

## 1 · Mi perfil de riesgo

**Dónde:** pestaña **Riesgo**, arriba de la calculadora.

**Para qué sirve:** escribir una sola vez tus reglas sobre tu propio dinero.
Con eso la calculadora, el Analizador y el Diario saben cuánto quieres arriesgar
y te avisan cuando te acercas a tu límite.

**Paso a paso:**

1. Abre la pestaña **Riesgo**.
2. En **Capital de la cuenta (USD)** escribe cuánto dinero tienes en tu cuenta
   de trading.
3. En **Riesgo por operación** toca uno de los tres botones —**Conservador**
   (1 %), **Moderado** (2 %) o **Agresivo** (3 %)— o escribe tu propio
   porcentaje (**Personalizado**, entre 0,1 % y 10 %).
4. En **Pérdida máxima en un día (%)** escribe cuánto estás dispuesto a perder
   como mucho en un día. La app propone 3 %.
5. En **Pérdidas seguidas antes de parar** escribe cuántas pérdidas seguidas
   aguantas antes de dejar de operar ese día. La app propone 3.
6. Toca **Guardar mi perfil**. Debajo verás el resumen: cuánto arriesgas por
   operación en dólares, tu freno del día y tus pérdidas seguidas.

**Ejemplo:** capital de 1.000 USD, riesgo Moderado (2 %), pérdida máxima del día
3 %, 3 pérdidas seguidas. La app entiende: *arriesgo 20 USD por operación, y
paro el día si pierdo 30 USD o si encadeno 3 pérdidas*.

**Lo que NO hace:** la app no propone nunca tu capital (solo los dos frenos), y
no bloquea nada en tu bróker. Si un valor guardado es raro, lo deja vacío para
que lo revises, en vez de corregirlo por su cuenta.

---

## 2 · Tu freno de hoy

**Dónde:** pestaña **Diario**, arriba del todo.

**Para qué sirve:** protegerte de ti mismo, que es donde más dinero se pierde.
Te enseña cuánto llevas perdido hoy frente a la regla que tú mismo pusiste.

**Cómo se lee:**

- **Perdido hoy:** por ejemplo **«$15.00 / $30.00»** — llevas 15 de los 30 que
  te permites perder hoy. Cuenta el **neto**: si perdiste 40 y ganaste 25, son
  15 perdidos.
- **Pérdidas seguidas hoy:** por ejemplo **«2 / 3»**.
- **En gris** vas bien. **En ámbar** te queda poco margen (has gastado dos
  tercios del freno, o una pérdida más te deja en el límite). **En rojo** ya
  llegaste: *«Tu propia regla dice que no abras más operaciones hasta mañana.»*

**Paso a paso:**

1. Llena antes tu **perfil de riesgo** (si no, la tarjeta te lleva a él con un
   botón).
2. Anota tus operaciones en el **Diario**. Cuando cierres una, toca **Cerrar** y
   escribe el resultado en dólares.
3. Mira la tarjeta antes de abrir la siguiente.

**Lo que NO hace:** **solo avisa, nunca bloquea.** Solo cuenta las operaciones
cerradas **hoy**, en **este** Diario (Swing e Intradía tienen diarios
separados), con el día de tu teléfono. Las pérdidas seguidas se reinician cada
día.

---

## 3 · El Analizador

**Dónde:** pestaña **Analizar** (la segunda de la barra de abajo).

**Para qué sirve:** convertir quince herramientas sueltas en una sola respuesta.
**Tú** eliges el par y la dirección; la app te calcula en segundos dónde quedan
el Stop-loss, el Take-profit y el lote, y te pone al lado lo que dicen sus
herramientas.

**Paso a paso:**

1. **El par:** toca el par que quieres mirar.
2. **Tu dirección:** toca **COMPRA** o **VENTA**. La app arranca **sin
   dirección a propósito**: sin dirección no calcula nada. La decisión es tuya.
3. **Cómo poner el Stop-loss:** elige uno de los tres métodos:
   - **La de la app:** la misma cuenta que usan las señales de la app.
   - **1,5 ATR a cada lado:** Stop-loss y Take-profit a la misma distancia del
     precio (1,5 veces lo que el par se mueve normalmente).
   - **Soporte y resistencia:** Stop-loss un poco por fuera del soporte (o la
     resistencia) y Take-profit en el otro extremo de las últimas 20 velas.
4. **Qué herramientas ver:** enciende o apaga las que te interesen: soporte y
   resistencia, pivote, tendencia (EMA), RSI, ATR, fuerza de las divisas,
   compresión, Bollinger (%B, solo en Swing), calendario de las dos divisas y
   swap.
5. Lee la tarjeta: **Entrada, Stop-loss y Take-profit** con sus pips, la
   relación riesgo/beneficio, y **el lote y el riesgo en dólares** calculados
   con tu perfil.
6. Si decides operar, toca **Anotar en el Diario**: se lleva el par, la
   dirección, el lote y una nota con los niveles. La operación la abres tú en tu
   bróker.

**Plantillas:** si siempre miras las mismas herramientas con el mismo método,
ponle un nombre y toca **Guardar**. La próxima vez la eliges en **Mis
plantillas** y queda todo puesto. Puedes guardar hasta 10.

**Ejemplo:** EUR/USD · COMPRA · «Soporte y resistencia» · con perfil de 1.000
USD al 2 %. La app enseña la entrada, el Stop-loss medio ATR por debajo del
soporte, el Take-profit en el máximo de 20 velas, cuántos pips hay en cada lado
y el lote para que, si toca el Stop-loss, pierdas 20 USD.

**Avisos que te da:**

- Si el Take-profit queda más cerca que el Stop-loss: *«arriesgas más de lo que
  buscas ganar»*.
- Si con ese método los niveles no salen (el precio está en el extremo), te lo
  dice y te propone otro método, en vez de inventar un número.
- Si ya llegaste a tu freno de hoy, la tarjeta te lo recuerda en rojo.

**Lo que NO hace:** **no elige la dirección** y no es una señal. Todos los
números salen de cuentas que la app ya usa; no hay ninguna fórmula nueva
escondida.

---

## 4 · Mis pares — ver solo lo tuyo, o verlo todo

**Dónde:** se eligen en la pestaña **Avisos** (sección «Mis pares»); el botón
para cambiar de vista está arriba del **Barrido** y del tablero completo.

**Para qué sirve:** no todo el mundo opera igual. Hay quien sigue dieciocho
pares y quien lleva años operando solo EUR/USD. Esto deja la app con lo tuyo.

**Paso a paso:**

1. Abre la pestaña **Avisos**.
2. En **Mis pares**, toca los pares que operas. Toca otra vez uno para quitarlo.
3. Vuelve al **Barrido**. Arriba verás **«Mis pares (3)»** y **«Todos (14)»**:
   toca el que quieras ver.
4. Siempre dice cuántos estás viendo: **«Viendo 3 de 14 pares»**, para que
   nunca te preguntes por qué hay pocas filas.

**En qué te ayuda:** menos ruido al decidir, menos tentación de operar un par
que no conoces, y más rápido por la mañana.

**Lo que NO se recorta nunca:** el **ranking de fuerza** de las ocho divisas.
Ese número sale de comparar cada divisa contra las otras siete; recortarlo a tus
tres pares cambiaría lo que mide. Lo mismo con el calendario, las tasas, el COT y
la correlación. Te lo dice la pantalla, debajo del botón.

---

## 5 · Mis avisos — que el mercado te llame a ti

**Dónde:** pestaña **Avisos**.

**Para qué sirve:** no tener que estar mirando. Viste un nivel en el gráfico, lo
programas y te vas a trabajar; el celular suena cuando el mercado llega ahí.

**Antes del primer aviso:** activa las notificaciones de la app en tu teléfono
(tarjeta **«Avisos al celular»** en la pestaña Barrido). Sin eso no te llega
nada.

**Paso a paso:**

1. Abre la pestaña **Avisos** y baja a **Poner un aviso nuevo**.
2. **Par:** elige el par.
3. **De qué:** elige **Precio**, **RSI** o **Banda de Bollinger (%B)**.
4. **Cuándo:** elige si debe sonar cuando **suba hasta** / **llegue o pase de**
   el nivel, o cuando **baje hasta** / **llegue o baje de** él.
5. **Nivel:** escribe el número.
6. Toca **Añadir el aviso**. Aparece en la lista como una frase que se lee
   sola.

**Ejemplos que se leen como frases:**

> *En EUR/USD, avísame si el **precio sube hasta 1.1550***
> *En GBP/JPY, avísame si el **RSI llega o baja de 30***
> *En USD/CAD, avísame si el **%B llega o pasa de 1***

**Qué significa cada tipo:**

- **Precio:** el precio del par.
- **RSI:** va de 0 a 100. Por debajo de 30 se suele decir que el par se cayó
  fuerte; por encima de 70, que subió fuerte.
- **%B:** dónde está el precio entre las Bandas de Bollinger. **0** es la banda
  de abajo, **1** la de arriba; más de 1 o menos de 0 es que se salió.

**Qué hace cada botón de la lista:**

- **Apagar / Encender:** lo pausas sin borrarlo.
- **Volver a armar:** después de sonar, para que vuelva a avisarte.
- **Borrar:** lo quitas.

**Cómo suena:** cuando pasa lo que pediste, te llega una notificación con el
precio de compra y de venta. **Si no la ves, se repite a los 15 y a los 30
minutos**, y se calla en cuanto abres la pantalla de Avisos. No te persigue.
Puedes tener hasta **20 avisos**.

**Estados que puedes ver:** *Esperando* (todavía no ha pasado), *Apagado*, *Ya
sonó* y, en ámbar, *No va a sonar: le falta un dato* (un aviso antiguo de RSI o
%B: bórralo y vuelve a ponerlo igual).

**Lo que NO hace:** **no son señales y los niveles no te los sugerimos.** Un
aviso te dice **qué pasó**, nunca qué hacer. El precio sale del bróker del
desarrollador de las apps, no del tuyo, y se mira cada 15 minutos, así que
puede llegar con unos minutos de diferencia. Los avisos de **precio** necesitan
que el puente de MetaTrader esté encendido; los de RSI y %B no.

---

## 6 · Calendario económico

**Dónde:** pestaña **Barrido**, arriba de las noticias de los bancos.

**Para qué sirve:** saber **a qué hora no conviene tener una operación
abierta**. Minutos antes de un dato fuerte (inflación, empleo, decisión de
tasas) el precio pega saltos y el spread se abre.

**Cómo se lee:**

- Sin abrirla, si viene algo de impacto alto, avisa: **«USD: dato importante en
  3 h»**.
- Al tocar **VER** salen los datos de las próximas 48 horas agrupados por día:
  la **hora** (la de tu teléfono), la **divisa**, el nombre original del dato con
  su familia entre paréntesis —por ejemplo **«Core PPI m/m (Inflación)»**—, cuánto
  mueve (**Mueve mucho / Mueve algo / Festivo**) y lo **previsto** y lo
  **anterior**.

**La tarjeta no desaparece nunca:**

- Si no hay datos en las próximas 48 horas dice **«Sin datos importantes en las
  próximas 48 horas»** (pasa a menudo los fines de semana).
- Si no se pudo cargar, dice **qué falló**, por ejemplo *«el teléfono no tiene
  conexión a internet»*. Nunca dice «no hay datos» cuando en realidad no pudo
  leerlos.

**Lo que NO hace:** **no dice hacia dónde se va a mover el precio**, solo cuándo
puede haber sacudida. El código de la divisa va en color neutro: rojo no
significa «el dólar está mal».

---

## 7 · Noticias de los bancos centrales

**Dónde:** pestaña **Barrido**, debajo del calendario.

**Para qué sirve:** leer qué publicó un banco central (la Reserva Federal, el
Banco Central Europeo, el Banco de la Reserva de Nueva Zelanda) y el banco ING,
sin ir a buscarlo.

**Cómo se lee:** cada noticia lleva **a la izquierda la divisa** de la que habla
(**USD** para la Fed, **EUR** para el BCE, **NZD** para Nueva Zelanda; en las de
ING, las que nombra el titular), y a la derecha la fecha, la fuente y el
titular. Toca el titular para abrir la noticia original.

**El calendario y las noticias se complementan:** el calendario avisa de lo que
**va a pasar** (el jueves a las 8:30 sale la inflación); las noticias traen lo
que el banco **ya dijo**.

**Lo que NO hace:** los titulares van **tal cual** los publica cada fuente, en
su idioma original, sin resumir ni reescribir, y **nunca con una dirección**. Solo
salen las fuentes cuyas condiciones permiten usarlas en una app; por eso hoy no
están el Banco de Inglaterra, el de Japón ni el Suizo.

---

## 8 · «¿Qué significa?» — para quien empieza

**Dónde:** un botón debajo de cada noticia del **calendario**, de cada par y de
cada tasa en **Tasas de interés y swap**, y de cada fila del **COT** (solo
Swing).

**Para qué sirve:** que un principiante entienda lo que ve. Por ejemplo, en
*«USD Core PPI m/m (Inflación) · Mueve mucho · previsto 0.3 % · anterior 0.7 %»*
el botón explica:

- qué familia de dato es y por qué lo mira el banco central;
- qué significa cada trozo de jerga (**Core**, **PPI**, **m/m**…);
- qué quiere decir «Mueve mucho»;
- si lo previsto sale **más alto, más bajo o igual** que lo anterior, con los dos
  números;
- y que lo que mueve el precio es la **sorpresa**: la diferencia entre lo que
  sale y lo previsto.

En las tasas explica cuánto paga cada divisa y de qué lado juega el swap si
dejas la operación abierta de noche. En el COT, cómo están apostando los fondos
especulativos y con cuántos días de retraso llega ese dato.

**Lo que NO hace:** **solo dice si un dato sale alto o bajo, nunca «compra» o
«vende».** Cada explicación termina con el mismo aviso: *esto no es una señal y
la decisión es tuya*.

---

## 9 · Lo que señalaron las reglas en pruebas

**Dónde:** pestaña **Historial**, tarjeta plegable.

**Para qué sirve:** acompañar los experimentos desde dentro. Además de cuánto
aciertan, ves **las señales que dieron**: qué par, hacia dónde, con qué
Stop-loss, Take-profit y relación riesgo/beneficio, y la fecha en que salieron.
Cada una lleva la etiqueta de su regla y si el swap juega a favor o en contra.

**Paso a paso:** abre **Historial**, toca **VER** en la tarjeta y lee la lista.
Más arriba, en los porcentajes de cada regla, verás cuántas operaciones reales
lleva de las 150 que hacen falta y cuánto puede moverse ese número por
casualidad.

**Lo que NO hace:** **esto no son propuestas.** El aviso va antes de cualquier
número. Una regla que todavía no ha señalado nada también sale, con su frase,
para que no parezca que falta.

---

## 10 · Lo que mide positivo (solo Swing)

**Dónde:** pestaña **Barrido** → **Ver tablero completo →**, al final.

**Para qué sirve:** enseñar lo único que ha pasado un listón completo en el
banco de pruebas —la app de Swing **solo con los pares que llevan dólar**—, con
sus números medidos y las señales de hoy separadas en ese montón y en el resto.

**Lo que NO hace:** **no cambia lo que la app propone.** Se encontró mirando los
mismos cinco años con los que se midió, así que solo el registro hacia adelante
dirá si es de verdad. Por eso va aparte, con su advertencia, y la app sigue con
sus 14 pares.

---

## 11 · Ventas en pausa, a la vista (solo Swing)

**Dónde:** en el tablero completo, dentro de **«Mejores para vender»**, y en el
reporte diario.

**Para qué sirve:** las señales de venta de la app están **en pausa** desde
agosto de 2026 porque medían peor. Antes, si un par pasaba el umbral para
vender, no aparecía en ningún sitio. Ahora se ven sus niveles con la etiqueta
**«VENTA EN PAUSA»** y un aviso delante.

**Lo que NO hace:** **no se reactivan.** La app no las propone y el celular no
suena por ellas. Se enseñan para que veas lo que la app habría dicho y se siguen
midiendo; vuelven solo si el banco de pruebas da positivo en las ventas.

---

## Una sola frase para recordar todo

> **La app te ahorra el tiempo de mirar; la decisión y la operación son tuyas.**
> Nada de lo que ves aquí es asesoría financiera. Operar en Forex tiene riesgo
> alto y puedes perder tu dinero.
