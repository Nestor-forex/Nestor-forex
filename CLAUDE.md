# Nestor Forex Swing — memoria del proyecto

App móvil de trading Forex para Néstor (administrador) y miembros invitados.
Barrido diario del mercado, diario de operaciones y calculadora de riesgo.
Ver `README.md` para el handoff de diseño original y `app/README.md` para
el README genérico de Vite.

**Renombrada de "Nestor Forex" a "Nestor Forex Swing" (2026-07-26)** para
distinguirla de su app hermana **Nestor Forex Intradía**
(`nestor-forex/nestor-forex-intradia`, repositorio separado): esta es la
de trading de posición (horas a días, velas diarias), la otra es para
intradía (velas de 1 hora, precio en vivo). Mismo cambio de
nombre en `App.jsx` (`NOMBRE_APP`), `index.html` y `vite.config.js`
(manifest de la PWA). La portada (`Splash.jsx`) ahora usa la imagen real
`app/public/trading_app_ui_v2.png` (globo + velas 3D) que subió el usuario,
recortada para mostrar solo el arte del medio — el título y el botón
"Entrar" son código real (no parte de la imagen) para que funcionen de
verdad, con paleta cian/blanco/verde a juego con esa imagen.

## Estado actual: fases 1–3 completas y publicadas

- **Fase 1** — Scaffold React + Vite + PWA, datos falsos, 6 pantallas + tablero
  completo del barrido. (PR #1, fusionado)
- **Fase 2** — Cálculos reales del barrido (fuerza relativa, EMA20/50, RSI
  Wilder, ATR%, setups) portados del prototipo a `app/src/lib/marketCalc.js`,
  con datos en vivo (entonces Frankfurter; hoy velas de Twelve Data).
  (mismo PR #1)
- **Fase 3** — Firebase Auth + Firestore reales, en el PR #2 (fusionado).
  Reemplazó el login local y el PIN de admin de prueba.

**App publicada:** https://nestor-forex.github.io/Nestor-forex/
(GitHub Pages, se republica solo con cada push a `main` vía
`.github/workflows/preview-pages.yml` — ver sección "Cómo se publica" abajo).

**Proyecto de Firebase:** `nestor-forex` (consola: console.firebase.google.com).
Config real ya está commiteada en `app/.env.production` (no es secreta: es
config de app web de Firebase, documentado como seguro de publicar).

**Administrador:** identificado por correo, no por PIN. Correo actual:
`nesdian2204@gmail.com` (constante `ADMIN_EMAIL` en `app/src/lib/firebase.js`
y hardcodeado también en `firestore.rules` — si cambia, hay que actualizar
AMBOS lugares y volver a publicar las reglas en la consola de Firebase).
Quien se registre con ese correo queda auto-aprobado (ver `useAuthUser.js`).

## Arquitectura

```
app/                          # la app real (React 19 + Vite 8)
  src/
    App.jsx                   # estado raíz: splash/auth/pendiente/app, tabs
    components/                # una pantalla o pieza de UI por archivo
      SetupDetalle.jsx         # detalle de un setup: gráfico + niveles + R/B (ver idea 5)
      SelectorIdioma.jsx       # botón de idioma (ver idea 7)
    lib/
      i18n/                    # idiomas: textos/<codigo>.js, crearT.js, index.jsx, idiomas.js
      firebase.js              # init de Firebase desde import.meta.env
      useAuthUser.js           # sesión + perfil Firestore en vivo, registrar/ingresar/salir
      useMembers.js            # listado en vivo de users/ para el admin
      useTrades.js             # diario de operaciones en users/{uid}/trades
      useMarketData.js         # lee el barrido que publica el vigía (no pide precios)
      marketCalc.js            # los cálculos puros (EMA/RSI/ATR/fuerza/setups)
      calc.js                  # calculadora de lote/riesgo
      reporte.js                # genera el .md descargable del tablero completo
      display.js, format.js, pairs.js, authErrors.js  # helpers de UI/formato
  .env.production              # config real de Firebase (SÍ va al repo)
  .env.example                 # plantilla para .env.local (dev local)
firestore.rules                # reglas de seguridad (ver abajo)
firebase.json                  # solo referencia a firestore.rules (sin Hosting configurado)
.github/workflows/preview-pages.yml   # build + deploy a GitHub Pages en cada push
```

### Reglas de Firestore (`firestore.rules`)
- `users/{uid}`: cada quien lee/crea solo su propio doc (`estado` forzado a
  `'pendiente'` al crear). Solo el admin puede `list` (ver todos), `update`
  el `estado` de otros, o `delete` (retirar).
- `users/{uid}/trades/{id}`: solo el dueño, y solo si su doc padre tiene
  `estado == 'aprobado'`.
- El admin se identifica en las reglas por `request.auth.token.email`, no
  por UID (evita el problema de "quién aprueba al primer admin").

### Cómo se publica
`preview-pages.yml` corre en cada push a `main` (y a la rama de trabajo
`claude/forex-barrido-diario-app-ws3bbu` mientras hay un PR abierto):
compila `app/` con Vite (`--base=/Nestor-forex/`) y publica a GitHub Pages.
**Importante:** el "environment" `github-pages` de GitHub solo permite
desplegar desde `main` — un push a cualquier otra rama compila bien pero el
job `deploy` falla al instante (sin logs) por política de GitHub, no por un
bug. Eso es normal y esperado; se resuelve fusionando a `main`.

Como la rama de trabajo actual **no** está en esa lista de `branches`, un
push a ella no dispara ningún workflow: en los PR salen **cero
verificaciones**, y eso es lo normal aquí, no una falla. La verificación
hay que hacerla a mano (compilar, y si el cambio es visual, abrirlo en un
navegador y mirar capturas).

No pude crear "Variables"/"Secrets" del repo desde este entorno (el proxy de
red de la sesión bloquea esos endpoints de la API de GitHub Actions) — por
eso la config de Firebase quedó commiteada directo en `.env.production` en
vez de inyectarse por CI.

## Limitaciones conocidas (a propósito, documentadas en la UI)
- Datos del barrido: **velas diarias reales** de Twelve Data (máximo, mínimo
  y cierre), una vela por día. Desde el 2026-08-09; antes eran los cierres
  del BCE vía Frankfurter — ver "Cambio de fuente de datos" más abajo. No hay
  intradía (para eso está la app hermana) ni spread/volumen real de bróker.
- El PIN de admin de las fases 1–2 ya NO existe; no confundir con nada de
  lo que quede en el historial de commits de esas fases.
- El ícono/manifest de la PWA (`app/public/pwa-*.png`) es un placeholder
  generado por `app/scripts/make-icons.mjs`, no un diseño de marca real.

## Ideas para seguir puliendo
El usuario pidió (2026-07-22) seguir mejorando la app "hasta dejarla
perfecta para ayuda de inversión en trading" y confirmó que quiere las 4
ideas propuestas ese día, empezando por la del gráfico. Estado:

1. ✅ **Hecho (2026-07-22):** gráfico/sparkline de precio por par + sus
   números (precio actual y % de cambio en 20 días) en el tablero completo.
   `Sparkline.jsx` (SVG puro, sin librería), datos vía `serie20`/`cambio20`
   agregados en `marketCalc.js` (`computarBarrido` y `derivarVista`). Verde
   si el cierre subió en esos 20 días, rojo si bajó. Solo en el tablero
   completo, no en la pestaña Barrido compacta (a propósito, para no
   saturar esa vista rápida).
   ⚠️ El usuario probó la app publicada y dijo "no vi muchos cambios" —
   ya se publicó bien (verificado por captura de pantalla contra un build
   real antes de fusionar), así que lo más probable es que: (a) haya
   mirado la pestaña Barrido compacta en vez de entrar a "Ver tablero
   completo →", donde SÍ está el gráfico, o (b) el service worker de la
   PWA le haya servido una versión en caché. Si en la próxima sesión
   sigue sin verlo, confirmar primero con captura de pantalla del usuario
   antes de asumir que el código está mal.
   📌 **Lección confirmada (2026-07-30):** el mismo "no aparece nada
   nuevo" volvió a pasar con la pantalla de detalle, y la captura que
   mandó Néstor lo resolvió en un minuto: estaba en el tablero completo
   correcto, pero **en la app de Swing buscando algo que solo existía en
   Intradía**. No era caché ni un bug. Moraleja doble: (a) pedir captura
   antes de teorizar, y (b) al terminar un cambio, decir explícitamente
   **en cuál de las dos apps** quedó — son casi idénticas por dentro y
   Néstor las usa las dos.
2. ✅ **Hecho (2026-07-24):** aviso de riesgo correlacionado en el Diario.
   Cada operación ahora se guarda como "abierta" o "cerrada" (checkbox
   "Sigue abierta" en el formulario; las abiertas no piden resultado USD
   todavía). Las operaciones abiertas muestran un botón "Cerrar" que pide
   el resultado final y las pasa a cerradas (`useTrades.cerrar`, usa
   `updateDoc`, ya cubierto por las reglas de Firestore existentes — no
   hubo que tocar `firestore.rules`). Si 2+ operaciones abiertas comparten
   una divisa (ej. EUR/USD y EUR/CHF comparten EUR), aparece una tarjeta
   de aviso arriba de la lista explicando que es "una sola apuesta más
   grande". Estadísticas (% ganadas, P/L) solo cuentan cerradas.
   `monedasDe()` en `pairs.js`, lógica en `DiarioTab.jsx`.
3. ✅ **Hecho (2026-07-24):** glosario in-app. Tarjeta colapsable
   "¿Qué significan estos términos?" (`Glosario.jsx`) al inicio del
   tablero completo, con definiciones simples de fuerza relativa, sesgo,
   tendencia, RSI, ATR%, EMA20/50, R/B, soporte/resistencia, stop-loss,
   take-profit e invalidación. Cerrada por defecto para no estorbar.
4. ✅ **Hecho (2026-07-24):** pulir apariencia de app instalada.
   - Ícono real: `make-icons.mjs` ahora dibuja 3 barras ascendientes en
     el verde de la app (motivo de tendencia alcista/velas) en vez del
     cuadrado sólido de antes. Se le preguntó al usuario si quería pasar
     su propio logo pero no respondió esa parte del mensaje, así que se
     hizo este diseño simple por defecto — si más adelante Néstor quiere
     un logo propio, se reemplaza regenerando `app/public/pwa-*.png` (o
     encargándole el diseño a alguien y pegando los PNG directo).
   - Pantalla de carga con marca: `CargandoApp.jsx` (eyebrow + nombre de
     la app + 3 barritas animadas) reemplaza el texto plano "Cargando…"
     tanto al abrir la app (mientras Firebase Auth resuelve la sesión)
     como mientras se carga el perfil de Firestore justo después de
     iniciar sesión. `Pendiente.jsx` (con su tarjeta ámbar) quedó solo
     para el estado real de "solicitud pendiente de aprobación".
   - Barrido visible sin internet: `useMarketData.js` ahora guarda en
     caché (localStorage) la última descarga exitosa sin importar el
     día, y si el fetch falla (sin conexión) la reutiliza mostrando un
     aviso ámbar "Sin conexión — mostrando el barrido guardado del
     [fecha]" en la pestaña Barrido y en el tablero completo. Antes solo
     se usaba la caché si era del mismo día; si cambiaba el día sin
     internet, la app mostraba error en vez de datos.

5. ✅ **Hecho (2026-07-30):** pantalla de detalle de la señal
   (`SetupDetalle.jsx`). Cada setup del tablero completo tiene un botón
   "Ver la señal en detalle →" que abre una pantalla propia con el gráfico
   de los últimos 20 cierres y los niveles dibujados encima: stop, precio
   actual y objetivo como pastillas a la derecha; soporte y resistencia
   como líneas de contexto. El color va por **lo que significa en plata**
   (rojo el stop, verde el objetivo), no por dirección del precio. Trae la
   relación riesgo/beneficio como barra proporcional con las distancias en
   pips (ámbar y con aviso si baja de 1:1.5), el escenario en texto, la
   tabla de niveles, el porqué (fuerza, RSI, ATR) y la invalidación.
   "Anotar en el Diario" precarga par, dirección y una nota con los
   niveles, y la deja como operación abierta (el lote no, porque depende
   de cuánto se quiera arriesgar).
   - Se hizo **primero en Intradía** (PR #5 de ese repo) y después se
     portó aquí (PR #14). Aquí **no lleva la línea del pivote** porque el
     barrido diario no lo calcula, usa EMA20 en vez de EMA9, y el pie del
     gráfico habla de días en vez de horas.
   - `mkSetup` en `marketCalc.js` adjunta un objeto `crudo` con los datos
     sin formatear. Los campos de texto que ya existían quedan intactos,
     así que el tablero y el reporte `.md` siguen igual — cambio aditivo.
   - El setup abierto se guarda por **nombre + lado**, no por objeto, para
     que la pantalla siga los datos si el barrido se recarga.
   - A propósito **no dibuja velas** (la fuente da un cierre por día, sin
     máximo ni mínimo: serían inventadas) y **no tiene botones de
     comprar/vender** (la app no está conectada a ningún bróker).
   - Revisar esta pantalla en un navegador de verdad valió la pena: en
     Intradía sacó a la luz dos errores que el build no ve (etiquetas de
     soporte/resistencia tachadas por las líneas que se pintan después, y
     un `id` de degradado fijo que hacía que dos gráficos en la misma
     página compartieran color — ahora `useId()`). Si se toca esta
     pantalla, volver a revisarla con capturas, no solo compilar.
6. ✅ **Hecho (2026-07-30):** arreglada la dirección de arranque del ícono
   instalable. El manifest tenía `start_url` y `scope` fijos en `'/'`, pero
   la app se sirve en `/Nestor-forex/`, así que el ícono de la pantalla de
   inicio abría la raíz del dominio (donde no hay nada) en vez de la app.
   **La app hermana tenía el mismo error** y se corrigió igual. Ahora
   ambos campos se **omiten** en `vite.config.js` para que
   `vite-plugin-pwa` los derive del `base` de Vite (su comportamiento por
   defecto), que el workflow pasa como `--base=/<nombre-del-repo>/`. Así
   queda bien en producción y en dev local (donde el base es `/`), sin
   una ruta escrita a mano que alguien tenga que recordar actualizar.
   ⚠️ Un ícono ya instalado guarda el `start_url` viejo: hay que
   **desinstalar y volver a instalar** la app, recargar no basta.
7. ✅ **Hecho (2026-07-30):** botón de idioma con **13 idiomas** (español,
   inglés, alemán, francés, portugués, italiano, chino, japonés, ruso,
   árabe, turco, hindi y coreano). Néstor pidió primero 3 idiomas, luego
   "muchos más", y se cerró en 13 incluyendo el árabe con su diseño
   volteado. Va en la cabecera, la portada, el ingreso y la pantalla de
   pendiente. Se hizo primero en Intradía (PR #7 de ese repo) y se portó
   aquí (PR #15).
   - `lib/i18n/textos/<codigo>.js`: un diccionario por idioma, 199 claves.
     `lib/i18n/crearT.js`: el motor, **sin React**, para que
     `scripts/reporte-diario.mjs` (que corre en Node) traduzca igual.
     `lib/i18n/index.jsx`: idioma actual, guardado en el dispositivo.
     `lib/i18n/idiomas.js`: lista de idiomas, cuáles son RTL y el `locale`
     de cada uno. `components/SelectorIdioma.jsx`: el botón.
   - El español es la fuente de verdad **y el respaldo, clave por clave**:
     un idioma incompleto muestra en español solo lo que le falte.
   - **Los términos de trading no se traducen** (RSI, ATR, EMA, Stop-loss,
     Take-profit, Pip, Spread, R/B, Forex) y la dirección va BUY/SELL en
     todos los idiomas menos español, que conserva COMPRA/VENTA.
   - ⚠️ **Lo que se guarda en Firestore NO se traduce**: `dir` sigue siendo
     `'Compra'`/`'Venta'` y `estado` sigue siendo `'abierta'`/`'cerrada'`.
     Solo cambia cómo se muestran. Si se tradujeran, las operaciones ya
     guardadas dejarían de coincidir. Lo mismo con los valores internos de
     `clasificar()` (COMPRA/VENTA/VIGILAR) y de `tend`.
   - Las frases que llevan números dentro son **funciones** en el
     diccionario, no concatenaciones: cada idioma ordena la frase distinto.
   - Las fechas usan el `locale` del idioma (`format.js` lo recibe): no
     basta traducir las palabras, cambia el orden de día y mes.
   - `sesionActiva()` pasó a llamarse `claveSesionActiva()` y devuelve la
     **clave**, no el texto: así sigue sirviendo desde Node y desde la app.
   - Errores que salieron al revisarlo en navegador, ya corregidos: el
     gráfico heredaba `dir="rtl"` en árabe y el texto de las etiquetas se
     dibujaba al revés (ahora el SVG se fija en `ltr`); en `DiarioTab` la
     letra `t` ya era cada operación y chocaba con la de traducir (pasó a
     `tr`); y `marketCalc.js` importaba sin extensión `.js`, que Vite
     resuelve pero **Node no** — habría roto el reporte diario.
   - Hay un script que compara los 13 diccionarios entre sí (mismas claves,
     mismos tipos, y ningún idioma con texto de otro alfabeto colado). No
     es paranoia: al escribirlos se coló una palabra rusa en el japonés y
     un carácter chino en el ruso.
   - Lo verificado es que **el sistema** funciona en los 13 idiomas, no que
     cada frase le suene natural a un nativo. Si alguien señala algo raro,
     se cambia una línea del archivo de ese idioma.
   - Para agregar un idioma: copiar `textos/es.js`, traducirlo, importarlo
     en `crearT.js` y añadir su entrada en `idiomas.js`. Nada más.

Otras ideas mencionadas pero no elegidas todavía (no implementar sin
confirmar primero):
- Historial/backtest de los setups sugeridos.
- Notificación por correo al admin ante solicitudes nuevas (necesitaría
  Cloud Functions — costo/infra nueva a evaluar).
- Dominio propio en vez de `nestor-forex.github.io`.
- (Explicaciones inline de términos para quien no sabe de trading quedó
  cubierta en buena parte por el glosario de la idea 3; si se retoma,
  sería para tooltips por término dentro de las tablas.)

## Convenciones de trabajo en este repo
- Rama de trabajo: **`claude/nestor-forex-review-pnue7l`** (la anterior,
  `claude/forex-barrido-diario-app-ws3bbu`, es la que sigue nombrada en
  `preview-pages.yml`). Si ya se fusionó su PR, reiniciarla desde `main`
  antes de seguir (no apilar commits nuevos sobre historial ya fusionado):
  `git fetch origin main && git checkout -B <rama> origin/main`.
  Ojo: los PR se fusionan con **squash**, así que el commit viejo de la
  rama NO queda como ancestro de `main` y el siguiente push necesita
  `--force-with-lease`. Antes de forzar, comprobar que la rama remota solo
  tenga historial ya fusionado (`git diff <tip-remoto> origin/main` sobre
  los archivos que tocó debe salir vacío).
- El usuario (Néstor) **no sabe programar** — cada explicación debe ser en
  términos simples, sin jerga, y cada paso que requiera clics en GitHub o
  Firebase debe darse número por número, indicando exactamente dónde hacer
  clic. Confirmar antes de fusionar PRs o tocar configuración compartida.
- Antes de cada fase/tarea grande, avisar qué se va a hacer y esperar
  confirmación (así se ha trabajado hasta ahora).

---

# Lo que se hizo el 2026-08-09

Tres cosas grandes, en este orden y por esta razón: primero arreglar de dónde
salen los datos, después medir si acierta. Al revés habría sido medir señales
calculadas con datos incompletos.

## 1. Avisos push al celular

Portado de la app hermana (`nestor-forex/nestor-forex-intradia`), que lo tenía
desde el día anterior. Néstor eligió avisos **de la propia app** (Web Push) en
vez de Telegram o correo, sabiendo que tomaba más días, porque es lo único que
permite que **cualquier miembro aprobado** active los suyos — no solo él.

Swing no tenía vigía, así que hubo que construírselo: sin algo que detecte
señales nuevas, no hay nada que avisar. Corre **una vez al día** (15:50 UTC),
no cada hora como el de intradía: las velas diarias cambian una vez al día.

```
app/src/sw.js                      # service worker propio: recibe el aviso
app/src/lib/push/vapid.js          # clave pública, compartida app+vigía
app/src/lib/push/soporte.js        # ¿puede este aparato?, y si no, por qué
app/src/lib/push/index.js          # activar/desactivar + guardar en Firestore
app/src/components/AvisosCard.jsx  # el interruptor, en la pestaña Barrido
app/scripts/vigia.mjs              # el vigía diario
app/scripts/lib/push-envio.mjs     # armar el mensaje y mandarlo
app/scripts/prueba-aviso-real.mjs  # mandar un aviso de prueba a mano
.github/workflows/vigia.yml
.github/workflows/prueba-avisos.yml
```

- Las suscripciones se guardan con `app: 'swing'` en la colección `pushSubs`.
  Los dos repos comparten proyecto de Firebase, así que **cada vigía solo debe
  escribirle a los aparatos de su app**. La prueba de avisos toma ese nombre
  del propio código (`APP`) en vez de tenerlo escrito, para que valga igual en
  las dos y nadie tenga que acordarse de cambiarlo al portarla.
- **Las mismas claves VAPID que intradía**, y el mismo JSON de cuenta de
  servicio. Néstor los pegó como secretos de ESTE repositorio también: los
  secretos son por repositorio, no por cuenta.
- ⚠️ **Los tres reportes por bolsa (Asia/Londres/NY) NO se portaron a
  propósito.** Aquí el precio se actualiza una vez al día, así que los tres
  llegarían con el texto idéntico. El reporte diario ya cubre eso.
- `idDe` tolera setups sin `tipo`: swing no tiene modo rango, y sin eso el
  identificador quedaría con la palabra "undefined" dentro para siempre.
- **Verificado con un aviso real que le sonó en el celular** (2 de 2
  entregados). Para volver a probarlo: Actions → "Probar los avisos al
  celular" → Run workflow. **NO** sirve lanzar el vigía para eso.

## 2. Cambio de fuente de datos: velas diarias reales

El más importante del día, y el que más cerca estuvo de salir mal.

**El problema.** El BCE publica solo el cierre de cada día. Con eso el ATR se
calculaba de cierre a cierre y los soportes salían de los extremos de los
CIERRES. Como **el stop se calcula desde el ATR**, salía demasiado estrecho.

**Lo medido** (`app/scripts/comparar-fuente.mjs`, Actions → "Comparar fuente
de datos"): el movimiento real es un **96% mayor** —mediana, rango +59% a
+171%—. Casi el doble.

| Par | Stop antes | Stop real | R/B que mostraba | R/B real |
|---|---|---|---|---|
| USD/CAD | **12 pips** | 40 | **14.99** | 4.70 |
| EUR/CAD | **12 pips** | 72 | **8.27** | 1.86 |
| GBP/CAD | **14 pips** | 92 | **8.01** | 1.59 |

Un stop de 12 pips en USD/CAD —que se mueve 40 en un día tranquilo— está
dentro del ruido normal. Y el denominador ficticio inflaba la relación
riesgo/beneficio hasta números que no existen en el mercado.

El filtro de R/B **no hubo que tocarlo**: pasan 8 con el método viejo y 7 con
el nuevo.

### ⚠️ El error que la medición destapó (no repetirlo)

La primera versión derivaba los cruces (EUR/CHF…) a partir de las divisas
contra el dólar. Para el máximo hay que combinar el máximo de una con el
mínimo de la otra, o sea **suponer que ambos extremos pasaron en el mismo
instante**. En velas de una hora (intradía) el error es pequeño; en velas de
un DÍA se dispara: daba ATR un **400% mayor del real** en los 7 cruces, que
habría puesto stops disparatados. Peor que lo que había.

Por eso `app/scripts/lib/velas.mjs` **pide los 14 pares DIRECTAMENTE**. Cuesta
14 créditos al día de los 800 gratis, y van en **dos tandas de 7 con una pausa
de 65 s**: el plan gratuito da 8 créditos por minuto y pedirlos de golpe daría
429 siempre.

### La app ya NO pide los precios

Frankfurter era gratis e ilimitado; Twelve Data da 8 consultas por minuto y
800 al día. Si cada miembro que abre la app pidiera los 14 pares, con un
puñado de personas se acabaría la cuota y con dos a la vez fallaría.

Ahora **el vigía consulta una vez al día y publica el barrido ya calculado**
en `estado/barrido.json` de la rama `datos`; `useMarketData.js` lee ese
archivo. Igual de fresco y aguanta los miembros que hagan falta.
`derivarVista` se sigue ejecutando en el navegador porque necesita el idioma.

⚠️ **`barrido.json` descarta `highs` y `lows` al publicarse.** Son 300 números
por par y solo los necesita el resolver, que corre en el propio vigía.
Dejarlos llevaría el archivo de **9 KB a más de medio mega**, y lo paga cada
miembro cada vez que abre la app.

### Otras cosas del cambio

- `computarBarrido(fechas, rates, rangosPar)`: `rangosPar` es **opcional**.
  Sin él se cae al método viejo **idéntico a antes**, y hay una prueba que lo
  comprueba (`prueba-marketcalc.mjs`) para que el cambio sea aditivo.
- ⚠️ `serie20` estuvo a punto de quedarse con los MÁXIMOS al reutilizar una
  variable: el gráfico dibuja **cierres**, no máximos. Tiene prueba propia.
- Los textos que decían "tasas de referencia BCE" eran falsos tras el cambio:
  corregidos en los 13 idiomas.
- Efecto práctico para Néstor: **con stops del doble de ancho, el lote baja a
  la mitad para arriesgar lo mismo.** La calculadora lo hace sola, pero los
  tamaños se ven distintos y no es un error.

## 3. Pantalla de historial: ¿acierta la app?

```
app/scripts/lib/resolver.mjs      # decide ganada/perdida mirando los días siguientes
app/src/lib/historialCalc.js      # las cuentas (compartido: Node y la app)
app/src/lib/useHistorial.js       # baja los datos de la rama `datos`
app/src/components/HistorialTab.jsx  # la pantalla (4ª pestaña)
app/scripts/prueba-resolver.mjs   # 22 comprobaciones, sin internet
```

**Aquí el cálculo es EXACTO en los 14 pares**, porque se piden todos directos.
En intradía los cruces se derivan y su pantalla tiene que separar cuentas
fiables de aproximadas; aquí esa advertencia sobra y se quitó. Un solo
porcentaje, y de fiar.

### Decisiones que NO hay que ablandar

- **Si un mismo día toca el stop y el objetivo, cuenta como PERDIDA.** El día
  solo guarda máximo y mínimo, no el orden. Se elige el peor caso a propósito:
  un historial que se equivoca a favor propio no sirve para decidir si
  arriesgar dinero.
- **El día en que aparece la señal no cuenta**, solo los posteriores: la
  entrada es a su cierre.
- Señales identificadas por `id@vistoEl`, no por `id`: la misma combinación
  par/lado reaparece y cada aparición es una operación distinta.
- Una señal cuyo día ya no está entre los 300 descargados se marca `caducada`
  en vez de reintentarse cada día para siempre.

## Estado y qué mirar la próxima vez

Todo verificado y publicado. El vigía corrió por primera vez el 2026-08-09 y
dejó 6 señales registradas.

⚠️ **Las 6 tenían R/B entre 0.58 y 0.85, o sea por debajo del filtro de 1.5,
así que ninguna despertó el celular.** Con los datos viejos varias habrían
mostrado R/B de 6, 8 o 15 —falsos, por el stop estrecho—. Es el filtro
haciendo su trabajo, pero **hay que vigilarlo**: si se repite que la app
encuentra señales y ninguna llega a 1.5, nunca sonará el celular. Puede
significar que el mercado está feo o que la fórmula del objetivo se queda
corta. El historial lo dirá.

Las tres preguntas abiertas, para revisar con una semana de datos:

1. **¿Acierta?** Ya está acumulando. Es el número que hace falta para vender.
2. **¿El filtro de 1.5 deja algo o deja seco?** Ver arriba.
3. **El reloj de GitHub se salta horas.** Medido en la app hermana: 3 corridas
   donde tocaban 13, con un hueco de 7,6 horas seguidas. Para un vigía diario
   importa menos que para uno por hora, pero si un día no corre, no corrió.
