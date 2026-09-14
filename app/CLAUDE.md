
---

# La sonda de las tasas respondió: BIS v2 en CSV (2026-09-09)

Lanzada desde Actions (run 34301293883, 2 segundos). Igual que con el
calendario: **la fuente se eligió con la sonda delante, no leyendo
documentación.**

| fuente | qué pasó |
|---|---|
| **BIS v2, CSV, las 8 de un golpe** | ✅ **200 · 8 filas · 5.654 caracteres · 153 ms** |
| BIS v2, JSON | ❌ **406** con un error SDMX en XML — ese endpoint no da `jsondata` |
| BIS v1, CSV | ✅ 200, respuesta **idéntica** a la v2 |
| BCE (solo euro) | ✅ 200, JSON SDMX — el euro sale **2,4** |
| FRED sin llave | ❌ **400: «Variable api_key is not set»** |

**→ Se usará `bis-v2-csv-todas`: una sola petición, las ocho divisas, sin llave
y sin gastar créditos de Twelve Data.**

📌 **El JSON del BIS NO existe en ese endpoint** (406), que era justo lo que no
se podía saber desde estas sesiones y por lo que se sondearon cuatro formas de
la dirección. Si se hubiera escrito el lector «en JSON porque es más cómodo»,
habría fallado en producción sin explicación.

📌 **FRED confirmado que pide llave**, comprobado en vez de supuesto. Queda
descartado: un secreto más que mantener a cambio de nada.

## La forma exacta del CSV, que es lo que hacía falta

```
FREQ,REF_AREA,UNIT_MEASURE,UNIT_MULT,TIME_FORMAT,COMPILATION,DECIMALS,
SOURCE_REF,SUPP_INFO_BREAKS,TITLE,TIME_PERIOD,OBS_VALUE,OBS_STATUS,
OBS_CONF,OBS_PRE_BREAK
```

De las quince columnas **solo hacen falta tres**: `REF_AREA` (el país/zona),
`TIME_PERIOD` (la fecha) y `OBS_VALUE` (la tasa). Las ocho filas vienen en
orden alfabético de país: AU, CA, CH, GB, JP, NZ, US, XM.

Valores que se leen enteros en el log: **US 3,625** y **CH 0**, los dos con
fecha `2026-09-01`. Los demás quedaron cortados por el ancho del log — no se
copian aquí de memoria.

⚠️ **`COMPILATION` y `TITLE` llevan comas DENTRO, entre comillas.** Partir cada
línea por comas a pelo rompe el archivo. El lector tiene que respetar las
comillas o quedarse con las columnas por nombre desde la cabecera.

⚠️ **La fecha es `2026-09-01`, no la de hoy.** Es normal y no es un fallo: una
tasa de referencia solo cambia el día que se reúne el banco central. Pero
significa que **en pantalla hay que enseñar la fecha del dato**, no la de la
consulta — si no, un dato de hace tres semanas se lee como de hoy.

⚠️ **`XM` (área del euro) hay que contrastarlo con el BCE antes de fiarse.** El
BCE dijo 2,4 en esta misma corrida; el valor del BIS quedó cortado en el log y
**no se ha comprobado que coincidan**. Para eso estaba el BCE en la sonda.

## Lo siguiente, y lo que NO hay que hacer

Escribir el lector con esta forma delante. Y al enseñarlo, la advertencia que
ya está escrita en `sonda-tasas.mjs` **con fecha anterior a estos datos**:

⚠️ **LA DIFERENCIA DE TASAS NO ES EL SWAP.** Da el signo y el orden de
magnitud. El margen del bróker no lo publica nadie y es asimétrico. El banco de
pruebas **sigue barriendo cinco niveles de swap**; lo único que cambia es que
deja de hacerlo a ciegas.

---

# La sonda del COT respondió: `TFF_All` de la CFTC (2026-09-14)

Lanzada desde Actions. Igual que con el calendario y las tasas: **la fuente se
eligió con la sonda delante, no leyendo documentación.** Hicieron falta **dos
corridas**, y la primera es la que más enseñó.

## El veredicto

| conjunto | id | vivo | divisas nuestras | qué es |
|---|---|---|---|---|
| **TFF_All** | **`udgc-27he`** | ✅ 2026-09-08 | **las 8** | **← ESTE.** Futuros financieros |
| Legacy_All | `srt6-5q2f` | ✅ 2026-09-08 | las 8 | el informe clásico, 1.447 contratos |
| Disaggregated_All | `rxbv-e226` | ✅ 2026-09-08 | **ninguna** | materias primas |
| CIT_All | `j83k-qyrd` | ✅ 2026-09-08 | ninguna | índices de materias primas |
| ProductHierarchy | `rj6x-va3z` | — | — | sin fecha ni contrato: no sirve |

**→ Se usará `udgc-27he` (TFF_All).** Es el único **catalogado, vivo y con las
ocho divisas** del barrido, y es el informe pensado para futuros financieros.
Sin llave y **sin gastar créditos de Twelve Data**.

## ⚠️ La CFTC solo tiene CINCO conjuntos consultables, y no son los que parecen

El índice DCAT lista **quince**, pero **diez devuelven 403**:

```
{ "error": true, "message": "no row or column access to non-tabular tables" }
```

Y son justo los de nombre legible: «TFF - Futures Only», «Legacy - Combined»,
«Commitments of Traders», «Disaggregated - Futures Only»… **Los consultables
son los de nombre feo**, los `*_All`. Quien vaya al que se llama como el
informe se lleva un 403 sin explicación.

📌 **Además hay conjuntos que existen y NO están en ningún catálogo.** Los
cuatro identificadores que yo recordaba respondieron 200 los cuatro.
`gpe5-46if` es **un gemelo sin catalogar de `TFF_All`** (mismos 191 contratos,
mismas 20 divisas, misma fecha; 89 columnas contra 87). Se usa el catalogado:
un conjunto que nadie anuncia es un conjunto que nadie promete mantener.

## ⚠️ `TFF_All` son DOS informes mezclados, y hay que fijar cuál

La columna `futonly_or_combined` tiene exactamente dos valores: **`FutOnly`** y
**`Combined`**. El primero cuenta solo futuros; el segundo suma las opciones
convertidas a futuros equivalentes. **Cada contrato tiene las dos filas cada
semana**, y los números NO coinciden:

| EURO FX, 2026-09-08 | interés abierto | fondos apalancados largos |
|---|---:|---:|
| `FutOnly` | 942.464 | **94.808** |
| `Combined` | 1.056.521 | **81.335** |

Un 14 % de diferencia en el dato que más se mira. **Pedir sin fijar esa columna
devuelve uno de los dos según le apetezca al servidor**, y no falla: devuelve un
número plausible del informe que no era. Es la misma familia de fallo que el ATR
de cierre a cierre del 2026-08-09.

**→ El lector usará `FutOnly`**, que es la medida más literal: posiciones en
futuros y nada más. Y lo fija en el `$where`, no confía en el orden.

## Los nombres EXACTOS de contrato en `TFF_All`

📌 **CORRECCIÓN: la primera versión de esta tabla tenía TRES de los ocho mal.**
Se escribió leyendo la lista *filtrada* de contratos, que incluye los nombres
del histórico. La lista buena es la del **último informe**: un contrato que no
tiene fila ahí es un nombre muerto. Esto es lo que hay VIVO el 2026-09-08:

| | contrato vivo | nombre muerto que engaña |
|---|---|---|
| EUR | `EURO FX - CHICAGO MERCANTILE EXCHANGE` | — |
| JPY | `JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE` | — |
| GBP | `BRITISH POUND - CHICAGO MERCANTILE EXCHANGE` | ~~`BRITISH POUND STERLING`~~ |
| CHF | `SWISS FRANC - CHICAGO MERCANTILE EXCHANGE` | — |
| CAD | `CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE` | — |
| AUD | `AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE` | — |
| **NZD** | **`NZ DOLLAR - CHICAGO MERCANTILE EXCHANGE`** | ~~`NEW ZEALAND DOLLAR`~~ |
| **USD** | **`USD INDEX - ICE FUTURES U.S.`** | ~~`U.S. DOLLAR INDEX`~~ |

⚠️ **Y hay CRUCES que no son la divisa suelta**, vivos los dos:
`EURO FX/JAPANESE YEN XRATE` y `EURO FX/BRITISH POUND XRATE`. Son contratos
minúsculos (23.252 y 43.316 de interés abierto contra 942.464 del euro) y coger
el primero que coincida daría el cruce en vez del par.

📌 **La lección, otra vez la misma:** los tres errores salieron de leer una
lista que un filtro mío había recortado. El filtro `PARECE_DIVISA` pedía
«DOLLAR INDEX» y el contrato vivo se llama `USD INDEX`, así que **escondía justo
lo que se buscaba**. Por eso la sonda ahora imprime la lista completa sin
filtrar, y por eso la pregunta que decide no es «¿está en la lista?» sino
«¿tiene fila en el último informe?».

⚠️ **En `Legacy_All` la cosa es peor:** 1.447 contratos, con bolsas muertas
dentro (`NEW YORK COTTON EXCHANGE`, `PHILADELPHIA BOARD OF TRADE`,
`IMM JAPANESE YEN`). **El nombre de la bolsa hay que fijarlo también**, no solo
el de la divisa.

## Cuatro trampas que costaron las dos corridas

⚠️ **1. `/api/catalog/v1` SIN `domains=` devuelve TODO Socrata.** Respondió 200
con cien conjuntos y **los cien eran de otros**: la policía de Dallas, permisos
de obra de Austin, la lotería de Nueva York, los casos de covid en Colombia.
Quien lo use para «descubrir» lo de la CFTC se lleva cien datos ajenos.

⚠️ **2. `$q=` (búsqueda libre) no encuentra una divisa.** `$q=EURO` devolvió
**«NORTH EURO HOT-ROLL COIL STEEL»**: acero. Hay que filtrar con `$where` y el
nombre exacto.

⚠️ **3. Buscar por trozos de texto mete materias primas.** La grafía `'EUR '`
cazó **`ALUM EUR UNPAID - COMMODITY EXCHANGE INC.`** — aluminio. En el lector,
nombres completos y nada de subcadenas sueltas.

⚠️ **4. Un conjunto muerto responde 200 igual que uno vivo.** Por eso cada
ficha pide su dato más reciente con `$order DESC`. Los cinco vivos dieron todos
`2026-09-08`.

⚠️ **5. Y un CONTRATO muerto también.** `NEW ZEALAND DOLLAR` y
`U.S. DOLLAR INDEX` siguen en la tabla de contratos y **no tienen fila en el
último informe**. Preguntar por ellos no daría error: daría el último dato que
tuvieron, de hace años, sin decir que es viejo.

## Las columnas útiles de las 87

Cinco familias de operador, cada una con `long`, `short` y `spread`, más su
variación semanal (`change_in_*`), su porcentaje del interés abierto
(`pct_of_oi_*`) y su número de operadores (`traders_*`):

| familia | columnas | quiénes son |
|---|---|---|
| `dealer_positions_*` | `long_all`, `short_all`, `spread_all` | bancos e intermediarios: **cubren**, no apuestan |
| `asset_mgr_positions_*` | `long`, `short`, `spread` | fondos de pensiones, gestoras: dinero lento |
| **`lev_money_positions_*`** | `long`, `short`, `spread` | **hedge funds: el dinero especulativo** |
| `other_rept_positions_*` | `long`, `short`, `spread` | el resto de los grandes |
| `nonrept_positions_*` | `long_all`, `short_all` | los pequeños, que no declaran |

Más `open_interest_all` (el total) y `report_date_as_yyyy_mm_dd` (la fecha del
dato, que es la que va en pantalla).

⚠️ **`lev_money` es el que la gente llama «los especuladores»**, y es el que
más se mira. Pero sigue en pie lo escrito antes de ver nada: son hedge funds y
**pierden como cualquiera**. Los `dealer` son su espejo casi exacto, así que
enseñar solo uno de los dos y llamarlo «el mercado» es elegir la mitad que
cuadra con lo que uno quería decir.

## Lo que confirmó la advertencia escrita ANTES de ver datos

El retraso. El domingo **2026-09-14** el dato más reciente era del **martes
2026-09-08**: seis días. Está escrito en la cabecera de `sonda-cot.mjs` con
fecha anterior a la primera corrida, a propósito.

⚠️ **Y sigue en pie lo que decide si esto entra en la app:** el COT es un
**FILTRO**, no información. Enseñarlo en pantalla con su fecha y sus
advertencias es legítimo; **apagar o encender señales con él NO lo es** sin
pasar por el banco de pruebas.
