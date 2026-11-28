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
2. En **Moneda de tu cuenta en el bróker** toca **Dólares (USD)** o **Euros
   (EUR)**: la moneda en que tu bróker te lleva la cuenta. Todo lo que es
   dinero en las apps (el capital, el riesgo, los frenos, el Diario y el dinero
   de la práctica) va en esa moneda. Los experimentos no cambian: se miden en
   pips y en R, que valen igual en las dos. Si cambias de moneda, lo que ya
   anotaste en el Diario no se convierte.
3. En **Capital de la cuenta** escribe cuánto dinero tienes en tu cuenta
   de trading, en la moneda que elegiste.
4. En **Riesgo por operación** toca uno de los tres botones —**Conservador**
   (1 %), **Moderado** (2 %) o **Agresivo** (3 %)— o escribe tu propio
   porcentaje (**Personalizado**, entre 0,1 % y 10 %).
5. En **Pérdida máxima en un día (%)** escribe cuánto estás dispuesto a perder
   como mucho en un día. La app propone 3 %.
6. En **Pérdidas seguidas antes de parar** escribe cuántas pérdidas seguidas
   aguantas antes de dejar de operar ese día. La app propone 3.
7. Toca **Guardar mi perfil**. Debajo verás el resumen: cuánto arriesgas por
   operación en tu moneda, tu freno del día y tus pérdidas seguidas.

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
   compresión, Bollinger (%B, solo en Swing), calendario de las dos divisas,
   swap, **spread y actividad, COT, oro, correlación, estacionalidad y tu
   diario** (ver abajo qué dice cada una). Puedes encender solo dos o tres, o
   todas: la tarjeta junta las que elijas.
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

### Las seis herramientas que se sumaron al Analizador (2026-11-15)

Con estas seis, la tarjeta junta **todas** las herramientas de información de
la app. Cada una sale en su propio bloque, con una nota corta debajo: la nota
no es adorno, es lo que impide leer el número al revés.

**Spread y actividad** · *las dos apps*
- **Qué te dice:** cuánto cuesta abrir ese par (el spread, en pips) y, sobre
  todo, **qué parte de tu Stop-loss se come ese coste**. 1,4 pips sobre un
  Stop-loss de 38 son el 3,7 % de lo que arriesgas; sobre uno de 15 serían casi
  el 10 %.
- **Actividad:** qué tan movido está ese par hoy comparado con el más movido
  del momento (100 % = el más activo).
- **Para qué te sirve:** saber si el coste de entrar pesa mucho en esa
  operación, y si hay gente negociando el par o está dormido.
- **Lo que NO es:** no es el spread de tu bróker, sino el de una cuenta real
  del desarrollador de la app (el tuyo puede ser distinto). La actividad cuenta
  cuántas veces cambió el precio: **no es volumen y no dice hacia dónde**. Si
  el dato del bróker es viejo, la tarjeta te dice de hace cuánto es.

**COT (fondos)** · *solo Swing*
- **Qué te dice:** si los grandes fondos especulativos están **comprados (+)**
  o **vendidos (−)** en cada una de las dos monedas del par, en % de todos los
  contratos abiertos, con la fecha del informe.
- **Para qué te sirve:** saber si una apuesta ya está muy llena: cuando casi
  todos están del mismo lado, queda poca gente por entrar.
- **Lo que NO es:** no dice hacia dónde irá el precio, y el informe llega con
  varios días de retraso. Lo medimos como filtro de señales dos veces y **no
  sirvió**: aquí es solo información.

**Oro** · *solo Swing*
- **Qué te dice:** cuánto se mueve el oro junto con ese par (de −1 a +1) y
  cuánto se movió el oro en las últimas 20 sesiones.
- **Para qué te sirve:** muchas veces el oro sube cuando el dólar baja. Si el
  par que miras va muy pegado al oro, lo que haga el oro te da una pista de
  contexto.
- **Lo que NO es:** moverse juntos no quiere decir que uno mueva al otro, y no
  dice el futuro: mide los últimos tres meses.

**Correlación** · *solo Swing*
- **Qué te dice:** qué otros pares se mueven **casi igual** que éste (o casi
  exactamente al revés).
- **Para qué te sirve:** evitar abrir sin querer dos veces la misma apuesta. Si
  EUR/USD y GBP/USD van a +0,90, comprar los dos es como comprar uno el doble
  de grande. Si van al revés, se anulan y pagas dos veces el coste para nada.
- **Si sale «ningún par»:** ese par va bastante por su cuenta, que también es
  un dato.

**Estacionalidad** · *las dos apps*
- **Qué te dice:** cuánto suele moverse ese par **este día de la semana**,
  **este mes** (y, en Intradía, **a esta hora**) comparado con lo normal.
  «×1.09» quiere decir que se mueve un 9 % más que la media. También dice
  cuántas veces un mes como éste terminó en verde, con su ±.
- **Para qué te sirve:** elegir el **momento**: un día o una hora en que el par
  suele moverse poco puede no alcanzar tu Take-profit.
- **Lo que NO es:** mide **cuánto** se mueve, nunca **hacia dónde**. Y la parte
  de «meses en verde» se apoya en muy pocos años, así que su ± ronda los 23
  puntos: casi no dice nada, y la tarjeta te lo advierte. En fin de semana la
  fila del día no sale, porque no hay mercado.

**Mi diario** · *las dos apps*
- **Qué te dice:** cómo te ha ido **a ti** con ese par (operaciones cerradas,
  % de acierto con su ± y resultado en dólares) y cuántas operaciones tienes
  abiertas que comparten alguna moneda con él.
- **Para qué te sirve:** recordarte tu propia experiencia con el par antes de
  repetir, y avisarte si vas a sumar una apuesta más grande sin darte cuenta
  (por ejemplo, ya tienes USD/JPY abierto y ahora miras EUR/USD: los dos llevan
  dólar).
- **Lo que NO es:** con pocas operaciones el ± es enorme. Un 50 % sobre 2
  operaciones no te dice nada todavía.

**Por qué en Intradía no salen el COT, el oro ni la correlación:** esa app no
tiene esos datos, y la tarjeta no ofrece un botón para que diga siempre «sin
dato».

**FVG — brecha de valor justo** · *las dos apps* (se sumó el 2026-11-15)

- **Qué te dice:** los «huecos» que dejó el precio en las últimas 20 velas:
  tramos por los que pasó tan rápido que nadie negoció. De cada uno: si es
  alcista o bajista, entre qué dos precios está, a cuántos pips queda del precio
  de ahora (por encima, por debajo o «el precio está dentro ahora»), si ya se
  tocó y hace cuántas velas se formó.
- **De dónde viene:** de ICT (Inner Circle Trader). Muchos traders esperan que
  el precio vuelva a rellenar esos huecos y que, al volver, siga en la dirección
  del salto.
- **Lo que medimos, y te lo decimos:** en la app de swing probamos esa entrada
  —comprar o vender el primer regreso al hueco— sobre unos 5 años de mercado
  real, con un listón escrito **antes** de medir. **No ganó**: 2.007 operaciones,
  acertó el 48 % y perdió unos 5 centavos y medio por cada dólar arriesgado.
  Perdía incluso **antes** de pagar los costes, y en las dos mitades del
  periodo. En la app de intradía todavía no está medido, y la tarjeta lo dice.
- **Para qué te sirve entonces:** para saber **dónde** hay zonas que mucha gente
  mira. Si tu Stop-loss o tu Take-profit cae justo dentro de un hueco, es bueno
  saberlo antes de abrir.
- **Lo que NO es:** no te dice hacia dónde irá el precio, y «alcista» o
  «bajista» es el nombre del hueco, no una recomendación. En los cruces de
  Intradía los máximos y mínimos son aproximados, y la tarjeta lo avisa.

> **Por qué te contamos que no ganó:** casi todos los que enseñan el FVG te
> dicen cómo dibujarlo y ninguno te dice cuánto ganó. Nosotros lo medimos, salió
> mal, y aun así te dejamos la herramienta, porque saber dónde están los huecos
> es información útil aunque operarlos a ciegas no lo sea.

**Bandas de Bollinger** · *las dos apps* (en Intradía desde el 2026-11-15)

- **Qué te dice:** tres líneas alrededor del precio, calculadas con las últimas
  20 velas de la app (días en Swing, horas en Intradía): la **media** (SMA 20) y
  dos **bandas** a dos desviaciones por encima y por debajo. Te da los tres
  precios, el **ancho** en pips y el **%B**: 0 es la banda de abajo, 1 la de
  arriba, 0,5 la media; más de 1 o menos de 0 es que el precio se salió.
- **Para qué te sirve:** ver de un vistazo si el precio está estirado respecto
  de lo normal en las últimas 20 velas, y si las bandas están estrechas (poco
  movimiento) o anchas.
- **Lo que NO es:** no dice hacia dónde irá. En Swing medimos la regla de
  «tocar la banda de abajo y comprar»: dio un poco a favor contando solo el
  spread y en contra contando el swap. Por eso corre en pruebas y no se propone.

**Medias móviles (SMA y EMA)** · *las dos apps* (2026-11-15)

- **Qué te dice:** el valor de cada media y a cuántos pips está el precio, por
  encima o por debajo. La **SMA** es la media simple de las últimas velas; la
  **EMA** da más peso a las más recientes.
- **Los periodos de cada app:** en **Swing** cada vela es un día — SMA y EMA de
  20 (un mes de mercado), 50 (un trimestre) y 200 (casi un año). En
  **Intradía** cada vela es una hora — SMA 20, 50 y 200, y EMA 9, 21, 50 y 200.
- **«faltan velas»:** la EMA de 200 necesita unas 600 velas para salir bien y
  las apps bajan unas 300. En vez de enseñarte un número distinto del de
  cualquier gráfico, la tarjeta te dice que falta.
- **Lo que NO es:** que el precio esté encima de una media no quiere decir que
  vaya a seguir subiendo. Ningún número va de verde o de rojo por eso.

**Fibonacci** · *las dos apps* (2026-11-15)

- **Qué te dice:** toma el último movimiento de las últimas 20 velas (días en
  Swing, horas en Intradía), desde su punto más bajo hasta el más alto o al
  revés, y marca los niveles al 23,6, 38,2, 50, 61,8 y 78,6 % del recorrido.
  De cada nivel te da el precio y a cuántos pips queda, y marca el más cercano.
- **Para qué se usa:** cuando el precio sube mucho y luego retrocede, muchos
  traders miran el 38,2, el 50 y el 61,8 % para ver hasta dónde podría volver
  antes de seguir, y ponen ahí entradas, Stop-loss o Take-profit.
- **Si el movimiento es muy pequeño** (menos de 2 ATR), la tarjeta no dibuja
  niveles y te lo dice: serían cinco números pegados que no significan nada.
- **Lo que NO es:** no hay prueba de que el precio respete esos niveles por sí
  solo. A veces los respeta porque mucha gente pone órdenes ahí. No dice hacia
  dónde irá el precio.

> **La frase para el suscriptor:** el Analizador **no piensa por ti**. Junta en
> una sola tarjeta lo que antes tenías que ir a buscar a diez pantallas, y te
> pone al lado de cada número lo que ese número **no** dice.

---

## 4 · Mis pares — ver solo lo tuyo, o verlo todo

**Dónde:** arriba del **Barrido**, con el botón **«Cambiar mis pares»** (desde el
2026-11-17), o en la pestaña **Avisos** (sección «Mis pares»). Es la misma lista
en los dos sitios. El botón para cambiar de vista está arriba del **Barrido** y
del tablero completo.

**Para qué sirve:** no todo el mundo opera igual. Hay quien sigue dieciocho
pares y quien lleva años operando solo EUR/USD. Esto deja la app con lo tuyo.

**Paso a paso:**

1. En el **Barrido**, toca **«Cambiar mis pares»** (o **«Elegir mis pares»** si
   todavía no tienes lista).
2. Toca los pares que operas. Toca otra vez uno para quitarlo.
3. Pulsa **«Guardar mi lista»**. Arriba verás **«Mis pares (3)»** y
   **«Todos (14)»**: toca el que quieras ver.
4. Siempre dice cuántos estás viendo: **«Viendo 3 de 14 pares»**, para que
   nunca te preguntes por qué hay pocas filas.

**En qué te ayuda:** menos ruido al decidir, menos tentación de operar un par
que no conoces, y más rápido por la mañana.

**Para los dos tipos de trader:** hay quien opera siempre el mismo par, porque
así lo sigue de cerca todos los días, y hay quien prefiere analizar pares
distintos cada día. La app sirve para los dos: puedes dejar tu lista fija, o
cambiarla en un minuto el día que quieras probar con otras divisas, y volver a
la de antes cuando quieras. No se pierde nada.

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

## 12 · Modo práctica — operar sin dinero

**Dónde:** se crea en la pestaña **Analizar** con el botón **«Practicar esta
operación (sin dinero)»**, y se sigue en la pestaña **Diario**, en la tarjeta
**«Modo práctica»**. En las dos apps.

**Para qué sirve:** para probar una forma de operar **sin arriesgar dinero**.
Armas la operación como si fuera de verdad y la app la sigue sola con los
precios reales hasta que toca el Stop-loss o el Take-profit. Con el tiempo ves
si esa forma de operar funciona antes de ponerle dinero. Es lo que hacen los
traders con experiencia con cualquier idea nueva, y es la mejor forma de
empezar si estás aprendiendo.

**Paso a paso:**

1. Ve a **Analizar**, elige el par, **tu** dirección y cómo poner el Stop-loss.
2. Mira la tarjeta: entrada, Stop-loss, Take-profit y la relación
   riesgo/beneficio.
3. Pulsa **«Practicar esta operación (sin dinero)»**. Sale el aviso *«Guardada
   en el modo práctica»* y un enlace para verla en el Diario.
4. No tienes que hacer nada más: la app la revisa cada 15 minutos con los
   precios reales y la cierra sola.
5. En el Diario, la tarjeta **«Modo práctica»** te enseña las abiertas, las
   resueltas y tus números.

**Cómo se lee:**

- **Acierto** con su **±**: cuánto puede moverse solo por casualidad (ver la
  explicación del margen de error). Con pocas operaciones es grande.
- **Resultado** y **Por operación**, en **R**. **1 R es lo que arriesgabas.**
  Perder es siempre **−1 R**; ganar es lo que daba tu Take-profit (con una
  relación 1:2, ganar es **+2 R**).
- **Neto (con spread y swap)** y **En dinero** (desde el 2026-11-17): la app
  descuenta lo que cuesta operar de verdad, con el spread y el swap de **una
  cuenta real del desarrollador de la app** (no los de tu bróker):
  - si entraste con el puente de MT5 encendido, la entrada ya fue al precio de
    compra (ASK) o de venta (BID), así que **el spread ya va dentro**;
  - si entraste con el precio de Twelve Data, se resta el spread de la última
    foto de MT5 de ese par, y se dice de qué hora es;
  - el **swap** se cobra (o se paga) por cada noche que la operación siguió
    abierta: a las 22:00 UTC de lunes a viernes, triple el día que dice el
    bróker.
  Cada operación enseña la cuenta entera: **Bruto · Spread · Swap · Neto**. Si
  falta un dato, dice **«sin dato»** en esa línea y no inventa un número. Si
  llenaste tu **perfil de riesgo**, sale además el neto en dólares.

**La gráfica de cada operación** (desde el 2026-11-17): debajo de cada operación
hay un botón **«Ver la gráfica»**. Dibuja las últimas 20 velas del par y, encima,
lo que elegiste: la **entrada** (blanca), el **Stop-loss** (rojo) y el
**Take-profit** (verde), con una franja roja hasta el Stop-loss y una verde
hasta el Take-profit. La línea vertical punteada es la vela en la que entraste,
y cuando la operación termina sale un círculo de color donde tocó el nivel.
Son **las mismas velas con las que la app decide** si ganó o perdió, así que lo
que ves es exactamente lo que se juzgó.

Desde el 2026-11-17 la gráfica se parece a la de una plataforma:
- **Velas completas** (apertura, máximo, mínimo y cierre) en blanco y negro: la
  que sube va hueca y la que baja rellena. No van en verde y rojo porque en esta
  gráfica el rojo es tu Stop-loss y el verde tu Take-profit. Si el barrido
  todavía no trae la apertura de las velas, se dibujan máximo y mínimo y la
  línea de cierres, sin inventar la apertura.
- **Todas las herramientas**: el soporte y la resistencia, el pivote, las
  medias, las bandas de Bollinger, los niveles de Fibonacci y los huecos (FVG),
  tal como estaban **en el momento de crear la operación**. Debajo hay un botón
  por cada una para enseñarla u ocultarla. Desde el 2026-11-17 se guardan
  todas, las tengas encendidas en el Analizador o no; las operaciones de antes
  solo traen las que tenías encendidas al crearlas. Si un nivel queda muy lejos (una EMA 200, por ejemplo),
  sale como una flecha en el borde con su precio, para no aplastar las velas.
- **Caducada:** la app no pudo mirarla a tiempo y esas velas ya no se ven. No
  cuenta ni como ganada ni como perdida.
- **No válida:** el precio de entrada era viejo o no estaba dentro de la vela,
  o los niveles estaban al revés. No cuenta.

**Cómo decide la app, para que sea justo:**

- Solo cuentan las velas que **empiezan después** de crear la operación. Así
  nadie puede ver que el precio ya llegó a un nivel y «practicar» con el precio
  de antes.
- Si una misma vela toca el Stop-loss **y** el Take-profit, cuenta como
  **perdida**: la vela no dice cuál pasó primero y se elige el peor caso.
- En Intradía, en los cruces (pares sin dólar), los máximos y mínimos son
  aproximados y un poco más anchos, así que es algo más fácil que cuenten como
  perdida.

**Lo que NO hace:**

- **No es dinero real ni una señal.** La dirección la eliges tú.
- **No puedes escribir el resultado a mano**, ni borrar una operación ya
  resuelta. Solo se puede borrar una abierta. Si se pudiera borrar las
  perdidas, el número no diría nada.
- Como mucho **20 abiertas** a la vez.

---

## 13 · Tus insignias — premios por disciplina, nunca por ganar

**Dónde:** pestaña **Diario**, tarjeta **«Tus insignias»**. En las dos apps.

**Para qué sirve:** los traders que duran no son los que más aciertan: son los
que repiten buenos hábitos. Las insignias te marcan el camino de esos hábitos,
sobre todo si estás empezando.

**Las nueve:**

1. **Sabes cuánto arriesgas** — completa tu perfil de riesgo.
2. **Sabes qué operas** — elige tu lista de pares.
3. **Tu método por escrito** — guarda una plantilla en el Analizador.
4. **Que el mercado te llame** — programa un aviso propio.
5. **Diario constante** — anota 10 operaciones, ganes o pierdas.
6. **Escribes por qué** — anota 10 operaciones con una nota de por qué entraste.
7. **Analista constante** — abre el tablero completo 5 días hábiles seguidos.
   Los fines de semana ni cuentan ni cortan la racha (el mercado está cerrado).
8. **Respetas tu freno** — 5 días sin abrir otra operación después de tocar tu
   freno del día o tus pérdidas seguidas. Un día en que no lo tocas también
   cuenta.
9. **Practicas sin dinero** — termina 5 operaciones del modo práctica, ganes o
   pierdas.

**Lo que NO hace:** **ninguna premia ganar dinero, acertar ni operar más.**
Premiar eso empujaría a arriesgar más para conseguir la medalla. Las insignias
se calculan con tus datos cada vez, así que si borras operaciones la cuenta
baja. Lo único que se guarda aparte son los días en que abriste el tablero
(los últimos 14), porque ningún otro dato lo dice.

## Exportar tus resultados y tus análisis

**La tabla de tu práctica:** pestaña **Diario** → **Modo práctica** → abajo,
**«Descargar mis resultados (tabla)»**. Se baja un archivo que abren Excel y
Google Sheets, con TODAS tus operaciones de práctica (también las abiertas y
las que no se pudieron juzgar), sus niveles y lo que dieron en bruto y en neto.
Los números van con la coma o el punto de tu idioma. Una casilla vacía es un
dato que no se sabe, nunca un cero.

**Tu análisis:** pestaña **Analizar** → elige par, dirección y método → al
final, **«Compartir o guardar este análisis»**. En el celular abre el menú
para mandarlo por WhatsApp o correo; en la computadora descarga un texto. Va
con el par, la dirección, el precio, el Stop-loss y el Take-profit con sus
pips, el R/B, el lote y las herramientas principales, y **termina siempre con
el aviso de que no es una señal**, por si alguien lo reenvía.

---

## 14 · De dónde sale el precio que ves (las dos apps)

**Dónde:** debajo del título del Barrido, en el tablero completo y en la tarjeta
del Analizador.

**Qué dice:** el precio llega por uno de estos tres caminos, y la app te dice
siempre por cuál:

- **Al segundo:** «Precio al segundo de MT5, de una cuenta real del
  desarrollador». Es el BID y el ASK de un bróker de verdad, actualizado cada
  segundo mientras el precio se mueve. Funciona **mientras el computador del
  desarrollador tenga MT5 abierto y su puente encendido**.
- **Foto de cada 5 minutos:** si el precio al segundo no llega, la app usa la
  foto que el mismo puente deja cada 5 minutos: «Precio de MT5… foto de las
  9:49 p. m. (hace 3 min)». Va siempre con su hora.
- **Twelve Data:** con el puente apagado, el cierre de la última vela del
  barrido. Dice cada cuánto se actualiza en esa app (Swing dos veces al día;
  Intradía una vez por hora) y **por qué** se ve ese: el puente está apagado, o
  su última foto es demasiado vieja.

La app cambia de uno a otro **sola**, sin que tengas que tocar nada.

**Al abrir la app:** durante uno o dos segundos verás «Conectando con el precio
al segundo de MT5…». Es el tiempo de preguntar si el puente está encendido. La
app no enseña ningún precio como «el de ahora» hasta saberlo, así que la línea
no cambia de mensaje a los pocos segundos. Si no hay respuesta en 6 segundos
(por ejemplo, sin internet), pasa a la foto de 5 minutos o a Twelve Data y te
dice cuál. Mientras dice «conectando», el Analizador no deja guardar una
práctica.

**En el Analizador:** con MT5, la entrada es la de un bróker de verdad: **el
ASK si compras y el BID si vendes**, y todas las cuentas de la tarjeta salen de
ahí. Con Twelve Data, del cierre, que no trae ASK ni BID, y la tarjeta lo dice.

**Lo que NO es — y conviene leerlo antes de operar:**

- **No es el precio de tu bróker.** Es el de una cuenta real del desarrollador.
  El tuyo puede diferir unos décimos de pip y su spread puede ser otro.
- **La operación la abres en la plataforma de tu bróker, nunca en esta app.**
  Esta app sirve para decidir (qué par, dónde va el stop, de qué tamaño); el
  precio con el que entras es el que te da tu bróker en ese momento.
- **En el minuto en que sale una noticia fuerte**, el precio puede moverse
  20-50 pips en segundos. Ahí no se entra mirando ninguna app de información:
  se mira la plataforma del bróker.

---

## 15 · Vista vertical u horizontal (las dos apps)

**Dónde:** en la cabecera, al lado del idioma: un botón con el dibujo de una
pantalla.

**Qué hace:** cambia cómo se acomoda la app.
- **Vertical:** una columna, como un teléfono (así funcionó siempre).
- **Horizontal:** aprovecha el ancho de un PC, una laptop o una tableta: las
  tarjetas se reparten en columnas.

**Lo que hay que saber:** en un PC o una laptop la pantalla no gira; lo que
cambia es el acomodo. En un teléfono o una tableta, gira el aparato; si la app
está instalada en Android, intenta girar la pantalla sola. La elección se
guarda en ese aparato.

---

## Una sola frase para recordar todo

> **La app te ahorra el tiempo de mirar; la decisión y la operación son tuyas.**
> Nada de lo que ves aquí es asesoría financiera. Operar en Forex tiene riesgo
> alto y puedes perder tu dinero.

---

## Laboratorio y Seguimiento hacia adelante (dos tarjetas, al final del Analizador)

Están en el mismo sitio pero son **dos tarjetas separadas**, una debajo de la
otra. Cada una lleva lo suyo.

### Laboratorio: prueba tu propia regla (incluido en la suscripción)

- **Qué es:** armas una regla (hacia qué lado operas, hasta 4 condiciones,
  Stop-loss y Take-profit) y la app cuenta cómo le habría ido sobre las velas
  guardadas, con el spread descontado.
- **Paso a paso:** 1) eliges COMPRA o VENTA (la app no lo elige); 2) añades
  condiciones; 3) eliges el Stop-loss y el Take-profit; 4) tocas «Probar»;
  5) si quieres, le pones nombre y la guardas.
- **Antes de guardar se avisa** de que el desarrollador puede ver las reglas
  guardadas, y hay una casilla (sin marcar) para darle permiso de copiarla.
- **No todas las reglas guardadas se analizan.** El desarrollador elige
  algunas al azar, y solo entre las que tienen permiso. Si la tuya da
  resultados, te avisamos en «Mis reglas guardadas» con las medidas con las
  que se midió.
- **Lo que NO hace:** un resultado sobre el pasado no es una señal. Con
  muchas pruebas sobre las mismas velas siempre sale alguna que «gana» por
  casualidad, y por eso la app cuenta cuántas pruebas llevas.

### Seguimiento hacia adelante (servicio aparte, 3 USD al mes)

- **Qué es:** la app sigue tu regla guardada con velas nuevas, que la regla
  nunca vio, y anota cada operación con su resultado.
- **La tarjeta cerrada dice el estado:** sin pedir, pedido o activo (con
  cuántas reglas sigues de las 5).
- **Se activa en 3 pasos, numerados en la tarjeta:**
  1. Tocas «Solicitar activación».
  2. El desarrollador te escribe para el pago y te lo activa. El paso sale
     marcado cuando está activo.
  3. En «Tus reglas guardadas» (dentro de esa misma tarjeta) tocas «Seguir
     hacia adelante» en hasta 5 reglas.
- **Lo que NO hace:** no abre operaciones en tu bróker ni te dice cuándo
  entrar. Solo mide, y con pocas operaciones el resultado todavía no
  significa nada.
