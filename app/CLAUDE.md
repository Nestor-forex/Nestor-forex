
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
