# El puente a MetaTrader 5

Lleva a las apps lo único que el barrido no puede saber: **lo que de verdad
cuesta abrir una operación** (el spread real del bróker) y **cuántas veces se
movió el precio** (el tick volume).

| archivo | qué es | estado |
|---|---|---|
| `bridge_mt5.py` | **el puente.** Lee MT5 y publica a la rama `datos` | ✅ reescrito el 2026-09-08 |
| `server.js` | el servidor viejo de Render | ⚠️ **ya no se usa** — ver §3 |
| `Iniciar_Puente.bat` | **arranca el puente de un doble clic** | ✅ nuevo, 2026-09-08 |
| `Iniciar_Ecosistema.bat` | el arranque viejo de tres piezas | ⚠️ **ya no se usa** — ver abajo |
| `.gitignore` | impide que el permiso de GitHub se suba nunca | — |

---

## 0. CÓMO SE PONE EN MARCHA (para Néstor, paso a paso)

Solo hay que hacerlo **una vez**. Después es abrir y ya.

### Primero: darle permiso para escribir

El puente necesita permiso para dejar los precios en GitHub. Es un permiso
**solo para este repositorio** y **solo para escribir archivos** — no da acceso
a tu correo, ni a tu dinero, ni a tu cuenta del bróker.

1. Entra a **github.com** y pica tu foto (arriba a la derecha) → **Settings**.
2. Baja del todo, a la izquierda: **Developer settings**.
3. **Personal access tokens** → **Fine-grained tokens** → botón
   **Generate new token**.
4. Rellena así:
   - **Token name:** `puente mt5`
   - **Expiration:** `90 days` (cuando se venza, se repite esto)
   - **Repository access:** marca **Only select repositories** y elige
     **Nestor-forex/Nestor-forex**
   - **Permissions** → **Repository permissions** → busca **Contents** y
     ponlo en **Read and write**
5. Botón verde **Generate token**.
6. Sale un texto largo que empieza por `github_pat_`. **Cópialo ahora**:
   GitHub no vuelve a enseñártelo nunca.

⚠️ **Ese texto es como una llave. No lo pegues en el chat, ni en un correo,
ni en ningún archivo del proyecto.**

### Segundo: guardarlo en tu computador

7. Abre el Bloc de notas.
8. Pega **solo** ese texto. Nada más: ni tu nombre, ni comillas.
9. Guárdalo como **`token.txt`** en la carpeta
   `Documents\nestor-forex-bridge` (la misma donde está `bridge_mt5.py`).
   - En «Tipo», elige **Todos los archivos**, para que no lo guarde como
     `token.txt.txt`.

### Tercero: poner el puente al día

10. Copia el `bridge_mt5.py` de esta carpeta encima del que tienes en
    `Documents\nestor-forex-bridge`.
11. Abre MetaTrader 5 y entra a tu cuenta.
12. En la ventana **Observación del Mercado**, comprueba que estén los pares.
    Si falta alguno: clic derecho → **Símbolos** → búscalo → **Mostrar**.
    MT5 solo entrega precio de los que estén ahí; el puente avisa de los que
    falten.
13. **Doble clic en `Iniciar_Puente.bat`.**

⚠️ **NO uses `Iniciar_Ecosistema.bat`**, el viejo. Aquel arrancaba tres cosas:
el servidor de Render (que ya se apagó), el puente y una copia local de la app.
Hoy solo hace falta el puente. Se conserva ese archivo únicamente como
documento de lo que hubo.

📌 **Para tenerlo a un clic desde el escritorio:** botón derecho sobre
`Iniciar_Puente.bat` → **Mostrar más opciones** → **Enviar a** → **Escritorio
(crear acceso directo)**. El `.bat` se apaña solo esté donde esté el acceso
directo, porque busca su propia carpeta.

⚠️ Ojo con la opción **«Crear acceso directo»** a secas: ésa lo deja **al lado
del original**, no en el escritorio. La que lo manda al escritorio es la de
**Enviar a**. Si ya te pasó, no hay que rehacerlo: corta el acceso directo que
tengas y pégalo en el escritorio.

### ⚠️ Si el doble clic no abre NINGUNA ventana (arreglado el 2026-09-09)

Pasó de verdad, y era un fallo del archivo, no de quien lo abre. Si vuelve a
pasar, esto es lo que hay que mirar:

**El `.bat` tiene que estar guardado con saltos de línea de Windows (CRLF).**
La primera versión se escribió en Linux (LF) y llevaba dos bloques
`if not exist ... ( ... )` repartidos en varias líneas. `cmd` **no analiza bien
los paréntesis de varias líneas con saltos LF**: aborta el guion entero y la
ventana se cierra antes de que se pueda leer nada. Desde fuera se ve
exactamente igual que «no abre».

Están puestas las tres defensas, y las tres hacen falta:

1. El archivo va en **CRLF**.
2. `puente-mt5/.gitattributes` lleva **`*.bat -text`** — y no `text eol=crlf`,
   que es lo que parece correcto. Con `eol=crlf` git guardaría LF dentro del
   repositorio y solo convertiría al hacer `git checkout`; Néstor **no clona**,
   baja el archivo con el botón de descarga de GitHub, y eso entrega los bytes
   tal como están guardados. Seguiría bajándolo roto.
3. El `.bat` ya **no usa bloques de paréntesis**: usa etiquetas y `goto`, que
   funcionan con cualquier salto de línea. Y no lleva ni un emoji ni una
   tilde, porque la consola de Windows en español no usa UTF-8 y los sacaría
   como símbolos raros justo en los mensajes de error.

**Mientras tanto, para arrancar el puente sin el `.bat`:** abre la carpeta,
haz clic en la barra de direcciones de arriba, escribe `cmd` y pulsa Enter;
en la ventana negra que sale escribe `python bridge_mt5.py` y Enter.

Si todo va bien verás algo así, y **hay que dejar esa ventana abierta**:

```
Conectado a MetaTrader 5.
Publicando en Nestor-forex/Nestor-forex, rama datos, cada 15 minutos.

15:22:10 — leyendo MT5…
  [OK] estado/mt5.json — 18 pares
  [OK] spreads/2026-09-08.jsonl
  spread medio ahora: 1.84 pips
```

⚠️ **La app enseña los precios con la hora a la que se tomaron.** Si apagas el
computador, no se rompe nada: sigue mostrando los últimos y dice de cuándo son.

---

## 0b. Lo que se reescribió el 2026-09-08, y por qué

Néstor lo pidió así: **«quiero que el puente envíe los spreads también, quiero
dejarlo listo, no para después»**. Y sobre Render: **«si es mejor publicar a
la rama de datos, entonces hagámoslo»**.

**1. Ahora manda el spread, que era lo único que faltaba.** La versión anterior
mandaba velas (máximo, mínimo, cierre, tick volume) pero **no** el precio de
compra y el de venta — y el spread sale justo de la diferencia entre esos dos.
O sea que el dato por el que existe este puente no viajaba.

**2. Se acabó el servidor.** Antes hacía `POST` a Render. Ahora escribe
directo en la rama `datos`, igual que el vigía publica `barrido.json`:

| archivo | qué lleva | para qué |
|---|---|---|
| `estado/mt5.json` | lo último: bid, ask, spread y ticks por par | la pantalla |
| `spreads/<fecha>.jsonl` | una muestra por corrida | **medir** |

⚠️ **El segundo archivo es el que da sentido a todo esto.** Sin él el dato se
evapora en cada vuelta y seguiríamos con la tabla `SPREAD_PIPS` escrita a mano
—de donde salen TODOS los números del banco de pruebas—. Con muestras a
distintas horas deja de ser una suposición.

⚠️ Y va en `spreads/`, **lejos de `historial/`**: el historial de señales es lo
único irreparable del proyecto y ningún guion nuevo tiene por qué escribir
cerca de él.

**3. Cada 15 minutos, no cada 15 segundos.** Antes era una petición a un
servidor; ahora cada corrida deja un commit en GitHub, y uno cada 15 segundos
serían miles al día.

**4. Los 18 pares**, no 5: los 14 de Swing más los 4 que solo usa Intradía, para
que un solo puente sirva a las dos apps.

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

## 2. ✅ Las dos mitades YA ENCAJAN (2026-09-08)

Durante meses fueron **dos intentos distintos que no se hablaban**: la app
pedía `GET /quotes` esperando bid y ask, y el puente hacía `POST` mandando
velas. Ninguno de los dos daba lo que el otro esperaba.

| | antes | ahora |
|---|---|---|
| quién habla | la app pedía a un servidor | el puente **publica**, la app **lee un archivo** |
| qué viaja | velas, sin bid ni ask | bid, ask, **spread** y ticks |
| dónde | Render (`POST /api/mt5/update`) | rama `datos` (`estado/mt5.json`) |
| cada cuánto | 15 segundos | 15 minutos |
| pares | 5 | **18** (los 14 de Swing + los 4 de Intradía) |

📌 **Por qué nunca funcionó en producción, aunque el servidor estuviera vivo:**
`VITE_API_URL` valía `http://127.0.0.1:8000`, que es «este mismo aparato» —o
sea el teléfono de quien abre la app, donde no hay nada—. Y aunque hubiera
apuntado a un servidor real por `http://`, el navegador lo habría **bloqueado**:
una página servida por HTTPS no puede llamar a una dirección sin cifrar.

Leyendo un archivo de `raw.githubusercontent.com` los dos problemas
desaparecen: es HTTPS y no hay servidor que exponer.

---

## 3. Lo que este puente todavía NO hace

- **No lee símbolos con sufijo automáticamente.** Si el bróker nombrara los
  pares `EURUSD.r` en vez de `EURUSD`, habría que ajustar la lista `SYMBOLS`.
  Los de Néstor **no llevan sufijo** (comprobado en su MT5), así que hoy no
  hace falta — y el puente avisa por pantalla de cada símbolo que no encuentre
  en vez de fallar en silencio.
- **No manda velas históricas.** Solo el precio de ahora y el tick volume del
  día en curso. El barrido sigue sacando su historia de Twelve Data, que da
  300 días y no depende de que el computador de Néstor esté encendido.
- **Solo publica mientras esa ventana esté abierta.** No es un servicio: es un
  programa que corre en su PC. La app lo enseña con la hora a la que se tomó,
  así que apagarlo no rompe nada.

---

## 4. Las tres preguntas abiertas, ya contestadas

Las tres se cerraron el **2026-09-08**, el mismo día, en cuanto Néstor abrió
la dirección en Chrome y pegó el `server.js`.

### ✅ 1. El servicio de Render está VIVO

Al abrir `https://nestor-forex-backend.onrender.com` sale **«Cannot GET /»**.
Parece un error y no lo es: es Express contestando «estoy despierto, pero en
esa dirección exacta no tengo nada». Encaja con el código, que solo define
`/api/signals` y `/api/mt5/update` y ninguna ruta en la raíz. Un servicio
muerto habría dado una página de Render, no eso.

### ⚠️ 2. NO, el `POST` no pide ninguna contraseña

```js
app.post("/api/mt5/update", (req, res) => {
    const { symbol, timeframe, candles, currentPrice } = req.body;
    if (!symbol) { return res.status(400).json({ error: "Símbolo inválido" }); }
```

Lo único que comprueba es que venga un `symbol`. **Cualquiera que sepa la
dirección puede mandarle precios inventados** y el servidor los guardaría como
buenos. Hoy no importa porque nadie la conoce; el día que la app la use
delante de suscriptores, sí.

⚠️ **Y hay un segundo agujero, más silencioso:** `app.use(cors())` **sin
opciones** deja que CUALQUIER página web del mundo lea `/api/signals` desde el
navegador de quien la visite. Para un dato público de precios no es grave —
pero es una decisión que aquí nadie tomó, vino puesta por defecto.

📌 **Cuando se arregle, la contraseña NO se escribe en este archivo.** Los dos
repositorios son PÚBLICOS. Va como variable de entorno en Render y como
secreto de GitHub, exactamente igual que se hizo con `TWELVEDATA_KEY` el
2026-09-03 — y por la misma razón, que allí la llave estaba a la vista de
cualquiera dentro del JavaScript descargado.

### ✅ 3. El servidor NO guarda historial

```js
let liveMarketData = {};
```

Una variable en memoria, indexada por `"EURUSD (D1)"`. Cada envío **machaca**
el anterior, y **si Render reinicia el servicio, se borra todo**. Los planes
gratuitos reinician solos.

Para lo que hace hoy da igual —solo interesa el último precio— pero significa
que **este servidor no puede ser la fuente del historial**, y que el primer
`GET` después de un reinicio devuelve
`{"estado":"Esperando datos de MetaTrader..."}` en vez de precios. Quien lo
lea tiene que estar preparado para eso.

---

## 5. El ecosistema que destapó el `.bat`

Es más grande de lo que decía la memoria del proyecto:
`nestor-forex-backend`, `nestor-forex-bridge`, `nestor-forex-swing` corriendo
en local con `npm run dev`, y en una captura anterior se vieron además
`nestor-forex-scalping` y `nestor-forex-rango`.

---

## 6. Lo que SÍ está bien, y conviene dejarlo escrito

✅ **No hay ninguna credencial en NINGUNO de los tres archivos.** Comprobado
línea por línea antes de guardarlos:

- `bridge_mt5.py` llama a `mt5.initialize()` **sin argumentos**: se engancha al
  MetaTrader 5 que ya está abierto y con la sesión iniciada a mano. No hay
  usuario, ni contraseña, ni número de cuenta.
- `server.js` solo lee `process.env.PORT`, que se lo pone Render.
- El `.bat` solo tiene rutas de carpetas.

Por eso se pueden guardar en un repositorio público sin tocar nada.

⚠️ Y así tiene que quedarse. La regla del proyecto no cambia: **nunca meter
credenciales del bróker en la app ni en el puente.** Es el mismo agujero que
llevó a leer el informe del bróker desde un archivo en vez de por API, pero
este daría acceso al **dinero** de alguien.

✅ **El puente solo LEE de MT5.** `copy_rates_from_pos` y `symbol_info_tick`
no abren, no cierran y no modifican nada. Aunque alguien se metiera en el
servidor, no podría operar con la cuenta de Néstor desde ahí.

---

## 7. Las tres decisiones, ya tomadas (2026-09-08)

Las tres las confirmó Néstor y las tres están hechas:

1. ✅ **Una sola forma.** El puente manda `bid` y `ask` (de ahí sale el
   spread) **y** el tick volume, y la app lee un archivo publicado. Se acabó
   el desajuste entre las dos mitades.
2. ✅ **Publica a la rama `datos`**, como todo lo demás del proyecto. Render
   se apaga: sin servidor no hay agujeros que tapar, ni servicio que pagar, ni
   preguntarse si sigue vivo.
3. ✅ **Rotulado por lo que es.** El archivo trae el campo `cuenta` y la
   pantalla lo enseña arriba, no en la letra pequeña: es el spread de **la
   cuenta de Néstor en AvaTrade**, no el del suscriptor. Nunca «tu spread».

⚠️ **Lo que sigue pendiente**, y no es de código: que Néstor cree el permiso de
GitHub (§0) y deje el puente corriendo. Hasta entonces la app enseña «Todavía
no hay precios del bróker» — que es la verdad, no un error.
