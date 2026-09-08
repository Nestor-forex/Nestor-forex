# El puente a MetaTrader 5 — lo que hay, lo que falta y lo que no cuadra

**Estos dos archivos NO estaban en ningún repositorio.** Vivían solo en el
computador de Néstor. Los pegó en el chat el **2026-09-08** y se guardan aquí
**tal cual**, sin cambiar una línea, porque perderlos otra vez es exactamente
el problema que esta carpeta viene a cerrar.

| archivo | qué es | dónde vive en el PC de Néstor |
|---|---|---|
| `bridge_mt5.py` | el puente: lee MT5 y manda los datos | `Documents\nestor-forex-bridge\` |
| `Iniciar_Ecosistema.bat` | arranca las tres piezas de un doble clic | (el escritorio, presumiblemente) |

⚠️ **Se guardan como DOCUMENTO, no como parte de la app.** Nada del build de
Vite ni de los workflows los toca. Están aquí para que existan.

---

## 1. El hallazgo que cambia una respuesta que ya se había dado

El 2026-09-08, más temprano, se le dijo a Néstor que **su computador no podía
servir de servidor** para los suscriptores, porque una página servida por
HTTPS (GitHub Pages) no puede llamar a una dirección `http://` — el navegador
lo bloquea (contenido mixto), y saltárselo pedía dominio propio, certificado,
IP fija y abrir un puerto del router.

**Ese diagnóstico era correcto, pero la pregunta ya estaba resuelta.** Este
archivo enseña que el puente **nunca recibió visitas**: manda los datos a

```
https://nestor-forex-backend.onrender.com/api/mt5/update
```

o sea, un servidor **alojado en Render, con HTTPS**, al que el PC solo le
ESCRIBE. Es exactamente el patrón que se le propuso como solución («que tu PC
no reciba visitas: que publique») y que ya venía usando el proyecto con la
rama `datos`.

📌 **La lección es la del 2026-09-04, otra vez y al revés:** antes de diseñar
algo, buscar si ya existe. La primera mitad de este puente
(`app/src/lib/useMT5Quotes.js`) ya estaba en el repositorio y CLAUDE.md no la
mencionaba; la segunda mitad estaba en el PC y tampoco. Se estuvo a punto de
rediseñar dos veces algo que ya funcionaba.

---

## 2. ⚠️ LAS DOS MITADES NO ENCAJAN

Esto es lo más importante de este README, y hay que decidirlo antes de
escribir una línea más de código.

| | lo que hay en este repositorio | lo que hace este puente |
|---|---|---|
| archivo | `app/src/lib/useMT5Quotes.js` | `bridge_mt5.py` |
| dirección | `GET {VITE_API_URL}/quotes` | `POST .../api/mt5/update` |
| quién habla | la app **pide** | el puente **empuja** |
| qué viaja | `bid`, `ask` por par | velas `high/low/close/volume` |
| cada cuánto | 2 segundos, desde el navegador | 15 segundos, desde el PC |

**No son dos partes de lo mismo: son dos intentos distintos**, hechos en
momentos distintos, y ninguno de los dos habla con el otro. Hoy la app tiene
un enchufe (`useMT5Quotes`) y el puente tiene otro, de otra forma.

Y lo que cada uno da es distinto de verdad, no es un detalle de formato:

- **`bid`/`ask`** son lo único que da el **spread real del bróker**, que es el
  número que hoy se estima a mano en `app/scripts/lib/costes.mjs`
  (`SPREAD_PIPS`) y del que salen TODOS los resultados del banco de pruebas.
- **`tick_volume`** es lo único que da actividad por vela — justo lo que el
  pie del reporte diario dice desde siempre que falta.

**Los dos hacen falta.** La forma de arreglarlo no es elegir uno: es que el
puente mande las dos cosas.

---

## 3. Lo que este puente NO cubre todavía

- **Solo 5 pares**: `USDJPY`, `GBPCAD`, `USDCAD`, `EURUSD`, `GBPUSD`.
  Swing necesita **14** e Intradía **18**. Ampliar la lista es cambiar una
  línea, pero **cada símbolo tiene que estar en la Observación del Mercado de
  MT5** o MT5 no entrega precio de él.
- **Tres constantes con la misma dirección** (`SERVER_URL`, `URL_SERVIDOR`,
  `url`). Solo se usa la primera; las otras dos son restos de haberlo escrito
  a prisa. Se dejan porque el archivo se guarda tal cual.
- **`H4` se manda sin comprobar que venga algo**, al revés que `M15` y `D1`,
  que sí llevan su `if`. Si MT5 devuelve vacío, se manda una lista vacía.

---

## 4. Lo que sigue sin estar en ningún repositorio

⚠️ **El código del servidor `nestor-forex-backend` NO está aquí.** El `.bat`
lo arranca con `node server.js` desde
`Documents\nestor-forex-backend`, así que existe en el PC de Néstor y en
Render — pero si ese computador se estropea, se pierde igual que se estuvo a
punto de perder este puente.

**Ese archivo es el siguiente que hay que traer.**

El `.bat` además destapa un ecosistema más grande de lo que decía la memoria
del proyecto: `nestor-forex-backend`, `nestor-forex-bridge`,
`nestor-forex-swing` corriendo en local con `npm run dev`, y en una captura
anterior se vieron además `nestor-forex-scalping` y `nestor-forex-rango`.

---

## 5. Las tres preguntas abiertas

1. **¿El servicio de Render sigue vivo?** Los planes gratuitos de Render se
   duermen y se dan de baja solos. Desde estas sesiones no se puede
   comprobar (la red las bloquea); hay que abrir la dirección en Chrome.
2. **¿El `POST` pide alguna contraseña?** Si no la pide, **cualquiera en
   internet puede mandarle precios falsos** a ese servidor, y la app se los
   creería. Es la pregunta más urgente de las tres.
3. **¿Qué guarda y qué devuelve el servidor?** Sin ver `server.js` no se sabe
   si conserva historial o solo el último dato de cada par.

---

## 6. Lo que SÍ está bien, y conviene dejarlo escrito

✅ **No hay ninguna credencial en estos archivos.** `mt5.initialize()` se
llama **sin argumentos**: se engancha al MetaTrader 5 que ya está abierto y
con la sesión iniciada a mano. No hay usuario, ni contraseña, ni número de
cuenta en ninguna parte. Por eso se pueden guardar en un repositorio público
sin tocar nada.

⚠️ Y así tiene que quedarse. La regla del proyecto no cambia: **nunca meter
credenciales del bróker en la app ni en el puente.** Es el mismo agujero que
llevó a leer el informe del bróker desde un archivo en vez de por API, pero
este daría acceso al **dinero** de alguien.

✅ **El puente solo LEE de MT5.** `copy_rates_from_pos` y `symbol_info_tick`
no abren, no cierran y no modifican nada. Aunque alguien se metiera en el
servidor, no podría operar con la cuenta de Néstor desde ahí.

---

## 7. Lo que habría que decidir antes de seguir

Nada de esto se hace sin que Néstor lo confirme:

1. **Una sola forma, no dos.** O el puente empieza a mandar también `bid` y
   `ask` (y `useMT5Quotes` cambia a leerlos de donde el backend los deje), o
   se abandona `useMT5Quotes` y la app pasa a leer un archivo publicado.
2. **Publicar a la rama `datos`, como todo lo demás.** El puente escribiría
   `estado/mt5.json` igual que el vigía escribe `barrido.json`. Ventaja: no
   hace falta el servidor de Render en absoluto, ni pagarlo, ni preguntarse si
   sigue vivo. Con el PC apagado la app enseña el último dato **con su hora**,
   como ya hace con «Sin conexión — mostrando el barrido guardado del…».
3. **Rotularlo por lo que es.** Es el spread de **la cuenta de Néstor en
   AvaTrade**, no el del suscriptor. Nunca se puede llamar «tu spread».
