# «Comprar la caída»: la regla, escrita entera

Documento para los archivos de Néstor, y para Qwen cuando esté conectado.
Escrito el 2026-11-15, con el código de las apps delante.

> ⚠️ **No es una señal.** Es un experimento que la app de Swing anota cada día
> para medirlo. Hasta que llegue a 150 operaciones reales (ver abajo), nadie
> sabe si funciona, y no debe copiarse como si fuera una recomendación.

---

## 1. Dónde vive

- **Solo en la app de Swing** (velas diarias).
- **No está en Intradía.** Se midió allí con velas de una hora y dio −0,08 por
  unidad de riesgo en los tres tamaños de ventana probados: pierde. Esa app no
  la anota.
- La calcula **solo el vigía** (el programa que corre cada día en GitHub),
  porque necesita los máximos y mínimos de los últimos 300 días. El archivo que
  baja la app no los trae, así que el teléfono no puede calcularla por sí
  mismo: lee lo que el vigía anotó.

## 2. La regla, paso a paso

Cada día, para cada uno de los 14 pares de Swing, con la vela diaria:

1. **Mirar los 10 días anteriores** (sin contar hoy) y anotar su mínimo más
   bajo y su máximo más alto.
2. **COMPRA** si hoy el precio **bajó por debajo** de ese mínimo de 10 días
   **y cerró también por debajo**. O sea: el par está marcando su precio más
   bajo de las últimas dos semanas y no ha rebotado.
3. **VENTA** al revés: hoy subió por encima del máximo de 10 días y cerró por
   encima.
4. **No se espera a que rebote.** Esa es la diferencia con el «barrido de
   liquidez», que sí exige que el precio vuelva dentro (y que se midió y
   pierde).
5. De todos los pares que cumplen, la app se queda con **los 3 primeros**,
   ordenados por la diferencia de fuerza entre sus dos divisas (la misma lista
   ordenada que usa el resto del barrido).

En el código: `perforaExtremo(p, 10, lado, false)` y `VENTANA_CAIDA = 10`, en
`app/src/lib/marketCalc.js`.

## 3. Entrada, Stop-loss y Take-profit

| | cómo se calcula |
|---|---|
| Entrada | el cierre del día de la señal |
| Stop-loss | **1,5 × ATR** por debajo de la entrada (en la compra) |
| Take-profit | **1,5 × ATR** por encima de la entrada (en la compra) |
| Relación riesgo/beneficio | **1:1** siempre |

- El ATR es el de Wilder de 14 días, sobre velas diarias reales (máximo,
  mínimo y cierre), sin sábados y con el domingo unido al lunes.
- Es la «vara simétrica» (`ATR_REVERSION = 1.5`, `usaVaraSimetrica`).
- **Desde el 2026-10-12.** Antes se anotaba por error con la geometría de la
  app (R/B 1:6,7, stop de medio ATR), que no es la que se aprobó. Esas 34
  operaciones viejas se enseñan aparte y no cuentan. El contador empezó de
  nuevo ese día.

## 4. Cómo se decide si ganó o perdió

- **El día de la señal no cuenta**: se empieza a mirar desde el día siguiente.
- Gana si el precio toca primero el Take-profit; pierde si toca primero el
  Stop-loss.
- **Si un mismo día toca los dos, cuenta como PERDIDA.** La vela diaria no dice
  cuál pasó antes, y se elige el peor caso a propósito.
- Los pips salen del objetivo y del stop. **No se restan el spread ni el swap**,
  así que en una cuenta real el resultado es algo peor.

## 5. Los números (con su fecha, porque cambian)

**Registro real hacia adelante** (lo que la app anotó sola desde el
2026-10-12), a fecha **2026-11-14**:

| operaciones | acierto | pips | por unidad de riesgo |
|---:|---:|---:|---:|
| 25 | **56 % ±20** | +252 | **+0,12** |

- Es la única regla en positivo de todas las que se miden.
- **Pero el ±20 incluye el 50 %**, que es lo que hace falta para empatar con
  R/B 1:1. Con 25 operaciones todavía no se distingue de la suerte.
- La pestaña Historial de Swing enseña estos números **actualizados cada día**;
  este documento no.

**Backtest** (5 años de velas, medido el 2026-10-06, con rejilla limpia):

| operaciones | acierto | con spread | pagando 0,5 pips de swap por noche |
|---:|---:|---:|---:|
| 1.772 | 53 % | **+0,041** | **−0,003** |

⚠️ No mezclar las dos tablas: una es lo que pasó de verdad desde octubre, la
otra es una simulación sobre el pasado.

## 6. El listón para dejar de ser experimento

Escrito el 2026-09-07, **antes** de medir (`app/scripts/lib/preregistro.mjs`).
Tiene que cumplir **los seis**:

1. Gana con costes en las dos mitades del periodo.
2. Las ventanas vecinas también ganan (que no sea solo la de 10 días).
3. Sigue ganando pagando 0,5 pips de swap por noche. ← **hoy falla éste**
   (−0,003 en el backtest).
4. Da más señales al mes que la reversión.
5. Coincide con la reversión en menos del 20 % de sus señales.
6. Ningún par aporta por sí solo más del 40 % de la ganancia.

Y además **150 operaciones reales** en el registro hacia adelante (~5 meses al
ritmo de unas 29 al mes). Al llegar, decide Néstor: seguir midiendo, cambiar de
experimento o, si el resultado es bueno, darla como señal.

## 7. Avisos al celular

- **Desde el 2026-11-15 cualquier miembro aprobado puede encenderla** en
  «Avisos de los experimentos» (pestaña Barrido de Swing). Antes era solo para
  el administrador.
- **Un suscriptor que no toca nada NO la recibe**: encenderla tiene que ser
  una decisión suya, después de leer que no es una señal. El administrador la
  tiene encendida por defecto (es lo que recibía antes).
- El aviso dice «Experimento · no es una señal», con entrada, SL, TP y R/B.
- Solo suena en los aparatos que tengan activados los avisos en la tarjeta de
  arriba.

## 8. Lo que Qwen puede y no puede decir sobre esta regla

- **Puede** explicar qué hace, enseñar los números con su fecha y su ±, y decir
  en qué pares hay una abierta ahora.
- **No puede** decir «compra» ni «vende» por ella, ni presentarla como una
  recomendación, ni dar el acierto sin el ± al lado, ni mezclar el backtest con
  el registro real.
