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

## Landing page de venta / suscripción (2026-07-27, en curso)

El usuario pidió una **página web de presentación/venta de las señales**
(no las señales en sí — esas solo se ven dentro de las apps), publicada
como un **Artifact** (página HTML autónoma, no parte del repo/deploy de
GitHub Pages). Esto es un encargo aparte de las apps Swing/Intradía.

### Requisitos del usuario, tal cual los dio

**Mensaje 1 (el pedido original, en sus palabras):** quiere que la página
explique el beneficio de las dos apps para señales (swing e intradía) que
llegan "a las 08:00 am y 05:00 pm respectivamente", para que el suscriptor
copie y entre en la operación. Debe explicar los pasos para pagar la
mensualidad vía Binance, y que el usuario entienda que **se le retira el
acceso si no renueva el pago a tiempo**. Presentación profesional, vistosa
e interesante, con información detallada de qué hacen para dar las mejores
señales. Por ahora cubren swing e intradía; más adelante ampliarán a otros
activos y estrategias.

**Mensaje 2 (recomendación "de industria" que el usuario pegó y pidió
guardar tal cual):** el usuario compartió un análisis (aparentemente de
otra IA/fuente) recomendando estructura y estilo para la página, y pidió
explícitamente recordarlo tal cual quedó. Resumen fiel de esos puntos:

- **Estilo visual:** modo oscuro tipo "institucional-tech" (azul marino/negro),
  acentos vibrantes controlados para CTAs, tipografía sans limpia, gráficos
  de velas/redes abstractas en vez de fotos de stock.
- **Estructura de landing:** Hero (titular orientado a beneficio + CTA) →
  Problema vs. Solución → Beneficios clave (claridad de señales con
  entrada/SL/TP, doble estrategia, gestión de riesgo con R:B mínimo 1:2) →
  Explicación detallada de cada app → Precios (plan Intradía, plan Swing,
  plan Completo con descuento) → Flujo de pago Binance paso a paso →
  Política de renovación/cancelación como FAQ → Señales de confianza
  (disclaimer legal de riesgo, aviso de privacidad, contacto visible,
  transparencia del equipo).
- **Pago Binance sugerido:** elegir plan → abrir Binance, ir a "Pay" →
  escanear QR / ingresar ID del merchant → enviar comprobante/hash por
  WhatsApp/Telegram/correo → activación en menos de 1 hora con credenciales
  y enlaces de descarga.
- **Renovación:** ciclo de 30 días desde la confirmación del pago, sin cobro
  automático; si no se renueva antes del vencimiento el acceso se desactiva
  solo; recordatorio 3 días antes del vencimiento.
- **Disclaimer sugerido:** el trading en Forex conlleva alto riesgo, puede
  no ser adecuado para todos, los análisis son informativos/educativos, y
  resultados pasados no garantizan resultados futuros.

✅ **Horarios confirmados por el usuario (2026-07-27):** Intradía = 08:00 am,
Swing = 05:00 pm. Coincide con el mapeo del mensaje 2, que es el que ya
quedó usado en la primera versión del Artifact — no hubo que corregir nada.

El usuario también pidió (2026-07-27) agregar que **la app Intradía
también tiene el barrido/screener diario de mercado** (la misma idea que
en Swing — fuerza relativa entre divisas — pero adaptada a velas de 1
hora en vez de cierres diarios). Se agregó como viñeta en la tarjeta de
Intradía del Artifact.

⚠️ **Cambio de horario (2026-07-27, el mismo día):** el usuario pidió mover
el horario de **Swing de 5:00 pm a 10:30 am** (Intradía se queda igual, a
las 8:00 am). Ya se actualizó en el Artifact: el arco de 24h (posición del
marcador teal, gradiente), la tarjeta de la app Swing, el mock de señal,
los tres planes de precio y la leyenda del arco. También se ajustó el
texto "con el cierre diario ya confirmado" a "con el cierre del día
anterior ya confirmado", porque a las 10:30 am el día de trading todavía
no ha cerrado — ya no tiene sentido decir que el barrido llega después
del cierre del día. Si en el futuro se vuelve a mover el horario de
Swing, revisar ese mismo texto por la misma razón.

**Comportamiento real de datos en ambas apps (2026-07-27, aclarado por el
usuario):** cada app busca sus propios datos solo cuando alguien la abre
(no hay push ni backend empujando datos solo). Además, **Intradía se
sigue actualizando cada 15 minutos mientras la tienes abierta**, lo que
la acerca a señales en tiempo real y permite operar a cualquier hora del
día. Con esto el usuario pidió agregar dos aclaraciones a la landing:
- Recomendación: cerrar las operaciones antes de que cierre el mercado,
  aproximadamente a las 3:00 pm.
- La entrada de las 8:00 am sigue siendo la ideal para abrir operaciones,
  por el empalme entre las sesiones de Londres y Nueva York — así se
  aprovecha el arranque/inicio del mercado con las primeras señales de
  Nestor Forex del día.
Se agregó como nota destacada en la tarjeta de la app Intradía del
Artifact, más una línea general aclarando que ambas apps solo buscan
datos al abrirlas.

**Corrección (2026-07-27): Intradía ya está publicada, no es "Próximamente".**
El usuario aclaró que la app Intradía ya está construida y funcionando
(la creó en otra sesión de Claude Code, en el repo separado
`nestor-forex/nestor-forex-intradia`), con este detalle técnico real
que dio tal cual y que ya quedó reflejado en las tarjetas del Artifact:

| | Nestor Forex Swing | Nestor Forex Intradía |
|---|---|---|
| Para qué sirve | Operaciones de horas a días | Abrir y cerrar el mismo día |
| Fuente de precios | Twelve Data, 1 vela diaria (máximo, mínimo y cierre) | Twelve Data, velas de 1 hora |
| Tendencia | EMA20 / EMA50 | EMA9 / EMA21 (más rápidas) |
| RSI / ATR | ATR de Wilder sobre velas diarias; RSI sobre cierres | Sobre velas de 1 hora |
| Fuerza relativa | Ventanas de 1, 5 y 20 días | Ventanas de 1, 4 y 24 horas |
| Extra | — | Puntos pivote de sesión |

Confirmó por `AskUserQuestion` que la app Intradía está publicada en
GitHub Pages con el mismo patrón que Swing:
`https://nestor-forex.github.io/nestor-forex-intradia/` — ya se usó ese
enlace real en la tarjeta "Abrir la app Intradía →" del Artifact, se
quitó la insignia "Próximamente" y el texto "App en preparación", y se
actualizaron las viñetas de ambas tarjetas con estos datos técnicos
reales en vez de descripciones genéricas.

### Datos que el usuario NO confirmó (se usaron valores por defecto)
Se preguntó dos veces (precio de los planes, cómo mostrar el pago Binance,
canal de contacto, si ya existe link de la app Intradía) y no hubo
respuesta ninguna de las dos veces, así que se avanzó con valores por
defecto marcados para editar después:
- **Precios:** placeholders de ejemplo, claramente editables en el código.
- **Pago Binance:** flujo seguro sin exponer ID/QR real públicamente (se
  pide escribir por correo/WhatsApp para recibirlo) — evita que se clone
  un QR falso.
- **Contacto:** correo `nesdian2204@gmail.com` (el único dato de contacto
  real disponible).

Estos valores por defecto quedan pendientes de que Néstor los confirme o
corrija en una próxima sesión.

### ⚠️ Al desempolvar esto (nota del 2026-08-24)

Este bloque se escribió el 2026-07-27 y quedó sin fusionar casi un mes. Se
fusiona ahora porque es el ÚNICO sitio donde están escritos los requisitos
que dio Néstor para la landing; sin él se perderían. Pero la app cambió
debajo mientras tanto, así que antes de construir nada con esto hay que
comprobar contra el estado de hoy. Lo que ya se sabe que cambió:

- **La fuente de datos de Swing.** El 2026-08-09 pasó del BCE (un cierre
  por día, sin máximo ni mínimo) a velas diarias reales de Twelve Data. La
  tabla comparativa de arriba ya está corregida; cualquier texto de venta
  que hable de "tasas de referencia del BCE" para Swing es falso.
- **Los horarios de envío.** Aquí quedaron en Intradía 8:00 am y Swing
  10:30 am. Hoy quien manda avisos es el vigía de cada app, y el de Swing
  corre a las 15:50 UTC. Confirmar con Néstor antes de prometer una hora.
- **Los precios y el flujo de pago** siguen siendo valores de ejemplo. No
  publicar la landing sin que él los confirme.
- **Lo que la landing NO puede prometer todavía:** no hay ningún número de
  acierto verificado. Sobre 3 años, Intradía no tiene ventaja después de
  costes en ninguna de sus reglas, y en Swing lo único que mide positivo
  corre en la sombra sin enseñarse. Vender "señales con resultados
  positivos" antes de tener ese número sería vender algo que no existe.

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

---

# El filtro del RSI en Swing (2026-08-25): NO funciona aquí

Medido de frente sobre 1.436 días (2021-06-09 a 2026-08-25), solo señales de
la app, vara neutra 1:1, spread descontado. Las mitades parten en 2024-05-07.

| Umbral | Ops | Acierto | Por 1R | 1ª mitad | 2ª mitad |
|---|---:|---:|---:|---:|---:|
| **Sin filtro (hoy)** | 1.785 | 48% | **−0,06** | −0,10 | −0,02 |
| Rechaza si RSI ≥ 80 | 1.828 | 47% | −0,07 | −0,11 | −0,03 |
| Rechaza si RSI ≥ 75 | 1.929 | 47% | −0,08 | −0,12 | −0,05 |
| Rechaza si RSI ≥ 70 | 2.108 | 47% | −0,08 | −0,10 | −0,05 |
| Rechaza si RSI ≥ 65 | 2.246 | 48% | −0,06 | −0,09 | −0,04 |
| Rechaza si RSI ≥ 60 | 1.859 | 47% | −0,08 | −0,06 | −0,09 |

**Ningún umbral mejora nada.** Sin filtro da −0,06 y con filtro va de −0,06 a
−0,08. Con la geometría real de la app, igual: −0,03 sin filtro contra −0,03 y
−0,04 con él.

`RSI_MAX` se queda en `null`. **Apagado.**

## Por qué esto era importante medirlo aparte

En intradía el mismo filtro sí mejora algo (−0,12 → −0,10) y se encendió en
70. Era tentador copiar el número. **Habría sido un error**: aquí son velas
diarias, otras medias y otro horizonte, y el RSI de un día no significa lo
mismo que el de una hora.

⚠️ **Regla para la próxima vez: lo que se mide en una app no vale para la
otra.** Son casi idénticas por dentro y por eso es tan fácil colar un número
prestado.

## El detalle que hay que entender antes de leer esta tabla

**Con el filtro salen MÁS operaciones, no menos** (1.785 → 2.108). Suena
imposible para un filtro, y no lo es: la app se queda con los 5 mejores por
lado. Cuando el filtro rechaza un par extendido, el siguiente de la lista SUBE
a ese hueco, y como entra y sale en fechas distintas, cuenta como operación
nueva.

O sea que el filtro **no quita señales: las cambia por otras**. La medición no
es "la app menos las malas" sino "la app con otras señales", y aquí las otras
no son mejores.

Esto se destapó al portar la prueba desde intradía, donde una comprobación
afirmaba "solo quita, nunca añade" y pasaba solo porque el mercado sintético
dejaba una sola señal. Está corregido en los dos repos.

## Lo que sigue siendo lo mejor medido en Swing

La regla de **reversión** (comprar lo débil, vender lo fuerte, con el RSI
estirado), que corre en la sombra:

| | Ops | Acierto | Por 1R con spread | 1ª mitad | 2ª mitad |
|---|---:|---:|---:|---:|---:|
| M2. Reversión con RSI estirado | 870 | 55% | **+0,09** | +0,14 | +0,05 |
| Las compras de la app | 917 | 49% | −0,03 | — | — |

Y el barrido de umbrales vecinos sale positivo en los seis (de +0,15 a +0,01),
que es la firma de un efecto real y no de una curva ajustada.

⚠️ **Pero en el historial REAL va 0 de 5.** Cinco operaciones no son nada, y
van en dirección contraria a lo medido. Por eso sigue en la sombra: hasta que
acumule 150-200 operaciones reales, el backtest y la realidad no se han puesto
de acuerdo.

---

# El objetivo, el stop, y el espejismo que NO era (2026-08-25)

Néstor vio su Historial en 89% de acierto con +252 pips sobre 9 operaciones y
pidió que se midiera con objetividad. Salieron dos respuestas, y una de ellas
desmiente lo que yo había predicho.

## 1. La pantalla de Historial NO engaña. Mi hipótesis era falsa

Yo dije que el número estaría inflado por una razón mecánica: como el objetivo
está más cerca que el stop, las ganadas se resolverían rápido y las perdidas se
quedarían colgadas en "en curso", así que la pantalla siempre enseñaría de más
las ganadoras.

**Medido sobre 1.768 operaciones en 5 años, eso no pasa:**

| | Ops | Mediana | Media |
|---|---:|---:|---:|
| Ganadas | 971 | 12 días | 19,0 |
| Perdidas | 797 | 13 días | 17,6 |

Tardan prácticamente lo mismo. Y simulando la pantalla en **216 fechas**
repartidas por los 5 años:

| | |
|---|---|
| Lo que habría MOSTRADO el Historial | 54,3% |
| Lo que esas señales acabaron dando | 54,5% |
| **El espejismo** | **−0,2 puntos** |

Cero. La pantalla dice la verdad.

⚠️ **Esto queda escrito porque yo presenté la hipótesis con seguridad antes de
medirla.** El razonamiento sonaba impecable —objetivo cerca, stop lejos, luego
sesgo— y era falso. La lección es la misma de siempre y sigue costando: un
mecanismo que suena convincente no es un resultado hasta que se mide.

**Consecuencia práctica:** el 89% de Néstor no es un artefacto de la pantalla.
Es simplemente una muestra de 9. Con 9 operaciones, un 89% real y un 55% real
no se distinguen — sacar 8 o 9 aciertos de 9 con una moneda al 55% tiene un 3,9%
de probabilidad, una de cada 26.

## 2. Mover el stop y el objetivo NO salva a la app

Doce combinaciones, mismas señales, mismos días, mismos pares. Con spread.

| Stop | Objetivo | Ops | Acierto | Por 1R | Hace falta |
|---|---|---:|---:|---:|---:|
| 1× ATR | 0,75× riesgo | 1.790 | 55% | −0,07 | 57% |
| 1× ATR | 1× | 1.789 | 47% | −0,08 | 50% |
| 1× ATR | 1,5× | 1.787 | 38% | −0,07 | 40% |
| 1× ATR | 2× | 1.787 | 31% | −0,09 | 33% |
| 1,5× ATR | 0,75× | 1.788 | 54% | −0,06 | 57% |
| 1,5× ATR | 1× | 1.785 | 48% | −0,06 | 50% |
| 1,5× ATR | 1,5× | 1.783 | 38% | −0,07 | 40% |
| 1,5× ATR | 2× | 1.773 | 31% | −0,07 | 33% |
| **2× ATR** | **0,75×** | 1.784 | **55%** | **−0,04** | 57% |
| 2× ATR | 1× | 1.778 | 48% | −0,05 | 50% |
| 2× ATR | 1,5× | 1.763 | 38% | −0,05 | 40% |
| 2× ATR | 2× | 1.751 | 30% | −0,12 | 33% |

**Las doce pierden, y las doce se quedan por debajo de su acierto de
equilibrio.** La mejor (−0,04) es peor que la geometría que la app ya usa
(−0,03).

La columna "hace falta" es la que evita el autoengaño: con el objetivo al 0,75
del riesgo hay que acertar el **57%** solo para empatar. Un acierto del 55% con
el objetivo cerca no es ganar dinero, y sin esa columna al lado es facilísimo
confundir las dos cosas.

## Lo que esto cierra

**El problema de Swing no es dónde se ponen los niveles.** No hay colocación
que rescate un sistema que acierta el 48% con la vara neutra. Mover el stop y el
objetivo reparte el resultado entre acierto y tamaño, pero no crea ventaja donde
no la hay.

⚠️ **No volver a proponer "ajustar el stop" o "alargar el objetivo" para Swing.**
Está medido en rejilla completa. Lo que falta no es geometría: es acertar la
dirección más del 50% con una vara honesta, y eso solo lo tiene, por ahora, la
regla de reversión que corre en la sombra.

---

# Fase 2 (2026-09-02): contar lo que cuesta operar de verdad

Hecha en **las dos apps**. Swing en el PR #32, Intradía en el #32 de su repo.

Hasta ahora el banco de pruebas descontaba **1 pip de spread, igual para todos
los pares, y nada de swap**. Las dos cosas empujaban en la misma dirección:
hacían que las reglas parecieran mejores de lo que son.

## El spread ahora va por par

EUR/USD cuesta menos de 1 pip; NZD/CHF o EUR/NZD cuestan 3 o 4. Con un número
único los cruces salían baratos, y son la mitad de la lista. Están en
`app/scripts/lib/costes.mjs`, **a propósito en el lado alto de lo normal**: si
el número final sale bien con costes generosos, sale bien de verdad.

Para afinarlos: abrir la plataforma con el mercado abierto y cambiar el número.
Es el único sitio donde hay que tocarlo.

## El swap: la diferencia grande entre las dos apps

En **Swing** cada vela ES un día, así que las noches salen de `diasTardados`.

En **Intradía** no, y ahí estaba la sorpresa. Parecía razonable ignorar el swap
—la app se llama Intradía— pero eso es la INTENCIÓN, no lo que pasa. Medido
sobre las 42 operaciones reales ya resueltas:

| | |
|---|---:|
| duración mediana | 9 horas |
| duración media | 17,9 horas |
| la más larga | 102 horas |
| **cruzaron al menos una noche** | **22 de 42 (52%)** |

Y **no se cuenta por duración sino por los cortes reales de las 22:00 UTC**:
una operación de 6 horas abierta a las 20:00 cruza uno, y una de 20 horas
abierta a las 23:00 no cruza ninguno. Depende de la hora de entrada. Eso es
`nochesEntre()` en el `costes.mjs` de Intradía.

⚠️ No se elige un número de swap: depende del diferencial de tipos de cada
momento y del margen de cada bróker, cambia mes a mes y no hay histórico. Se
barren cinco niveles y se enseña **a partir de cuál cambia la conclusión**.

## Lo que más valió: sacar `medir()` del script

`medir()` y el barrido de swap vivían dentro de `backtest.mjs`, que necesita
descargar miles de velas para arrancar. De ellos salen TODOS los números con
los que se decide encender o apagar una regla, y eran lo único sin comprobar.
Ahora están en `lib/backtest-nucleo.mjs` con `prueba-costes.mjs` (47
comprobaciones, un segundo, sin gastar créditos).

**No es teórico:** al sacar el barrido de swap del script apareció que llamaba
a `generarSenales` con los argumentos cambiados. El linter no lo veía —los dos
nombres existían— y el fallo no habría salido hasta después de gastar los
créditos del día.

⚠️ **Lección para portar pruebas entre las dos apps:** la de costes se copió de
Swing y fallaron 5 comprobaciones. No era un error del código: los datos de
mentira de Swing traen `diasTardados`, que en Intradía no se mira. **Una prueba
portada que falla suele estar diciendo que las dos apps son distintas ahí, no
que el código nuevo esté mal.** Mirar eso primero.

---

# La app ya no le pide los precios a Twelve Data (2026-09-02, Intradía)

Swing ya funcionaba así desde el 2026-08-09. Esto lo trae a **Intradía**
(PR #33 de su repo). Ya fusionado, publicado y comprobado con datos reales.

## Los dos problemas que cierra

1. **La llave viajaba dentro de la app.** Cualquiera que abriera la página
   podía sacarla del JavaScript descargado. Mismo agujero que el de
   Capital.com, mismo camino. Comprobado sobre el build: la llave ya no
   aparece en `dist/`, ni la palabra «twelvedata».

2. **El techo de suscriptores era peor de lo que yo dije.** No eran ~20: cada
   apertura costaba 7 créditos **y se repetía cada 15 minutos con la app
   abierta**. Ocho horas abierta = 224 créditos. **Tres personas agotaban los
   800 del día.** Y al agotarse la app no avisa: deja de traer precios.

## Cómo quedó, y por qué así

El vigía sigue **exactamente igual, una vez por hora**. No se tocó a propósito:
anota las señales, las juzga y manda los avisos, y el historial es lo único de
este proyecto que no se puede recuperar si se estropea.

Aparte va `app/scripts/publicar-barrido.mjs`, que **solo** baja, calcula y
escribe `estado/barrido.json` en la rama `datos`. Corre **cada 30 minutos**
(`.github/workflows/publicar-barrido.yml`, minuto 50):

| cadencia | créditos/día | por qué no |
|---|---:|---|
| solo el vigía, cada hora | 168 | el reloj de GitHub se salta horas (medidos huecos de 7,6 h): un salto dejaría la app con datos de la mañana por la tarde |
| cada 15 min | 672 | cabe en 800, pero sin sitio para el reporte diario ni el banco de pruebas |
| **cada 30 min** | **336** | menos de la mitad, y **cada hora tiene dos oportunidades** de publicarse |

Total del día: 168 (vigía) + 168 (publicador) + 7 (reporte) = **343 de 800**.

⚠️ Lo que se pierde es **nada de señales**: la app calcula sobre velas de una
hora YA CERRADAS, y esas no se mueven. Solo el precio de la hora en curso pasa
de refrescarse cada 15 min a cada 30.

## La llave YA NO está en ninguno de los dos repositorios (2026-09-03)

Cerrado en **Intradía** (su PR #35) y en **Swing** (PR #35 de aquí). Néstor creó
el secreto `TWELVEDATA_KEY` **en cada repositorio** —los secretos son por
repositorio, no por cuenta— y solo entonces se borró la línea de
`.env.production`. Al revés se habrían quedado sin precios el vigía y el
reporte diario.

Era **la misma llave en los dos**, y comparten los 800 créditos del día. Por eso
no bastaba con sacarla de uno: mientras siguiera publicada en el otro, seguía a
la vista de cualquiera.

### Cómo se comprobó, antes y después

**Antes de borrar nada:** en el log del workflow sale `TWELVEDATA_KEY: ***`
—GitHub solo enmascara así un secreto que **existe y no está vacío**— y el
reporte salió con precios reales. Como `leerLlave` usa **primero** el secreto,
la llave que funcionó fue la del secreto, no la del archivo.

**Después de borrarla:** se lanzó el reporte otra vez sobre el commit que ya no
tiene la llave, y salió completo con precios reales en 65 segundos. Lo mismo se
hizo en Intradía con el publicador del barrido.

⚠️ **SI SE AÑADE UN WORKFLOW NUEVO** que llame a estos guiones, hay que pasarle
el secreto o fallará:

```yaml
    env:
      TWELVEDATA_KEY: ${{ secrets.TWELVEDATA_KEY }}
```

📌 **Esto no es hipotético.** Al hacer el cambio en Intradía apareció que
`comparar-reglas.yml` llamaba a estos guiones y **se había quedado sin el
`env`**. Habría fallado la próxima vez que alguien lo lanzara, y con la llave ya
borrada, sin explicación. **Revisar TODOS los workflows antes de borrar una
llave, no solo los que uno recuerda.**

### Dos cosas más que salieron de aquí, sin arreglar todavía

⚠️ **Los workflows de Swing no tienen `timeout-minutes`.** Sin él GitHub deja
correr un trabajo hasta **6 horas**. Los de Intradía sí lo tienen (el vigía, 10
minutos). Si un día uno se cuelga, bloquea la cola media jornada.

⚠️ **TODA la API de GitHub Actions va con retraso, no solo el estado.**

El estado dijo `in_progress` durante 10 minutos de un trabajo que había
terminado en 65 segundos. Ya había pasado el 2026-08-28.

📌 **Y aquí me equivoqué en el momento, así que queda escrito:** al ver que los
logs daban 404 mientras el estado decía `in_progress`, concluí que *los logs sí
eran fiables* —404 mientras corre, disponibles al terminar— y lo di por bueno.
**Es falso.** En la corrida siguiente los logs dieron 404 durante **13 minutos**
de un trabajo que también había terminado en 65 segundos. El 404 no distingue
«sigue corriendo» de «el log todavía no está publicado».

**Lo que hay que hacer, entonces:** no deducir nada de que algo tarde en
aparecer. Esperar, reintentar, y **fijarse en las marcas de tiempo DENTRO del
log** cuando por fin llegue — ahí sí está la verdad de cuándo empezó y cuándo
terminó. Un reporte de Swing tarda ~65 s (dos tandas con una pausa de 65 s en
medio); si el log dice más, entonces sí pasó algo.

## Comprobaciones nuevas

`app/scripts/prueba-barrido-publicado.mjs`: corre el barrido sobre un mercado
inventado, lo publica, lo relee **pasando por JSON como el navegador** y exige
que `derivarVista` saque la vista idéntica. Vigila los dos fallos invisibles:
que **falte un campo** (la app se ve rara, no da error) y que **se cuele una
serie larga** (18 KB → más de 400).

⚠️ **El mercado inventado costó varios intentos y la razón importa:** el
primero era una tendencia limpia, daba ADX 100 y **cero setups**, porque una
tendencia sin retrocesos deja el RSI clavado arriba y el filtro los rechaza
todos. La prueba pasaba comparando dos listas vacías. Ahora cada divisa lleva
una onda de periodo medio **con su propia fase**. Si se toca ese mercado, mirar
que la comprobación de "más de cero setups" siga pasando.

## Textos que habían quedado falsos

El pie decía «precio en vivo (se actualiza cada 15 min)», verdad cuando la app
llamaba a la API ella misma. Corregido en los **13 idiomas**, junto con
«Descargando velas H1 en vivo…». Comprobado que los 254 textos siguen
coincidiendo en clave y tipo en los 13.

⚠️ Intradía **no tiene** el comparador de diccionarios que sí tiene Swing. Se
comprobó a mano esta vez. Si se vuelven a tocar los idiomas ahí, conviene
portarlo.

## Cómo se verificó de verdad

No solo compilando. Con **Chromium**, sirviendo la app compilada y
alimentándola con el `barrido.json` **real de producción**: la pestaña Barrido
y el tablero completo pintaron enteros, en español, con precios reales
(EUR/USD 1.1585, una señal de venta en USD/JPY con sus niveles) y **cero
errores de consola**. Ninguna llamada a Twelve Data.

⚠️ GitHub Pages está **bloqueado** desde el entorno de estas sesiones, así que
la app publicada no se puede abrir desde aquí; `raw.githubusercontent.com` sí
se puede. Chromium tampoco sale a internet solo: hay que pasarle el proxy
(`proxy: { server: process.env.HTTPS_PROXY }`), y aun así falla contra algunos
destinos. Lo que sí funciona siempre es bajar el archivo con `curl` e
interceptar la petición en Playwright con ese contenido.


---

# Fase 3 (2026-09-03): que las dos apps no se separen en silencio

Hecha en **las dos apps** a la vez, que es justo de lo que trata.

## El problema, con nombres y apellidos

Swing e Intradía viven en repositorios separados y son casi idénticas por
dentro. Cada arreglo hay que hacerlo **dos veces**, y cuando se olvida una, no
falla nada: las dos siguen compilando, las dos siguen publicándose, y la
diferencia queda ahí meses hasta que alguien la busca.

Ya había pasado cuatro veces documentadas:

- el `start_url` del ícono instalable apuntaba a la raíz del dominio en las dos;
- la pantalla de detalle de la señal se hizo en Intradía y hubo que portarla;
- la llave de Twelve Data se sacó de un repositorio y siguió publicada en el
  otro — y era **la misma llave**, así que no sirvió hasta hacerlo en los dos;
- y un cierre de etiqueta que quedó en otra línea sin ninguna razón, solo
  porque alguien editó una app y no la otra.

## Lo medido antes de tocar nada

De los 82 archivos de código, **76 existen con el mismo nombre en las dos
apps**. Comparándolos uno a uno salieron tres grupos:

| grupo | cuántos | qué son |
|---|---:|---|
| idénticos | 23 | el armazón: sesión, miembros, idioma, avisos, calculadora |
| casi idénticos (1-15%) | 13 | difieren por la identidad de la app… o por nada |
| genuinamente distintos | el resto | las apps de verdad |

## Lo que se hizo

**1. `src/lib/identidad.js`** — el único archivo de `src/` que sabe si esto es
Swing o Intradía: `APP`, `NOMBRE_APP` y `PREFIJO` (`nfs`/`nfi`). Tres líneas
distintas, el resto igual. Con eso, tres archivos más pasaron a ser idénticos.

**2. Se borró el ruido.** Cuatro archivos (`Auth`, `Pendiente`, `MiembrosTab`,
`CalculadoraTab`) diferían SOLO en dónde iba el cierre de una etiqueta. Se
comprobó por máquina que la diferencia era únicamente espacios antes de tocar
nada.

**3. `scripts/gemelos.mjs`** — el manifiesto: qué archivos DEBEN ser idénticos
(30 hoy) y, aparte, la lista de **PRIMOS** con el motivo escrito de por qué
cada uno difiere. Esa segunda lista es documentación pura y vale tanto como la
primera: evita que alguien "arregle" una diferencia que existe por una buena
razón.

**4. `scripts/prueba-gemelos.mjs` + `.github/workflows/gemelos.yml`** — compara
contra el otro repositorio (que es público, se clona sin credenciales) en cada
push, en cada PR y una vez al día. Lo del día suelto no sobra: **la divergencia
puede nacer de un cambio en el OTRO repositorio**, y eso no dispara nada aquí.

## Las dos decisiones que no hay que ablandar

⚠️ **La lista de gemelos va ESCRITA A MANO.** Sería más cómodo calcularla
("todos los que hoy son iguales") y sería inútil: en cuanto dos archivos se
separaran, saldrían solos de la lista y la prueba seguiría en verde. Una prueba
que se adapta a lo que encuentra no comprueba nada.

⚠️ **NO se unifica nada de trading.** Pares, umbrales, medias, geometría del
stop: distintos en cada app por buenas razones y medidos por separado. Está
comprobado que el filtro de RSI mejora Intradía y empeora Swing. `identidad.js`
lleva un aviso para que nadie meta ahí un número de esos.

## Dos fallos que salieron al probar la propia prueba

📌 **La prueba ignoraba la ruta que se le pasaba a mano.** La trataba como una
candidata más y, si no le cuadraba, seguía buscando por su cuenta — o sea que
un robot con la ruta mal escrita habría acabado comparando contra otra cosa y
pasando en verde. Corregido: si se le da una ruta, se usa **esa y ninguna
otra**, y si no vale, falla.

📌 **Y al comprobar que la prueba "muerde" me equivoqué yo:** el comando con el
que rompí un archivo a propósito no cambió nada (insertaba texto antes de un
`import` y ese archivo no tenía ninguno), así que interpreté un falso "no
detecta" como fallo de la prueba. Al romperlo de verdad, sí falló. **Antes de
concluir que una comprobación no muerde, comprobar que el daño se hizo.**

## Cómo se verificó

Lint, build y **todas** las pruebas sin internet en los dos repos. Y en
**Chromium**, las dos apps compiladas: arrancan en español, y al cambiar de
idioma cada una guarda con **su** prefijo (`nfs_idioma` / `nfi_idioma`) — que
era exactamente lo que podía romperse al extraer la identidad — con cero
errores de consola.


---

# Fase 4 (2026-09-03): la reversión SÍ aguanta el swap. Me equivoqué otra vez

## Lo primero: un error mío, dicho antes que el resultado

Antes de medir escribí, con seguridad, que el swap probablemente se comería la
ventaja de la regla de reversión. El razonamiento parecía sólido: «las
operaciones de Swing duran 12-13 días de mediana, o sea doce noches pagando; a
0,5 pips por noche son 6 pips, y sobre un riesgo de 60 eso es 0,10 — más que de
sobra para borrar un +0,08».

**Era falso, y el fallo estaba en el dato de partida.** Esos 12-13 días son con
la geometría REAL de la app. Con la vara neutra 1:1, que es con la que se mide,
las operaciones duran **5 días de mediana**. La mitad de noches, la mitad de
coste.

⚠️ **Es la SEGUNDA vez que presento un mecanismo convincente y resulta falso**
(la primera fue el espejismo de la pantalla de Historial, el 2026-08-25). Las
dos veces el razonamiento sonaba impecable. La lección, otra vez: **un
mecanismo que suena bien no es un resultado hasta que se mide** — y conviene
comprobar de dónde sale cada número que se mete en la estimación.

## El número

Medido sobre 1.436 días (2021-06-22 a 2026-09-03), vara neutra 1:1, spread por
par de la Fase 2, y el swap barrido a cinco niveles.

**M2 — reversión con el RSI estirado, 872 ops, duran 5 días de mediana:**

| swap/noche | acierto | por 1R | coste medio |
|---|---:|---:|---:|
| sin costes | 55% | **+0,103** | — |
| solo spread | 55% | **+0,085** | 1,9 pips |
| + 0,25 | 55% | **+0,068** | 3,8 pips |
| + 0,50 | 55% | **+0,051** | 5,7 pips |
| + 1,00 | 55% | **+0,016** | 9,5 pips |
| + 2,00 | 55% | −0,052 | 17,1 pips |

**→ Deja de ganar por encima de 1 pip de swap por noche.**

Y las otras tres, para comparar — **ninguna aguanta**:

| regla | aguanta hasta |
|---|---|
| M1. Comprar lo débil, vender lo fuerte | 0 pips (se cae con cualquier swap) |
| M3. …y lejos de la media de 20 | 0 pips |
| M4. CONTROL: la inversión de antes | 0,25 pips |
| **M2. …y solo con el RSI estirado** | **1 pip** |

**La única que aguanta es la que lleva el filtro de RSI.** Eso refuerza que ese
filtro aporta algo real y no es un adorno.

Para situarlo: el swap típico de un par mayor está entre 0,2 y 1 pip por noche
según el par y la dirección, y en una de las dos direcciones a veces se COBRA
en vez de pagarse. O sea que 1 pip es el lado caro de lo normal. M2 llega justo
hasta ahí.

## Lo que esto NO autoriza a hacer

⚠️ **Sigue siendo un backtest.** Tres cosas frenan cualquier entusiasmo:

1. **Se debilita en la segunda mitad**: +0,13 en la primera y +0,04 en la
   segunda (con spread, sin swap). Positivo en las dos, pero decreciente.
2. **En el historial REAL va 0 de 5.** Cinco operaciones no son nada, pero van
   en dirección contraria a lo medido.
3. **A 0,5 pips de swap queda en +0,051.** Es positivo y es poco. No es un
   sistema del que se pueda decir «esto gana dinero» sin más.

Lo que sí cambia: **hay algo real que perseguir**, y ya no es una corazonada
sino un número que ha sobrevivido al spread por par, al swap, al barrido de
umbrales vecinos (positivo en los seis) y al troceo en dos mitades.

## Y la app tal cual, para no perder la perspectiva

| swap/noche | acierto | por 1R |
|---|---:|---:|
| sin costes | 48% | −0,050 |
| solo spread | 48% | −0,069 |
| + 0,50 | 48% | −0,101 |
| + 2,00 | 48% | −0,198 |

Lo que la app le enseña hoy a Néstor pierde en todos los niveles, y el swap
solo lo empeora. **La distancia entre lo que la app da y lo que la reversión
mide es la Fase 4 entera.**

---

# La confluencia de marcos temporales NO ayuda en Swing (2026-09-04)

Néstor vio una app de escritorio (TradePulse AI, en la Microsoft Store) que
anuncia «confluencia ponderada de 15m, 1h, 4h y 1D» y pidió probar ese método.
De toda su lista de funciones era **lo único que esta app no había medido
nunca**: RSI, ATR, stop y objetivo automáticos, calculadora de lote y alertas
ya estaban todos medidos aquí.

Aquí las velas son diarias, así que los marcos equivalentes son **diario,
semanal y mensual**. Se reagrupa la serie de verdad (`reagrupar` en
`marketCalc.js`), no se aproxima con una media diaria más larga: una EMA100
diaria NO es una EMA20 semanal.

Medido sobre 1.436 días (2021-06-23 a 2026-09-04), vara neutra 1:1, spread
por par, calentamiento 140 días para todas las filas.

| exigencia | ops | señ/mes | acierto | por 1R | 1ª mitad | 2ª mitad |
|---|---:|---:|---:|---:|---:|---:|
| **Sin filtro (hoy)** | 1.706 | 27,6 | 48% | **−0,06** | −0,08 | −0,04 |
| Al menos 1 marco largo | 1.516 | 24,6 | 47% | −0,07 | −0,10 | −0,05 |
| Los 2 marcos largos | 1.418 | 23,0 | 47% | −0,08 | −0,08 | −0,08 |
| CONTROL: ninguno acompaña | 427 | 6,9 | 52% | **+0,01** | −0,01 | +0,03 |

Con la geometría real de la app: sin filtro −0,03, con 1 marco −0,05, con 2
marcos −0,05, y el CONTROL **+0,03** (+823 pips sobre 422 operaciones).

**El filtro empeora, y empeora más cuanto más se exige.** `CONFLUENCIA_MIN` se
queda en `null`. **Apagado.**

## El control salió mejor que todo lo demás, y qué hacer con eso

Ir **en contra** de los marcos largos es lo único positivo de la tabla. No es
casualidad: apunta en la misma dirección que la reversión, que es la única
regla que ha medido positivo en todo el proyecto. Swing gana cuando compra lo
que se cayó, no cuando persigue lo que sube — y la confluencia es perseguir
con más pasos.

⚠️ **Pero NO se asciende el control a candidato.** Se diseñó como control, se
miró DESPUÉS de ver la tabla, y eso es exactamente el troceo a posteriori que
este proyecto lleva meses evitando. Además: +0,01 con la vara neutra es
prácticamente cero, va −0,01 en la primera mitad y +0,03 en la segunda (no es
estable), y deja **6,9 señales al mes contra 27,6**. Es una pista que confirma
la reversión, no un hallazgo propio.

## Un dato que conviene tener escrito

**El semanal coincide con el diario en el 78% de los pares, y el mensual
también.** O sea que el filtro casi siempre solo quita señales sin aportar
información nueva. Eso explica el resultado mejor que cualquier teoría: si un
marco repite lo que dice el otro, exigir que coincidan no es exigir nada.

📌 Y la trampa de siempre volvió a aparecer: **el filtro cambia las señales por
otras, no las quita.** La app se queda con los 5 mejores por lado, así que al
rechazar un par el siguiente sube al hueco y entra en otra fecha.

---

# Lo que se hizo con las apps que Néstor encontró (2026-09-04)

Mandó capturas de dos productos y pidió opinión, investigación, y que sus apps
tuvieran «lo que me falta que tienen las otras».

## Las dos apps, y qué se sacó de cada una

**TradePulse AI** (Microsoft Store, escritorio): su lista de funciones —RSI,
ATR%, stop y objetivo automáticos, confluencia multi-temporal, calculadora de
posición, alertas— es **casi exactamente la de estas apps**, y encima es de
cripto (Binance), no de Forex. **Cero reseñas.** Presume de motor de
backtesting y **no publica ni un resultado**; si fuera bueno sería lo primero
de su página. Lo único que aportó fue la idea de la confluencia, ya medida
arriba y descartada.

**Visual Trader** (Traderlink, italiana, acciones de Milán): producto
establecido y de verdad. Lo que se le copió **no es el método —es otro mercado
y otros datos— sino cómo lo ENSEÑA**: el «meteo di borsa», un parte del tiempo
al lado de cada instrumento.

## Lo que se construyó

**1. Importar operaciones del bróker** (`importarOperaciones.js` +
`ImportarBroker.jsx`, en las DOS apps). Lee informes .htm de MT4, .html de MT5
y CSV de casi cualquier bróker.

⚠️ **Se eligió el archivo y NO la API a propósito**, y el motivo no es pereza:
no hay servidor, así que una credencial de bróker viviría dentro de la app y
cualquiera podría sacarla del JavaScript. Es el mismo agujero de Capital.com y
Twelve Data, y este daría acceso al **dinero** de alguien. Además funciona con
cualquier bróker del mundo y no cuesta nada al mes (un puente comercial para
MetaTrader cobra $5-10 por cuenta conectada, todos los meses).

Detalles que costaron y no hay que deshacer:
- Las columnas se buscan **por nombre y en varios idiomas**: el informe de
  Néstor dice «Símbolo» y «Beneficio». Por posición fija habría funcionado en
  la máquina de quien programa y fallado en la suya.
- Entra el resultado **NETO** (beneficio − swap − comisión). Enseñarlo sin
  descontar sería contarse el cuento justo en los costes que este proyecto
  lleva meses midiendo.
- **Nada se guarda hasta confirmar**, con las cinco primeras a la vista.
- **No duplica**: cada operación lleva el `ticket` del bróker, porque lo normal
  es exportar el historial entero cada vez.
- Los avisos salen como `{ codigo, n }` y **no como frases en español**: el
  lector corre también en Node y no sabe el idioma. Traduce quien pinta.

**2. Las mediciones dentro de la app** (`medicion.js` + sección plegable en
Historial, solo Swing). El argumento de venta que ninguna competidora tiene:
enseñar el propio número siendo malo. El orden de las filas es deliberado —
primero 55% de acierto y después «se pierden 3 centavos por dólar
arriesgado»—, porque puesto al revés el acierto se lee como la conclusión y es
justo el número con el que se engaña a la gente en este sector.

⚠️ Los números se escriben A MANO y **llevan fecha dentro** para que un número
viejo se delate en pantalla en vez de envejecer en silencio. Se actualizan
corriendo el banco de pruebas y copiando.

**3. El clima del par** (`ClimaMercado.jsx`, solo Swing). Sol / sol y nubes /
nublado / niebla / tormenta al lado de cada par del tablero completo.
**No es un indicador nuevo**: lee la tendencia, la fuerza, el RSI y el ATR que
la tabla ya muestra. Si dijera algo que los números no dicen, sería una opinión
disfrazada de dato. En SVG y no con emoji, porque los emoji cambian en cada
sistema, y con `dir="ltr"` fijo por el mismo error que ya pasó en árabe.

📌 **Está en PRIMOS, no en GEMELOS, y es importante**: el dibujo puede ser
igual, los umbrales no. Un ATR del 1,2% es tormenta en velas diarias y sería un
terremoto en velas de una hora.

## Un comparador que la memoria daba por hecho y NO existía

`prueba-idiomas.mjs` (57 comprobaciones, en las dos apps). Esta memoria decía
«hay un script que compara los 13 diccionarios entre sí». **No lo había**: se
hizo a mano una vez y no se guardó. Comprueba mismas claves, mismo tipo (una
frase que en español es función y en otro idioma es texto rompe la pantalla
SOLO en ese idioma, que es la peor forma de romperse), que las frases con
números usen sus huecos, y que ningún idioma lleve texto de otro alfabeto.

📌 **Lección: que algo esté escrito en la memoria no quiere decir que exista.**
Antes de fiarse de una herramienta que la memoria menciona, comprobar que el
archivo está ahí.

## Verificado en navegador, no solo compilando

Chromium con el `barrido.json` **real de producción**: el tablero pinta los 14
pares con su clima en español, y **la importación se probó de punta a punta
subiendo un informe de MT4 de verdad** — 2 operaciones reconocidas con su neto
correcto (+76,30 y −142,40), el oro saltado con aviso, el depósito ignorado,
cero errores de consola.

Y valió la pena, como siempre: el dibujo de «sol y nubes» tenía la nube
tapando el sol y a 24 px se confundía con «Nublado», que es lo contrario de lo
que quiere decir. Eso no lo ve un build.

---

# Convención para cambios que tocan las dos apps (2026-09-04)

Un cambio en un archivo GEMELO hay que hacerlo en los dos repositorios, y eso
son dos ramas y dos pull requests. Comparando siempre contra la `main` de la
hermana, esas dos ramas **nunca pueden estar en verde a la vez**: cada una ve
la mitad del cambio y el comparador falla. Pasó la primera vez que se intentó
(la importación del bróker), y dejaría la disciplina de los gemelos con un
peaje fijo sobre cada cambio compartido.

**Desde ahora: un cambio emparejado usa LA MISMA RAMA en los dos
repositorios.** El workflow `gemelos.yml` busca en la app hermana una rama con
el mismo nombre y, si existe, compara contra ella; si no, contra la principal.

⚠️ **Esto no afloja la comprobación.** Lo que hay que garantizar es que las dos
`main` no se separen, y eso lo siguen comprobando el push a `main` y la corrida
diaria, que van siempre main contra main. Si de un par solo se fusionara una
mitad, la corrida del día siguiente lo canta. Lo único que cambia es que al
revisar un pull request se compara lo comparable.

📌 El workflow **imprime contra qué rama comparó**. Una comprobación que no
dice qué miró deja al que la lee adivinando si el verde significa algo.

---

# El barrido de liquidez NO funciona (2026-09-04). Sexta familia que falla

Néstor trajo una investigación sobre lo que usan los operadores profesionales
(ICT/SMC, Level 2, Volume Profile, Bookmap). Casi todo pide datos que no
tenemos: nosotros vemos el resumen de cada vela, ellos ven las órdenes en
espera. **El barrido de liquidez era lo único calculable con máximo, mínimo y
cierre**, y encima es un patrón de reversión, que es la única familia que ha
medido positivo aquí. Por eso se probó antes que nada de esa lista.

Medido sobre 1.436 días (2021-06-23 a 2026-09-04), vara neutra 1:1, con costes.

| tamaño | ops | señ/mes | acierto | por 1R | 1ª mitad | 2ª mitad |
|---|---:|---:|---:|---:|---:|---:|
| 1 día | 5.258 | 81,4 | 47% | **−0,08** | −0,09 | −0,06 |
| 3 días | 4.114 | 63,7 | 46% | **−0,10** | −0,14 | −0,06 |
| 5 días | 3.456 | 53,5 | 46% | **−0,09** | −0,14 | −0,05 |
| 10 días | 2.623 | 40,6 | 47% | **−0,08** | −0,14 | −0,03 |
| 20 días | 1.896 | 29,4 | 46% | **−0,10** | −0,14 | −0,05 |

**Los cinco tamaños pierden.** No hay uno bueno y otros malos. Añadirle el RSI
estirado sube a +0,03 pero con 9,1 señales/mes y cayéndose en la segunda mitad
(+0,06 → −0,01): no es nada.

**En Intradía también falla** (su PR #44): −0,10 a −0,14 en los cuatro tamaños.

## El control salió MEJOR que lo que se probaba, y hay que tener cuidado con eso

El control era la misma perforación **sin exigir que el precio recupere** al
cierre: comprar el mínimo nuevo mientras sigue cayendo.

| | ops | señ/mes | acierto | por 1R | 1ª mit | 2ª mit |
|---|---:|---:|---:|---:|---:|---:|
| comprar la caída de 1 día | 4.303 | 66,6 | 53% | +0,03 | +0,04 | +0,03 |
| …de 5 días | 2.521 | 39,0 | 54% | +0,06 | +0,04 | +0,08 |
| …de 10 días | 1.862 | 28,8 | 55% | **+0,09** | +0,05 | +0,12 |
| …de 20 días | 1.337 | 20,7 | 56% | **+0,09** | +0,08 | +0,10 |
| *la app hoy* | 1.788 | 27,7 | 48% | *−0,07* | | |
| *la reversión M2* | 871 | 13,5 | 55% | *+0,08* | | |

Iguala a la reversión M2 con **el doble de señales**, coincide con ella solo en
el **3%** de las señales, y el gradiente es limpio y creciente con el tamaño.

⚠️ **PERO NO REPLICA EN INTRADÍA:** allí el mismo control da **−0,08 plano** en
los tres tamaños, sin gradiente. Así que la esperanza de «dos apps
independientes apuntando a lo mismo» **no se cumplió**. No lo desmiente (velas
diarias y de una hora son cosas distintas, y esa es la regla de siempre), pero
el argumento que yo quería construir con ello se cayó.

⚠️ **Y NO se asciende a candidato:** era el control, y se miró DESPUÉS de ver
la tabla. Es el mismo troceo a posteriori que ya se rechazó con el control de
la confluencia. Si se persigue, tiene que ser con una medición **propia y
diseñada de antemano**.

## El nombre engañaba, y por poco lo publico así

Esas filas se llamaban «rompimiento». Un rompimiento se opera A FAVOR del
movimiento: mínimo nuevo → vender. **Aquí el lado no cambia con `volver`**, así
que era comprar el mínimo nuevo. Con el nombre viejo la tabla parecía decir
«perseguir el movimiento funciona», que contradice todo lo demás del proyecto.

Se comprobó con el código delante (un par que perfora el suelo y cierra abajo
sale `true` para 'COMPRA'), no de memoria. Renombrado a «comprar la caída» en
los dos repos.

📌 **Lección: una etiqueta equivocada es un error de medición.** El número
estaba bien; la conclusión que inducía era la contraria.

## Lo que confirma la intuición de Néstor sobre las paredes

Pedir **fuerza relativa Y RSI estirado a la vez** dio **CERO señales**. En las
dos apps. Su observación —«todas juntas son paredes que no te dejan pasar»— no
es una impresión: es literal.


---

# Se ENCENDIERON dos puertas (2026-09-04). Cómo se decidió, que es lo que importa

Néstor lo pidió tras ver las mediciones. La regla de decisión se fijó **ANTES**
de mirar los resultados, justo para no ajustarla a lo que saliera:

> Se enciende solo si da **más señales/mes** Y **no es peor que hoy en NINGUNA
> de las dos mitades del periodo**.

Es el listón que el ADX no pasó en su día. Las dos columnas de mitades **no
existían** en las tablas de aflojar de ninguna de las dos apps: se añadieron
antes de decidir, no después.

## Swing: `TENDENCIA_MIN` de `'alineada'` a `'media'`

Se quita la segunda condición (que la EMA20 esté sobre la EMA50), que era la
que más tardaba en cumplirse tras un giro.

| exigencia | señ/mes | por 1R | 1ª mitad | 2ª mitad |
|---|---:|---:|---:|---:|
| alineada (antes) | 27,7 | −0,07 | −0,10 | −0,04 |
| **media (ahora)** | **36,1** | **−0,05** | −0,07 | −0,04 |
| ninguna | 36,2 | −0,05 | −0,08 | −0,03 |

Geometría real: −0,04 → **−0,03**, y los pips perdidos bajan de −19.171 a
−17.374 **pese a operar 548 veces más**.

Se eligió `'media'` y no `'ninguna'` aunque midan casi igual: queda una razón de
mercado en pie y ocho señales al mes no pagan renunciar a ella.

## Intradía: `ADX_MIN` de 20 a 10

| filtro | ops | acierto | pips | por 1R | 1ª mit | 2ª mit |
|---|---:|---:|---:|---:|---:|---:|
| ADX ≥ 20 (antes) | 7.217 | 39% | −41.886 | −0,13 | −0,14 | −0,12 |
| **ADX ≥ 10 (ahora)** | **8.009** | 38% | −45.744 | −0,13 | −0,14 | −0,12 |
| ADX ≥ 0 | 8.015 | 38% | −45.941 | −0,13 | −0,14 | −0,12 |

📌 **El dato que decidió: entre ADX 0 y ADX 10 hay SEIS señales de diferencia
en cinco años.** Por debajo de 10 el filtro no hace nada, y entre 10 y 20 solo
quita 792 señales a cambio de cero.

⚠️ **ESTE CASO ES MÁS FLOJO QUE EL DE SWING Y NO HAY QUE OLVIDARLO.** Allí
aflojar MEJORÓ el resultado y se perdieron MENOS pips en total. Aquí el
resultado por operación se queda IGUAL, así que el total de pips perdidos SUBE
un 9 % solo porque hay más operaciones. Lo que se compró es que la app HABLE,
no que acierte.

## El patrón que se repitió en las dos, y que hay que esperar la próxima vez

**Al encender, fallaron las comprobaciones que fijaban el valor viejo.** En
Swing `prueba-confluencia.mjs`, en Intradía `prueba-backtest.mjs`. Eso es
exactamente su trabajo: avisar de que la app cambia.

**Se actualizan al valor nuevo, nunca se borran**, y se les añade la
comprobación contraria (que YA NO coincida con el valor viejo) para que sigan
cantando si alguien lo mueve sin querer.

📌 Y una de Intradía tuvo que cambiar de **FORMA**, no solo de número: exigía
«sin ADX salen MÁS señales», cierto con el umbral en 20. Con el umbral en 10,
quitarlo del todo da EL MISMO número — que es justo lo que dice la medición.
Seguir exigiendo «más» habría sido exigir que el ADX siguiera estorbando. Pasó
a exigir que quitarlo no QUITE señales.

⚠️ **Lo que NO cambia con esto:** las dos apps siguen perdiendo con la vara
honesta (Swing −0,03, Intradía −0,13). Más señales de un sistema que pierde es
perder más rápido si se operan con dinero. Lo que se compró es que sirvan como
herramienta de información.

## La lista de indicadores para Néstor

Se le entregó como página aparte (Artifact privado):
https://claude.ai/code/artifact/e1f93455-ab77-4041-855e-220d681b198e

Organizada por **veredicto**, no alfabéticamente: lo que las apps usan hoy, lo
medido y apagado, lo que usan los profesionales y no podemos tener (con el
motivo real: **el Forex no tiene volumen central**, así que Volume Profile y
VWAP no son difíciles aquí, son imposibles), y el vocabulario de medición.

---

# El informe decía «(hoy)» sobre filas que no eran la app (2026-09-05)

Salió leyendo el resultado del ensayo de spreads de Intradía, no buscándolo.

Las tablas de aflojar marcan con «(hoy)» la fila que la app usa de verdad, para
que se vea de dónde se parte. Esa marca estaba **escrita a mano**, y había
envejecido en las dos apps:

| app | decía «(hoy)» en | valor real | consecuencia |
|---|---|---|---|
| Intradía | `ADX ≥ 20` | `ADX_MIN = 0` | la fila marcada tenía 7.219 ops; la de verdad, 8.022 |
| Intradía | `con ADX ≥ 35 (hoy)` | ídem | **dos etiquetas, dos valores, ninguno el real** |
| Intradía | `sin filtro (hoy)` (RSI) | `RSI_MAX = 70` | decía que no había filtro habiéndolo |
| Swing | `medias alineadas (hoy)` | `TENDENCIA_MIN = 'media'` | se aflojó el 2026-09-05 y la etiqueta no se movió |

📌 **Los números estaban BIEN.** Lo que engañaba era el rótulo — y ya está
escrito en este archivo, del 2026-09-04, que **una etiqueta equivocada es un
error de medición**. Aquella vez fue «rompimiento» por «comprar la caída».
Volvió a pasar en menos de un día, lo que dice que la lección sola no basta.

## El arreglo, y por qué no es «tener más cuidado»

Los umbrales se **exportan** desde `marketCalc.js` (`ADX_MIN`, `RSI_MAX`,
`TENDENCIA_MIN`, en Swing también `CONFLUENCIA_MIN`) y `backtest.mjs` los
importa. La marca la pone `hoySi(nombre, esLaDeHoy)` comparando contra el valor
real. Cambiar un umbral mueve la etiqueta sola.

⚠️ **Esto NO junta las dos apps.** `marketCalc.js` sigue siendo PRIMO y los
valores siguen siendo distintos y medidos por separado: lo único que se comparte
es la idea de leer el valor en vez de escribirlo.

## La comprobación, y lo que cazó al primer intento

`prueba-costes.mjs` lee `backtest.mjs` y falla si aparece «(hoy» en un texto
literal fuera de `hoySi` y sin `${...}` dentro. Al estrenarla **encontró una que
se me había pasado** (`'tal cual (hoy)'`), y al romper una a propósito falló
como debe.

También exige que `hoySi` siga existiendo: sin eso, borrarla dejaría la
comprobación en verde sobre un informe que ya no marca nada — el mismo agujero
de «una prueba que se adapta a lo que encuentra no comprueba nada».

📌 **Regla que sale de aquí: al cambiar un umbral, mirar también quién lo
NOMBRA.** El código que lo usa se actualiza solo; el texto que lo describe, no.

---

# El ensayo con los spreads reales de Néstor (2026-09-05, Intradía)

Néstor leyó los 18 spreads de su cuenta de AvaTrade y los pasó. **Con el mercado
cerrado**, así que están inflados: media 4,36 pips contra los 2,17 de la tabla.
Guardados como `SPREAD_NESTOR_FINDE`, marcados, y **no se usan por defecto**.

Vara neutra 1:1, mismas señales, solo cambia el peaje.

| regla | ops | sin costes | A (2,17) | B (4,36) |
|---|---:|---:|---:|---:|
| la app tal cual | 8.022 | −0,030 | −0,106 | −0,172 |
| R1. Comprar lo débil, vender lo fuerte | 6.070 | **+0,016** | −0,051 | −0,108 |
| R2. …y solo con el RSI estirado (35/65) | 5.281 | +0,002 | −0,067 | −0,126 |
| R3. …y solo lejos de la EMA21 | 6.063 | **+0,016** | −0,051 | −0,108 |
| R4. R2 solo en el solape Londres-NY | 1.820 | **+0,023** | −0,045 | −0,108 |
| R5. CONTROL: la inversión, de frente | 6.054 | +0,014 | −0,054 | −0,111 |

**El peaje se lleva 0,068 con la tabla A y 0,125 con la B.**

## Lo que esto cierra, y es más de lo que se buscaba

La pregunta era «¿cuánto decide el bróker?». La respuesta útil salió de la
columna que ya estaba: **la mejor ventaja SIN costes es +0,023, y el peaje más
barato es 0,068 — tres veces más.**

⚠️ **Entonces en Intradía no hay bróker que la salve.** Para que R4 saliera a
cero haría falta un spread medio por debajo de ~0,7 pips en 18 pares, cruces
incluidos. Eso no existe al por menor. Y eso vale igual para la reversión, que
en Swing sí aguanta: **aquí no**.

📌 Es el mismo aviso de siempre —lo medido en una app no vale en la otra— pero
al revés de como suele usarse: aquí la regla buena de Swing NO se salva en
Intradía, y el motivo no es la regla, son los objetivos cortos contra un coste
fijo.

## Lo que sigue pendiente de Néstor

Volver a leer los spreads **con el mercado abierto** (8:00-11:00 hora Colombia,
de lunes en adelante). **Esos** sí sustituyen a `SPREAD_PIPS`; los de fin de
semana no sustituyen nada.

---

# Copia de seguridad del historial (2026-09-05). En las dos apps

Néstor preguntó para qué servía antes de aprobarla, y la respuesta es la razón
de todo lo demás: **`historial/senales.jsonl` y `historial/resultados.jsonl` son
lo ÚNICO del proyecto que no se puede volver a fabricar.** El código se reescribe
en un día; una señal del 12 de agosto no, porque depende de lo que la app dijo
ESE día con los precios de ESE día.

Y es justo lo que hace falta para poder vender: los ~11 meses de historial que
dirán si la reversión aguanta en la realidad. Perderlos no cuesta un archivo —
cuesta el año de espera, y encima antes de terminarlo.

Hasta hoy había **una sola copia**, en la rama `datos`, y el vigía escribe encima
de ella cada día.

```
app/scripts/lib/respaldo.mjs          # la lógica pura (contar, comparar, alarmar)
app/scripts/respaldo-historial.mjs    # el guion que corre
app/scripts/prueba-respaldo.mjs       # 26 comprobaciones, sin internet
.github/workflows/respaldo-historial.yml
```

Domingos 04:20 UTC (el vigía corre de lunes a viernes en las DOS apps —
comprobado, no supuesto—, así que en domingo nadie está escribiendo y no se
puede pillar el archivo a medias). Copias fechadas en la rama `respaldos`. No
gasta créditos de Twelve Data ni toca la red.

## ⚠️ Lo que hace que esto no sea «copiar el archivo y ya»

**El peligro real no es que el archivo desaparezca —eso se nota— sino que
encoja en silencio.** Una copia que reproduce fielmente un archivo truncado es
PEOR que no tener copia: da tranquilidad falsa mientras el historial se pierde.

Por eso compara con la copia anterior y **termina en rojo si algo encogió**.
Estos archivos solo crecen: el vigía añade al final y no borra nunca. Menos
líneas que la semana pasada significa que pasó algo, y hay que enterarse ese día
y no dentro de ocho meses. También caza una línea a medio escribir, que las
cuentas solas no ven.

## Tres decisiones que no hay que ablandar

⚠️ **NO BORRA COPIAS VIEJAS.** Sería fácil añadir «deja solo las últimas doce» y
sería justo la clase de código que un día borra lo que hacía falta. Son 25 KB de
texto casi idéntico que git comprime hasta casi nada. **La lógica de borrado es
lo último que uno quiere cerca de su único activo irremplazable.**

⚠️ **La copia se guarda AUNQUE haya alarma, y el rojo va DESPUÉS.** El workflow
lleva `continue-on-error` en el paso que revisa y un paso final que vuelve a
fallar. Al revés, una alarma impediría que la copia llegara a la rama: lo que no
se guarda no vuelve, un correo de fallo sí.

⚠️ **La copia anterior nunca se toca.** Si la de hoy sale mal, la buena sigue
al lado. La alarma lo dice con esas palabras («NO la borres») porque el primer
impulso al ver algo raro es limpiar.

## Cómo se comprobó

Las 26 comprobaciones sin internet, y **de punta a punta con el historial REAL
de producción**: primera copia de 44 señales y 37 resultados en verde; después
se truncó el archivo a 20 líneas a propósito y salió la alarma nombrando los dos
números (44 → 20), con salida 1 y la copia buena intacta al lado.

## De paso, un texto que llevaba un mes falso

`vigia.yml` decía que los precios «vienen del Banco Central Europeo». Es falso
desde el 2026-08-09. Corregido, y anotado que **la hora (15:50 UTC) se eligió
por el horario del BCE**: con velas de Twelve Data (cierran a las 22:00 UTC) el
vigía ve la del día anterior cerrada más la de hoy a medias. Sigue siendo lo
correcto —no juzgar con una vela sin terminar— pero por otro motivo.

📌 Es el mismo patrón del día: **al cambiar algo, mirar también quién lo NOMBRA.**

---

# Los spreads REALES, y una predicción mía que era falsa (2026-09-07)

Néstor leyó los 18 spreads de su cuenta de AvaTrade el domingo por la noche,
**con el mercado abierto** (sesión de Asia). Son los primeros números reales de
un bróker de verdad que ha tenido el proyecto.

📌 **Antes de verlos predije que saldrían PEORES que los del viernes**, porque
Asia es la sesión con menos gente. Salieron mucho mejores: media **1,91** contra
4,36. El fallo era confundir «sesión con poca liquidez» con «mercado cerrado»:
el viernes **no había mercado**, y un bróker sin mercado no ensancha el spread —
**se lo inventa**. Tercera vez que un mecanismo convincente resulta falso.

## Lo que validan, que es lo importante

La tabla del banco de pruebas suponía 2,17 y la realidad es 1,91: **un 12 % más
cara**. Todo lo medido en meses **no estaba inflando resultados a favor propio**,
que era el riesgo de fondo del proyecto entero.

Solo tres pares salían más baratos de lo real, y por poco: USD/JPY (1,0→1,3),
USD/CAD (1,6→1,8), NZD/USD (1,7→2,1).

⚠️ **No sustituyen a `SPREAD_PIPS`**, y ahora por el motivo contrario al del
viernes: **Asia es la sesión MÁS BARATA** que verá esa cuenta. Medir con el
mejor momento del día es el mismo autoengaño por el otro lado. Guardados como
`SPREAD_NESTOR_ASIA`.

## Swing: el bróker casi no decide

Reversión M2 de +0,086 a **+0,089**, y el umbral de swap **no se mueve** (sigue
en 1 pip/noche). El peaje entero se lleva **0,018**.

## Intradía: cerrado, y con el número calculado

| regla | ops | sin costes | oficial | REAL | cerrado |
|---|---:|---:|---:|---:|---:|
| la app tal cual | 7.937 | −0,033 | −0,108 | −0,103 | −0,174 |
| R1 | 6.005 | +0,020 | −0,047 | −0,043 | −0,104 |
| R2 (RSI estirado) | 5.231 | +0,004 | −0,066 | −0,061 | −0,124 |
| R4 (solape Londres-NY) | 1.806 | **+0,027** | −0,042 | −0,039 | −0,104 |

Peaje: 0,068 oficial · **0,063 real** · 0,125 cerrado.

> **La MEJOR ventaja sin costes es 0,027 y el peaje más barato 0,063: 2,4 VECES
> MÁS. No hay bróker que la salve.**

⚠️ **Esa línea la CALCULA el script**, no está escrita a mano. Cierra la
pregunta del bróker en Intradía para siempre: aunque operara gratis, lo mejor
que tiene da +0,027.

## 📌 El mecanismo, que por una vez se ve

| | stop típico | spread | pesa |
|---|---:|---:|---:|
| Swing | ~120 pips | 2 | 1,8 % del riesgo |
| Intradía | ~30 pips | 2 | **7 %** |

Es la regla de siempre —lo medido en una app no vale en la otra— pero con la
causa a la vista: **el mismo bróker y el mismo spread, cuatro veces más peso.**

---

# «Comprar la caída»: preregistrada, aprobada y en la sombra (2026-09-07)

Néstor pidió perseguir en serio la regla que salió mejor que todo lo demás
siendo un CONTROL el 2026-09-04. «En serio» se definió como dos cosas.

## A) El listón, escrito ANTES (`scripts/lib/preregistro.mjs`)

Seis criterios, todos obligatorios, con la fecha dentro: gana en las dos
mitades · las ventanas vecinas también · aguanta 0,5 de swap · más señales que
la reversión · solapa menos del 20 % · ningún par aporta más del 40 %.

**El veredicto lo CALCULA `juzgar()`**, no lo argumenta nadie.
`prueba-preregistro.mjs` comprueba que MUERDE con ocho resultados inventados que
fallan un criterio cada uno, y con los bordes exactos.

⚠️ **Si algún día un resultado queda a un pelo, la respuesta NO es aflojar un
criterio.** Ése es el momento exacto para el que se escribió el listón antes.

## El resultado: pasó los seis

1.856 ops · 28,7 señales/mes · 55 % · **+0,087** con costes · mitades +0,055 y
**+0,118** (mejora, al revés que la reversión) · +0,054 pagando swap · solape
18 % · mejor par 23 %.

## ⚠️ Dos honestidades que van con ese aprobado

📌 **Le dije a Néstor «coincide solo en el 3 %» y era FALSO.** Ese 3 % es del
barrido de liquidez (`volver: true`), no de «comprar la caída» (`volver: false`).
El número real es **18 %**, o sea que pasó el criterio **raspando** y es bastante
menos independiente de la reversión de lo que dije.

📌 **El criterio de «vecinas» tiene un fallo que no cambió el veredicto.** Elige
las vecinas por distancia absoluta, así que para la ventana de 10 cogió **5 y 1**
cuando la vecina natural es **20** (de 10 a 20 es el doble; de 10 a 1 es diez
veces menos). Da igual esta vez —la de 20 también sale +0,09— pero el criterio no
midió lo que decía medir. Si se retoca, arreglarlo por proporción y no por resta.

## B) Ya corre en la sombra desde el 2026-09-07

El vigía la anota con `tipo: 'caida'`, como la reversión desde el 2026-08-18.
**Dos relojes en marcha:** la reversión a 13,5 señales/mes (van 12 reales) y
ésta a 28,7 desde cero — unos 5 meses hasta 150 en vez de 11.

⚠️ Pasar el listón **es necesario y no suficiente**: estos 1.436 días ya se
miraron. Lo único limpio es el registro hacia adelante.

## ⚠️⚠️ EL FALLO GRAVE, CAZADO ANTES DE PUBLICARSE

`esSombra` **enumeraba** las reglas de sombra (`tipo === 'reversion'`). Las
COMPRAS de «comprar la caída» no encajaban en ninguna condición, así que habrían
salido como señales normales y **HABRÍAN DESPERTADO EL CELULAR DE NÉSTOR con una
regla sin probar.**

Ahora está escrita **al revés**: sombra es TODO lo que no sea la regla propia de
la app (`!s.tipo || s.tipo === 'tendencia'`). Una regla nueva **nace apagada** y
solo se enciende si alguien viene aquí a mano.

📌 **La lección, que vale para cualquier interruptor de este proyecto:** es la
diferencia entre olvidarse de APAGAR algo —que manda avisos falsos a un
celular— y olvidarse de ENCENDERLO, que solo retrasa una decisión. Escribir la
condición por el lado seguro cuesta lo mismo.

Con comprobación de que un `tipo` que nadie ha visto todavía **también** nace en
la sombra, para la regla que venga mañana.

## Otros dos detalles del cambio

- `derivarVista({ incluirCaida: true })` **revienta** si el barrido no trae
  `highs` y `lows` en vez de devolver cero señales. `barrido.json` los descarta
  al publicarse, y una lista vacía se lee como «hoy no hubo señales» —
  indistinguible de «llevo ocho meses sin anotar nada».
- El patrón se movió a `src/lib/marketCalc.js` (`perforaExtremo`) y
  `patrones.mjs` lo reexporta: ahora lo necesitan el banco de pruebas **y**
  `derivarVista`. En las DOS apps, para que siga siendo gemelo. ⚠️ La regla NO
  se porta a Intradía: allí mide −0,08 plano.

---

# Ver lo que corre en la sombra (2026-09-07)

Néstor preguntó cómo puede VER lo que se anota en la sombra y los resultados
que va dando. La respuesta era «la reversión sí, «comprar la caída» no» — y
comprobarlo destapó **dos fallos reales**, ninguno visible compilando.

## 1. Sus resultados se habrían contado bajo la etiqueta EQUIVOCADA

`ventasPausadas` estaba definida **por descarte**: «es sombra y no es
reversión». Los resultados de «comprar la caída» encajaban ahí solos, así que
la pantalla los habría enseñado como **ventas pausadas** — sencillamente falso.

📌 Es EXACTAMENTE el mismo fallo que ya está descrito en `historialCalc.js` del
2026-09-05, repetido **dos días después**. Y es hermano del de `esSombra` del
mismo día: las dos veces, una condición escrita por descarte se tragó en
silencio lo que vino después.

**Ahora cada cubo se define por lo que ES**, no por lo que no es:
`esDeLaApp = !r.tipo || r.tipo === 'tendencia'`.

## 2. Y no aparecía en NINGUNA lista

`filasTodas` juntaba `filas` y `filasReversion`. Las de `caida` no están en
ninguna de las dos, así que se habrían anotado **durante meses sin que Néstor
viera ni una**.

## Lo que se ve ahora

Tres bloques de porcentajes en Historial —la app, la reversión y «comprar la
caída»—, cada uno con su acierto, sus operaciones y sus pips, y **una sola
lista abajo en orden de fecha** con cada fila etiquetada. Los textos, en los 13
idiomas.

⚠️ **Los números NO se mezclan nunca.** Son reglas opuestas: la app acierta más
y pierde, las otras aciertan menos y ganan. Un promedio no describe a ninguna.

## Lo que solo se vio en un navegador

Los tres bloques quedaban **pegados sin nada que los separara**, y los
porcentajes se leían como una lista corrida sin saber de quién era cada uno.
Confundir el acierto de una regla con el de otra es el único error grave que
puede cometer esta pantalla. Se añadió una raya fina arriba de cada
experimento (`BLOQUE_EXPERIMENTO`).

📌 Van sin auth: `HistorialTab` está detrás de Firebase, así que para verlo se
compiló **el componente aislado** con Vite y un alias que sustituye
`useHistorial` por un doble con las tres reglas. Sirve para cualquier pantalla
que esté detrás del login.

## La comprobación que lo vigila

`prueba-resolver.mjs` (9b): cada experimento cuenta aparte, ninguno se cuela en
otro, y —la que de verdad importa— **un `tipo` que nadie ha inventado todavía
NO puede caer dentro de «ventas pausadas»**. Comprobado que muerde
reintroduciendo la condición vieja: fallan dos comprobaciones.

---

# El reloj de GitHub se comió un día de historial (2026-09-07). Solo en Swing

Néstor preguntó por la puntualidad y al mirarlo salió un agujero medido, no una
teoría. Las corridas reales del vigía de Swing:

```
4 de septiembre  18:33   ← 2h43m tarde
5 de septiembre  ——      ← NUNCA CORRIÓ
7 de septiembre  18:40   ← lanzada a mano desde esta sesión
```

**El viernes 5 se perdió y no vuelve.** El historial vale porque registra lo que
la app dijo ESE día con los precios de ESE día; reconstruirlo con el banco de
pruebas sería meter filas inventadas en lo único limpio que tiene el proyecto —
el registro hacia adelante. Se pierde el día y ya.

📌 **Y esto llevaba desde el 2026-08-09 escrito como «pregunta abierta nº 3» sin
tocarse.** Se arregló en Intradía el 2026-09-02 (el publicador cada 30 minutos,
dos oportunidades por hora) y **en Swing no se hizo nada**, porque «para un
vigía diario importa menos». Importa lo mismo: cuando falla, cuesta un día
entero en vez de una hora.

## Tres intentos, no tres corridas

`vigia.yml` pasa de un cron a tres —**15:50, 16:20 y 16:50 UTC**— y `vigia.mjs`
mira **antes de pedir precios** si ya corrió hoy (`yaCorrioHoy`, comparando el
día en UTC de `actualizadoEl` en `estado/vigia.json`).

Día normal: trabaja el primero, los otros dos salen en un segundo con **cero
créditos** de Twelve Data. Día en que GitHub falla: entra el siguiente. Sigue
siendo **una corrida al día** y el gasto no cambia.

Tres piezas que lo sostienen y que no hay que quitar:

- **`concurrency: vigia` con `cancel-in-progress: false`** (ya estaba). Es lo
  único que impide que un intento retrasado se solape con el siguiente y los dos
  anoten la misma señal. Sin eso, tres crones son tres formas de duplicar el
  historial.
- **`leerEstado` ahora conserva `actualizadoEl`.** Antes lo tiraba. Sin ese
  campo el guardián nunca se activaría y los tres intentos harían el trabajo
  tres veces (42 créditos al día en vez de 14) — y en silencio.
- **`VIGIA_SOLO_SI_FALTA` solo se pone cuando el disparo es `schedule`.**
  Lanzarlo a mano SIEMPRE corre, que es para lo que sirve el botón y es como se
  recuperó hoy.

## ⚠️ La decisión que no hay que ablandar: la duda se resuelve CORRIENDO

`yaCorrioHoy` devuelve `false` —o sea, corre— ante cualquier cosa rara: no hay
estado, el archivo está roto, la fecha no se entiende, `actualizadoEl` no es
texto. Es la misma forma de escribir que `esSombra`, y por la misma razón:

| equivocarse hacia… | cuesta |
|---|---|
| **correr de más** | 14 créditos de los 800, y nada más — si no hay señales nuevas no se anota nada |
| **saltarse de más** | un día de historial que no vuelve |

Los dos errores no valen lo mismo, así que la condición no puede ser simétrica.
Hay cinco comprobaciones dedicadas solo a eso.

## Cómo se verificó

`prueba-vigia.mjs` (bloque 12, 14 comprobaciones), y **comprobado que muerde**:
al cambiar «fecha ilegible → corre» por «→ se salta», falla. La primera vez que
lo intenté el comando ni siquiera modificó el archivo — el mismo tropiezo del
2026-09-03, así que **se miró el archivo con el daño puesto antes de dar por
buena la prueba**.

Y de punta a punta, sin gastar créditos y sin llave:

| caso | qué hizo |
|---|---|
| ya corrió hoy + automático | se saltó, salida 0, **sin tocar la red** |
| mismo estado, lanzado a mano | llegó a pedir velas (o sea, NO se saltó) |
| corrió el viernes + automático | llegó a pedir velas — es justo el día perdido |

## De paso: el log del vigía no nombraba «comprar la caída»

`resumir` devuelve el cubo `caida` desde hoy y **no lo imprimía nadie**: la
regla se habría anotado meses sin salir en el log de ninguna corrida. Mismo
descuido que `filasTodas` esta misma mañana. Una línea más, al lado de las otras
dos de sombra.

⚠️ **Esto NO se porta a Intradía.** Allí el vigía corre cada hora y ya tiene el
publicador cada 30 minutos: perder una corrida cuesta una hora, no un día, y
`vigia.mjs` es PRIMO, no gemelo.

---

# Lanzar Swing: el plan, y lo que Néstor descubrió al ponerse de cliente (2026-09-08)

Néstor pidió ayuda para lanzar la app: no sabe de marketing, ni dónde
promocionar, ni cómo hacer un video, y pidió una campaña «fuerte y agresiva».

**El plan completo está en un Artifact privado** (única copia — si se pierde el
enlace, se rehace desde aquí):
https://claude.ai/code/artifact/b1559411-5115-401f-ae08-1c92c10c89ae
Título: «Vender sin prometer». Seis fases, cada una con qué necesita antes y
cómo saber que terminó, más el guion palabra por palabra del primer video.

## La decisión de fondo

Hoy **no se pueden vender señales**: la app acierta 48 % y da −0,03 por 1R, y
las dos reglas positivas llevan 12 y 3 operaciones reales. Se vende
**información**, y el argumento central es el que ninguna competidora tiene:
**la app enseña sus propios números siendo malos** (la sección de mediciones
del Historial).

⚠️ Y la frase honesta NO es «no doy señales» —la app SÍ muestra la dirección—
sino «aquí está lo que destaca hoy, y aquí al lado lo que acierta: 48 %». Lo
que lo hace honesto es que el número esté visible, no esconder la dirección.

## ⚠️⚠️ EL HALLAZGO DEL DÍA, Y ES EL MÁS IMPORTANTE

Néstor se puso de parte del suscriptor y dijo: **«tú me das explicaciones
claras y lógicas, y todavía no me convence pagar»**.

**Eso no es un problema de comunicación: es la respuesta a la pregunta 3 de la
Fase 2** («si dejara de existir, ¿la echarías de menos?»), contestada gratis
por el propio autor antes de gastar un peso en campaña. Si el que la construyó
no pagaría, ninguna landing lo arregla.

📌 **Propuesta sobre la mesa, sin decidir: lanzarla GRATIS.** Hoy no hay qué
cobrar; en ~5 meses las reglas de la sombra dirán si hay producto. Regalarla
trae 200 personas usándola en vez de 5 pagando, y encaja con lo que a él le
preocupa —quiere más apps con su marca y no quiere quemar la reputación.

## La comparación con TradingView (guardada a petición suya, va a la landing)

Preguntó si TradingView tiene lo mismo. **La respuesta honesta es que sí, casi
todo, y gratis** — y él quiere que los suscriptores lo lean.

| | TradingView | Las apps |
|---|---|---|
| RSI, ATR, EMA, ADX | ✅ todos, gratis | ✅ |
| Fuerza relativa entre divisas | ✅ scripts de la comunidad | ✅ |
| Stop/objetivo y lote | ✅ herramienta de posición | ✅ automático |
| Alertas al celular | ✅ | ✅ |
| Backtesting | ✅ **más potente que el nuestro** | 4 scripts |
| Importar del bróker | ❌ | ✅ |
| **Enseñar su propio acierto real** | ❌ | ✅ |
| **Respuesta lista en 30 segundos** | ❌ | ✅ |

**No hay una característica técnica que TradingView no iguale o supere.** La
diferencia es **tiempo, no capacidad**: da el plato hecho en vez de los
ingredientes. Más la honestidad y la curva de aprendizaje.

⚠️ Y el agujero de ese argumento, que hay que decir: **el plato que se cocina
hoy pierde.** Ahorrar una hora para llegar a −0,03 es un argumento delgado para
cobrar — refuerza lo de lanzar gratis.

📌 **Nunca competir de frente con TradingView.** Quien diga «yo ya lo uso»
tiene razón y no es el cliente. El cliente es quien NO quiere aprenderlo.

## Cómo se está escribiendo la página de venta

Néstor pidió que los suscriptores tengan estas explicaciones **antes de pagar**.
El método acordado: **él hace de cliente desconfiado, y cada pregunta que se
pueda responder honestamente se vuelve una sección de la página.** Cada
pregunta que NO se pueda responder bien señala qué falta arreglar en la app.

Preguntas ya contestadas y listas para la página:
- *«Si no das señales, ¿para qué el stop loss?»* → la dirección es opinión
  (48 %), el stop es aritmética sobre cuánto se mueve el par. Con el ejemplo
  real de los 12 pips de USD/CAD del 2026-08-09.
- *«¿TradingView no tiene lo mismo?»* → la tabla de arriba.

## Un tropiezo de herramientas que conviene recordar

Néstor abrió la **caja del resultado de una llamada mía** (`action: read`) en la
app del móvil y vio el HTML en crudo: «todo está en inglés y parecen códigos
que debo pegar». No era la página, que estaba bien.

📌 **No lanzar diagnósticos que vuelquen HTML entero al chat**, y al dar un
Artifact decirle que lo abra **copiando el enlace en Chrome**, no tocando las
cajas grises de herramientas.

---

# Fase de información (2026-09-08): cinco herramientas nuevas, y por qué

Néstor cambió de idea sobre el producto, y con argumento propio: **«para ser de
información me parecía que le faltaba»**. Vio que un trader con experiencia
probaría dos semanas y pagaría por el tiempo ahorrado, y que a un principiante
—como era él cuando empezó— le habría servido de verdad.

📌 **Tenía razón y hay que decirlo.** Hoy la app es «un barrido con una
dirección que falla». Con calendario + posiciones institucionales + sentimiento
+ tasas + correlación pasa a ser **un parte diario del mercado**, y eso sí se
puede cobrar sin prometer aciertos: se cobra el tiempo, no el resultado.

Y su idea de **2 semanas de prueba y luego pagar** resuelve la duda del
2026-09-08 sin discutirla: la prueba MIDE exactamente la pregunta 3 de la Fase
2 (¿vuelven a la segunda semana?). Si no vuelven, no hay precio que lo salve.

## Las cinco, en el orden acordado y por qué ese orden

| # | qué | por qué ahí |
|---|---|---|
| 1 | **Calendario económico** | El hueco más grande. Hoy la app no sabe que hay Fed esta noche |
| 2 | **Correlación entre pares** | **Cero datos nuevos**: se calcula con los 300 días que ya se bajan |
| 3 | **Diferencial de tasas** | Pequeño, y ES el swap que hoy barremos a ciegas en 5 niveles |
| 4 | **Posiciones institucionales (COT)** | Semanal, que es el horizonte de Swing. Gratis y oficial (CFTC) |
| 5 | **Sentimiento minorista** | Hay que mirar términos de uso antes |

⚠️ **Ninguna está medida.** La distinción que decide si hace falta medirla
antes: **información** (calendario, tasas, correlación) no promete acertar más
y entra sin medición; **filtro** (COT, sentimiento, «no operar antes de
noticias») cambiaría las señales y NO entra sin pasar por el banco de pruebas.

## ⚠️ El obstáculo del calendario, que costó descubrirlo

La red de estas sesiones **bloquea** faireconomy, tradingeconomics y
tradingview (`Host not in allowlist`, 403 del proxy). No se puede ver ni si
responden ni qué forma tienen los datos.

Por eso va primero `scripts/sonda-calendario.mjs` + su workflow a mano: pide,
cuenta, enseña los nombres de los campos y un ejemplo crudo. **Con eso a la
vista se escribe el lector; nunca a ciegas.**

📌 Finnhub queda descartado: su calendario económico es de pago.

---

# Lo que NO se puede tener en Forex, y el texto para los suscriptores

Néstor pidió esto expresamente: **explicar por qué otros ofrecen volumen, Level
2, Volume Profile, VWAP y Bookmap y nosotros no, con argumentos propios,
documentados y verdaderos.** Va a la landing y es de las cosas que mejor
sostienen su bandera de honestidad.

## El hecho del que sale todo

**El Forex no tiene bolsa central.** Las acciones se negocian en un sitio
—NYSE, Nasdaq— que apunta cada operación, así que el volumen es un número real
y único. El Forex es una red de bancos negociando entre sí: **no hay un sitio,
así que no hay un total**. No lo tiene nadie: ni nosotros ni ellos.

## Entonces, ¿qué enseñan los que «ofrecen volumen»?

**Tick volume**: cuántas VECES cambió el precio en ese rato, según **un solo
bróker**. No es cuánto dinero se movió — es cuántas veces esa plataforma
actualizó su número.

⚠️ **Y aquí hay que ser justo, que es lo que hace creíble el argumento:** el
tick volume NO es basura. Se parece bastante a la actividad real y hay
operadores con experiencia que lo usan sabiendo lo que es. **El problema no es
el dato: es venderlo como «volumen real».** Dos brókers dan números distintos
para la misma hora, y eso solo puede pasar si no es una medición del mercado.

- **Level 2 / libro de órdenes:** en acciones son las órdenes reales en la
  bolsa. En Forex al por menor es el libro **de tu bróker** o de su proveedor:
  una rebanada, no el mercado.
- **Volume Profile y VWAP:** los dos se construyen SOBRE el volumen. Con tick
  volume heredan el problema entero.
- **Bookmap:** dibuja el libro de órdenes. Misma limitación, más bonito.

## La frase para el suscriptor

> No te enseñamos volumen porque en Forex **no existe un volumen real que
> enseñar**. Lo que otros llaman volumen es cuántas veces cambió el precio en
> un solo bróker. Es una aproximación razonable y hay quien la usa bien — pero
> presentártela como una medición sería justo lo que esta app no hace.

📌 **Y ya lo decimos**: el pie del reporte diario lleva desde siempre «Sin
datos de MT5 no hay tick volume ni spread real del bróker». Esto solo lo
explica.

---

# La sonda respondió: ForexFactory (2026-09-08)

Lanzada desde Actions, que es donde no hay bloqueo de red. Resultado:

| fuente | qué pasó |
|---|---|
| **ForexFactory (FairEconomy)** | ✅ **200, 80 eventos, 75 de nuestras 8 divisas** |
| ForexFactory por CDN | no responde (`cdn-nfs` no existe) |
| Trading Economics invitado | **410: «the guest account has been discontinued»** |
| TradingView | 403 |

**La forma exacta de los datos**, que era lo que no se podía adivinar:

```json
{"title":"ANZ Job Advertisements m/m","country":"AUD",
 "date":"2026-09-06T21:30:00-04:00","impact":"Low",
 "forecast":"","previous":"0.8%"}
```

Campos: `title` · `country` · `date` · `impact` · `forecast` · `previous`.

📌 **Dos regalos que no se esperaban:** `country` ya viene como CÓDIGO DE
DIVISA (`AUD`, `USD`…), o sea que no hay que traducir país→divisa; y `date` es
ISO con huso, así que `new Date()` lo entiende solo. 10,8 KB por semana.

⚠️ El feed cubre **la semana en curso**. Para el vigía diario sobra, pero si
algún día se quiere «los próximos 7 días» hay que mirar si existe otro archivo.

---

# El COT se lee del archivo oficial, sin librerías (decidido 2026-09-08)

Néstor preguntó qué es una «librería» y, al explicárselo, pidió expresamente
dejar escrita la decisión: **leer el archivo oficial nosotros mismos cuando sea
suficientemente simple, para no depender de nadie.**

Queda así para el COT (CFTC). El motivo no es orgullo:

- una librería de un tercero **se abandona, cambia o desaparece**, y el día que
  pase la app se rompe sin que nadie haya tocado nada;
- es código ajeno corriendo con nuestros permisos;
- y la CFTC publica una **API oficial abierta** (Socrata,
  `publicreporting.cftc.gov`) que devuelve JSON: no hay nada que descomprimir
  ni ningún formato viejo que descifrar. La librería ahorraría poco.

📌 Es la misma lógica que ya llevó a leer el informe del bróker con código
propio en vez de conectarse por API, y a que `velas.mjs` pida los 14 pares
directo. **Menos piezas de otros = menos formas de romperse en silencio.**

---

# ⚠️ HALLAZGO: el puente a MT5 YA EXISTE y no estaba documentado (2026-09-08)

Néstor pidió «armemos un puente de mis apps a MT5 + AvaTrade». Al ir a
diseñarlo apareció que **la mitad ya está construida y funcionando**:

```
app/src/lib/useMT5Quotes.js       # el lector, con normalización de símbolos
app/src/components/CotizacionesVivo.jsx
app/scripts/prueba-mt5.mjs
app/src/App.jsx:180               # ← YA ESTÁ ENCHUFADO EN LA APP
```

Lee `GET /quotes` de un servidor de Python (FastAPI) que corre en el computador
de Néstor junto a MT5 y da **Bid, Ask y el spread REAL del bróker** — justo lo
que el pie del reporte dice que falta. La dirección sale de `VITE_API_URL`.

## ⚠️ Lo que FALTA, y es la mitad que importa

**El servidor de Python NO está en este repositorio.** No hay ni un `.py`. O
sea que hoy la app tiene el enchufe pero no hay nada al otro lado salvo que
Néstor tenga ese servidor en su máquina.

📌 **Y CLAUDE.md nunca lo mencionó.** Es el reverso exacto de la lección del
2026-09-04 («que algo esté en la memoria no quiere decir que exista»): aquí
existe código enchufado a la app del que la memoria no dice ni una palabra.
**Antes de construir algo, buscarlo en el repositorio.**

## Lo pendiente cuando se retome

📌 **Parte de esto ya está resuelto** — ver «El puente de MT5 apareció» al final
de este archivo: los archivos aparecieron el mismo día y están en `puente-mt5/`.
Lo que sigue abajo se deja como estaba porque explica de dónde venía la pregunta.

1. Escribir (o recuperar) el servidor de Python y **guardarlo en el repo**.
2. Decidir dónde vive: en el computador de Néstor solo sirve para él y solo
   con MT5 abierto. Para los suscriptores haría falta un servidor de verdad, y
   eso es infraestructura nueva con costo.
3. ⚠️ **Nunca meter credenciales del bróker en la app** — es el mismo agujero
   que llevó a elegir «importar archivo» en vez de API, y aquí daría acceso al
   DINERO de alguien.
4. Con esto sí habría **spread real por par**, que hoy es una tabla estimada
   `SPREAD_PIPS` a mano.

---

# El argumento de los principiantes (guardado a petición suya, 2026-09-08)

Néstor pidió guardarlo tal cual para la exposición final a los suscriptores.
Es, hasta hoy, **el mejor argumento de venta que ha salido en toda la
conversación**:

> Alguien que empieza **no tiene una hora al día y además no sabe qué mirar**.
> TradingView no le sirve para eso. Esta app sí.

Es más fuerte que el argumento del tiempo a secas, porque son **dos carencias
a la vez** y TradingView solo podría resolver la primera. Un principiante
delante de TradingView tiene todas las herramientas y ninguna idea de cuál
usar; delante de esta app tiene cuatro pestañas y una lista corta.

📌 Y lo dice alguien que **fue ese principiante**: Néstor dice que cuando
empezó le habría servido y habría pagado por ello. Eso no es una hipótesis de
marketing, es el único testimonio de primera mano que tiene el proyecto.

---

# Correlación entre pares (2026-09-08). La #2 de la fase de información

```
app/src/lib/correlacion.js        # la matemática pura
app/scripts/prueba-correlacion.mjs  # 33 comprobaciones, sin internet
```

Cumplió lo prometido: **cero datos nuevos y cero créditos**. Se calcula con los
mismos 300 días que el vigía ya baja.

## Las cuatro decisiones

⚠️ **Sobre los CAMBIOS DIARIOS, nunca sobre el precio.** Correlacionar precios
a pelo da números altísimos y falsos: dos series que suben durante el año «se
parecen» aunque su día a día no tenga nada que ver. Hay una prueba con un
mercado inventado donde el método de precios da **+0,99** y el correcto **−1,00**
sobre los mismos datos.

⚠️ **`pearson` devuelve `null`, no 0, cuando no se puede calcular.** Un 0 diría
«estos dos pares no se parecen» y el usuario abriría los dos creyendo que
diversifica. «No lo sé» y «no se parecen» no son lo mismo.

⚠️ **Las correlaciones NEGATIVAS cuentan igual, y se ordena por valor
absoluto.** Dos pares a −0,9 abren y cierran la misma apuesta: te quedas
pagando los dos spreads y nada más. Para el riesgo, −0,9 pesa como +0,9.

⚠️ **Ventana de 60 sesiones**, no 20. Con 20 una coincidencia de dos semanas
ya se ve como correlación alta y el aviso saltaría por ruido.

## Dónde vive el dato

Se calcula en `computarBarrido` (necesita los cierres COMPLETOS) y **sí se
publica** en `barrido.json`, al revés que `highs`/`lows`: la app no puede
recalcularlo porque solo recibe los últimos 20 cierres. Son **2,1 KB medidos**
—91 parejas— contra los ~370 KB que costaría mandar 60 cierres por par.

⚠️ `derivarVista` **no revienta** si el barrido viejo no trae `correl`:
devuelve lista vacía y la tarjeta no sale. Es la decisión CONTRARIA a
`setupsCaida`, y a propósito: allá una lista vacía se confundiría con «hoy no
hubo señales» y borraría historial; aquí solo se deja de ver una tarjeta.

## Comprobado contra el barrido REAL de producción

Los dos casos más conocidos del Forex salieron correctos, que es la mejor
señal de que el cálculo está bien:

| pareja | correlación | ¿tiene sentido? |
|---|---:|---|
| GBP/JPY y USD/JPY | **+0,95** | sí: las dos las manda el yen |
| EUR/USD y USD/CHF | **−0,83** | sí: es el par inverso de manual |
| EUR/USD y GBP/USD | **+0,83** | sí |
| EUR/NZD y NZD/CAD | −0,87 | sí |

📌 **AUD/USD y NZD/USD no comparten ninguna divisa y se mueven casi igual.** Es
justo el caso que el aviso del Diario —basado en «comparten una moneda»— NO
puede ver, y por eso la correlación medida aporta algo que la regla de dedo no.

**Falta la pantalla.** El dato ya se calcula, se publica y está probado; la
tarjeta en el tablero va aparte y con revisión en navegador, como manda la
costumbre de este repo para todo lo visual.

---

# La correlación, explicada para suscriptores (2026-09-08)

Néstor pidió guardar esto **tal cual** para la exposición a suscriptores, «sobre
todo principiantes». Son tres decisiones técnicas contadas en lenguaje llano, y
funcionan como argumento de venta porque **cada una es una forma de mentir que
la app decidió no usar**:

> **1. Se calcula sobre los cambios de cada día, no sobre el precio.**
> Hice una prueba con un mercado inventado: el método malo da **+0,99** y el
> bueno **−1,00** sobre los mismos datos. Casi todo el mundo lo hace mal.
>
> **2. Cuando no se puede calcular dice «no lo sé», no «cero».**
> Si dijera cero, tú abrirías los dos pares creyendo que estás diversificando.
>
> **3. Las negativas cuentan igual.**
> Dos pares a −0,9 abren y cierran la misma apuesta: pagas dos spreads para
> nada.

📌 **Por qué esto vende:** no es «nuestra app es mejor», es «así es como se hace
bien y aquí está el número que lo demuestra». Un principiante aprende algo
verdadero leyéndolo, y eso es exactamente el producto — información, no
promesas. Es del mismo tipo que la explicación del volumen y la de TradingView.

---

# ¿Puede el computador de Néstor ser el servidor? (2026-09-08)

Preguntó si su PC puede servir el puente de MT5 a los suscriptores,
manteniéndolo encendido de 6 am a 4 pm de lunes a viernes y avisándoles.

Mandó **foto de su MT5 real** (Ava-Real 1-MT5, Ava Trade Markets Ltd), con la
ventana de Observación del Mercado enseñando Bid y Ask por símbolo — que es
justo lo que `useMT5Quotes` lee. Dato útil: **sus símbolos no llevan sufijo**
(`AUDCAD`, `AUDUSD`, no `AUDUSD.r`), así que `normalizarPar` funciona tal cual.

## ⚠️ Lo que hace inviable exponer su PC directamente

**No es la disponibilidad: es que el navegador lo va a bloquear.** La app se
sirve por **HTTPS** desde GitHub Pages, y un navegador **rechaza** que una
página HTTPS llame a una dirección `http://`. Se llama bloqueo de contenido
mixto y no se puede desactivar desde la página.

Para saltarlo haría falta: dominio propio + certificado + IP fija (la de una
casa cambia sola) + abrir un puerto del router al mundo entero — **con MT5 y su
cuenta REAL corriendo en esa misma máquina**.

## ✅ La solución, y es la que el proyecto ya usa

**Que su PC no reciba visitas: que PUBLIQUE.** El puente escribe
`estado/mt5.json` en la rama `datos` cada N minutos, exactamente como el vigía
publica `barrido.json`, y la app lo lee de ahí.

| | exponer el PC | publicar a la rama `datos` |
|---|---|---|
| HTTPS | ❌ bloqueado por el navegador | ✅ ya es HTTPS |
| IP de casa | ❌ cambia sola | ✅ no hace falta |
| Puertos del router | ❌ abiertos al mundo | ✅ ninguno |
| Si el PC está apagado | ❌ la app falla | ✅ enseña el último dato con su hora |
| Riesgo sobre la cuenta real | alto | ninguno: solo salidas |

📌 Con eso el horario deja de ser un problema que hay que anunciar y pasa a ser
un detalle: la app enseña «spread de AvaTrade a las 15:40» y el suscriptor sabe
cuándo se tomó. Es el mismo patrón del aviso «Sin conexión — mostrando el
barrido guardado del [fecha]» que ya existe.

## ⚠️ La honestidad que hay que poner en pantalla

Es **el spread de la cuenta de Néstor en AvaTrade**, no el del suscriptor. Hay
que rotularlo así y nunca como «tu spread»: un suscriptor con otro bróker vería
números que no son los suyos. Sigue siendo útil —es un spread REAL de un bróker
real, mucho mejor que la tabla estimada `SPREAD_PIPS`— pero solo si se dice de
quién es.

## Lo que ganaría el proyecto, aparte de la pantalla

**Sustituir `SPREAD_PIPS` por medidas reales.** Hoy esa tabla está escrita a
mano «en el lado alto de lo normal», y de ella salen TODOS los números del
banco de pruebas. Con spreads reales por par, medidos a distintas horas,
dejaría de ser una suposición.

## Antes de construirlo hay que comprobar dos cosas

1. Que los **14 pares de la app** estén en la Observación del Mercado de MT5.
   En la foto se ven ~13 símbolos y la lista está cortada; MT5 solo entrega
   precio de los símbolos que están ahí.
2. Si Néstor encuentra el puente viejo en su computador (no recuerda dónde
   está). Si no aparece, **se escribe de cero y esta vez SÍ va al repositorio**,
   que es la causa del problema: la mitad JS se guardó y la de Python no.

---

# La pantalla de la correlación (2026-09-08)

`app/src/components/Correlacion.jsx`, tarjeta plegable en el tablero completo,
justo debajo del glosario. Cierra la #2 de la fase de información.

## Tres decisiones de diseño que no son adorno

⚠️ **NO ES UNA MATRIZ.** Con 14 pares serían 91 casillas, ilegibles en un
teléfono y sin jerarquía ninguna: el que va a 0,02 ocuparía lo mismo que el que
va a 0,95. Se enseña la LISTA de los que pasan el umbral, ordenada por tamaño,
que es exactamente lo que hay que mirar antes de abrir dos operaciones.

⚠️ **Las negativas se pintan IGUAL DE GRANDES**, con su propia etiqueta («Se
mueven al revés»). Dos pares a −0,9 abren y cierran la misma apuesta.
Empequeñecerlas por ser negativas sería esconder la mitad del riesgo.

⚠️ **El número NO se pinta de verde ni de rojo.** Aquí ninguno de los dos lados
es «bueno» —los dos son el mismo riesgo— y el color sugeriría lo contrario. Es
la decisión OPUESTA a la de `SetupDetalle`, donde el color va por lo que
significa en plata; aquí no significa nada en plata.

Va plegada por defecto, como el glosario, con **el número de parejas en el
título** para que se sepa si vale la pena abrirla sin abrirla.

## Verificado en Chromium, y qué se miró

Con las correlaciones **reales del barrido de producción**, componente aislado
(el tablero está detrás de Firebase — misma técnica que con `HistorialTab`).

| qué se comprobó | resultado |
|---|---|
| Español | «Pares que se mueven casi igual (14)», 14 filas ordenadas |
| **Árabe** | título en árabe y **los códigos de par siguen en `ltr`** ✅ |
| Tarjeta vacía | **no pinta absolutamente nada** — ni título ni «no hay» |
| Errores de consola | **ninguno**; la página pide 3 archivos y los 3 cargan |

📌 Lo del árabe se comprobó **a propósito y con el CSS calculado**
(`getComputedStyle(...).direction === 'ltr'`), no de vista: es el error que ya
mordió dos veces en este repo (el gráfico y el clima). `dir="ltr"` fijo en los
nombres de par y en el número.

📌 Y la tarjeta vacía se comprobó **en la misma página**, renderizando dos: una
con datos y otra sin. Un barrido viejo sin `correl` no debe dejar una tarjeta
huérfana que haga pensar que la app está rota.

## Los textos, en los 13 idiomas

Cinco claves nuevas (`correl.*`). `titulo` es **función en los 13** porque lleva
el número dentro y cada idioma ordena la frase distinto. Comprobado con
`prueba-idiomas.mjs`.

⚠️ Detalle del entorno, para la próxima vez: el banco de pruebas aislado hay que
construirlo **DENTRO de `app/`** (una carpeta temporal), no en el scratchpad, o
Vite no resuelve `react-dom/client`. Y Playwright necesita
`executablePath: '/opt/pw-browsers/chromium'`.

---

# El puente de MT5 apareció, y desmiente algo que dije ese mismo día (2026-09-08)

Néstor encontró en su computador los dos archivos que faltaban y los pegó en el
chat. Están guardados **tal cual, sin cambiar una línea**, en `puente-mt5/`
(`bridge_mt5.py`, `Iniciar_Ecosistema.bat` y un `README.md` con el detalle
completo). Se guardan como DOCUMENTO: ni el build ni ningún workflow los toca.

## 📌 Lo que desmienten

Esa misma mañana le dije que **su PC no podía servir de servidor** por el
bloqueo de contenido mixto (una página HTTPS no puede llamar a `http://`), y
que saltárselo pedía dominio, certificado, IP fija y abrir un puerto.

**El diagnóstico era correcto y la pregunta ya estaba resuelta desde antes.** El
puente **nunca recibió visitas**: hace `POST` a
`https://nestor-forex-backend.onrender.com/api/mt5/update`, o sea a un servidor
alojado **con HTTPS**, al que su PC solo le ESCRIBE. Es exactamente el patrón
que le propuse como novedad —«que tu PC no reciba visitas: que publique»— y que
él ya venía usando.

⚠️ **Cuarta vez que se construye o se diseña algo que ya existía en el
proyecto.** Aquí ni siquiera es que la memoria mintiera: es que nadie miró. La
regla del 2026-09-04 sigue siendo la misma y hay que aplicarla antes de
diseñar, no después: **buscarlo primero en el repositorio y preguntarle a
Néstor qué tiene en su máquina.**

## ⚠️ LAS DOS MITADES NO ENCAJAN, y hay que decidirlo antes de tocar nada

| | `app/src/lib/useMT5Quotes.js` (repo) | `bridge_mt5.py` (PC) |
|---|---|---|
| dirección | `GET {VITE_API_URL}/quotes` | `POST .../api/mt5/update` |
| quién habla | la app **pide** | el puente **empuja** |
| qué viaja | `bid`, `ask` | velas `high/low/close/volume` |
| cada cuánto | 2 s, desde el navegador | 15 s, desde el PC |

No son dos partes de lo mismo: son **dos intentos distintos** que no se hablan.
Y la diferencia no es de formato — **`bid`/`ask` son lo único que da el spread
real** (hoy estimado a mano en `SPREAD_PIPS`, de donde salen TODOS los números
del banco de pruebas) y **`tick_volume` es lo único que da actividad por vela**,
justo lo que el pie del reporte dice desde siempre que falta. **Hacen falta los
dos**, así que la salida no es elegir uno.

## Lo que falta y lo que hay que preguntar

- **Solo 5 pares** (`USDJPY`, `GBPCAD`, `USDCAD`, `EURUSD`, `GBPUSD`); Swing
  necesita 14 e Intradía 18. Y cada símbolo tiene que estar en la Observación
  del Mercado de MT5 o MT5 no lo entrega.
- ⚠️ **`nestor-forex-backend` (su `server.js`) sigue sin estar en ningún
  repositorio.** Es el siguiente archivo que hay que traer, por la misma razón
  que estos dos.
- Tres preguntas sin respuesta: ¿el servicio de Render sigue vivo? ¿el `POST`
  pide alguna contraseña —si no, **cualquiera puede mandarle precios falsos**—?
  ¿el servidor guarda historial o solo el último dato?

## ✅ Lo que sí está bien

**No hay ninguna credencial en estos archivos.** `mt5.initialize()` se llama
**sin argumentos**: se engancha al MT5 que ya está abierto con la sesión
iniciada a mano. Por eso se pueden guardar en un repositorio público. Y el
puente **solo LEE** (`copy_rates_from_pos`, `symbol_info_tick`): no abre, no
cierra y no modifica nada, así que ni metiéndose en el servidor se podría
operar con su cuenta.

## La recomendación cuando se retome

**Publicar a la rama `datos`**, como todo lo demás del proyecto: el puente
escribe `estado/mt5.json` igual que el vigía escribe `barrido.json`. Así el
servidor de Render deja de hacer falta —ni pagarlo, ni preguntarse si sigue
vivo— y con el PC apagado la app enseña el último dato **con su hora**, como ya
hace con «Sin conexión — mostrando el barrido guardado del…».

⚠️ Y rotularlo por lo que es: el spread de **la cuenta de Néstor en AvaTrade**,
nunca «tu spread».

---

# El calendario económico (2026-09-08). La #1 de la fase de información

El hueco más grande que tenía la app: hoy no sabe que hay Fed esta noche.

```
app/src/lib/calendario.js            # las cuentas puras (Node + navegador)
app/scripts/publicar-calendario.mjs  # baja el feed y escribe estado/calendario.json
app/src/lib/useCalendario.js         # lo lee desde la app
app/src/components/Calendario.jsx    # la tarjeta, arriba del todo en el tablero
app/scripts/prueba-calendario.mjs    # 55 comprobaciones, sin internet
.github/workflows/calendario.yml     # cada 4 h, TODOS los días
```

**Fuente: ForexFactory (FairEconomy).** Se eligió CON LA SONDA del 2026-09-08,
no leyendo documentación: fue la única de cuatro que respondió con eventos de
nuestras divisas. Sin llave, gratis, y **cero créditos de Twelve Data**.

## ⚠️ Por qué NO va dentro del vigía, que era lo cómodo

Dos razones, y ninguna es de gusto:

1. **Frescura.** El vigía corre 15:50 UTC **de lunes a viernes** y el feed
   cubre **la semana EN CURSO**. El lunes por la mañana la última publicación
   sería la del viernes: la semana pasada entera, con todo ya ocurrido y nada
   de lo que viene. Eso no es «un poco viejo», es falso. Por eso el publicador
   corre **cada 4 horas todos los días, fines de semana incluidos**.
2. **Aislamiento.** El vigía escribe el historial, lo único irremplazable del
   proyecto. Un fallo bajando un calendario no puede tener ni la posibilidad
   de tocarlo.

## Las decisiones que no hay que ablandar

⚠️ **EL ARCHIVO NO FILTRA POR «FUTURO»; FILTRA EL NAVEGADOR.** Es lo menos
obvio de todo esto. El archivo es una foto que se publica cada 4 horas y se
lee durante horas: si se quitara lo pasado al publicar, un evento que ocurriera
veinte minutos después seguiría saliendo como «próximo» hasta la siguiente
publicación. Quien tiene el reloj bueno es el navegador de quien mira. Tiene
prueba propia: el mismo archivo, ocho horas más tarde, enseña menos cosas sin
volver a publicarse.

⚠️ **LO DESCONOCIDO SE QUEDA.** Si mañana ForexFactory inventa un nivel de
impacto nuevo, ese evento **se sigue enseñando** (`otro`). Los dos errores no
cuestan lo mismo — enseñar de más es una línea de ruido en una tarjeta
plegada; esconder de más es no enterarse de la Fed — así que la condición no
puede ser simétrica. Es la misma forma de escribir que `yaCorrioHoy` (ante la
duda, correr) y `esSombra` (ante la duda, no avisar).

⚠️ **SI EL FEED RESPONDE PERO NO TRAE NADA NUESTRO, NO SE PUBLICA** y el
workflow falla. Escribir un archivo vacío machacaría el bueno de ayer y en
pantalla se vería igual que una semana tranquila. Mismo peligro que vigila el
respaldo del historial: lo grave no es que algo desaparezca, es que encoja en
silencio.

⚠️ **ES INFORMACIÓN, NO UN FILTRO.** No apaga ni una señal. Esa distinción
—escrita en la fase de información— es la que decide si hace falta medirlo
antes. Si alguien quiere «no operar dos horas antes de una noticia», eso es un
filtro y va al banco de pruebas primero.

⚠️ **La hora es la del TELÉFONO de quien mira.** El feed manda ISO con huso, y
se compara en tiempo absoluto. Un suscriptor en Madrid y otro en Bogotá tienen
que ver cada uno su hora. Y se agrupa por día CIVIL del que mira, no por día
UTC: hay prueba de que el mismo instante cae el día 8 en Bogotá y el 9 en
Madrid.

## 📌 Una prueba que NO comprobaba nada, y cómo se vio

El bloque del huso horario comparaba `new Date(ev.d).getTime()` contra un
número. **Eso comprueba el JavaScript de Node, no este código.** Se rompió el
manejo del huso a propósito y la prueba siguió en verde.

Reescrito para preguntar a través de `proximos` y `agruparPorDia`, que son las
funciones que la pantalla usa de verdad, y con el caso **a caballo del límite**
de las 48 horas, que es donde la diferencia decide algo. Ahora muerde.

📌 **Y de paso me equivoqué en la aritmética del caso** (dije 55 horas cuando
eran 31) y la prueba falló señalándomelo. Es lo que tiene que pasar.

## ⚠️ El error que solo se vio en el navegador (el cuarto de esta clase)

En árabe, la línea de «previsto / anterior» **mezcla palabra traducida y
número**, y yo le puse `dir="ltr"` a todo el renglón. Resultado: el `%` se
despegaba del número y **«24.5K» se partía en dos**, con la «K» en un renglón
y el «24.5» en el siguiente.

**La regla, que ya va por la cuarta vez** (el gráfico, el clima, la
correlación y ahora esto): se fija la dirección **solo de lo que NO es
idioma**. El código de divisa (`USD`) sí va en `ltr` fijo. La hora **no**: la
arma `toLocaleTimeString`, que en árabe saca «١٠:١٤ م» con sus cifras y su
marcador — forzarle `ltr` sería enmendarle la plana al formateador. Y el valor
numérico dentro de una frase traducida va en `<bdi>`, que aísla sin imponer.

## Cómo se verificó

Chromium, componente aislado (el tablero está detrás de Firebase), en español
y en árabe, con las cuatro situaciones en la misma página: normal, archivo
viejo, vacío y nulo. Los dos vacíos **no pintan absolutamente nada**, cero
errores de consola, y la dirección se comprobó **con el CSS calculado**, no de
vista.

⚠️ Detalle del entorno que costó un intento: el banco aislado **no se puede
abrir con `file://`** — los módulos no cargan y la página sale en blanco sin
decir por qué. Hay que servirlo por HTTP (`npx http-server`).

---

# El puente de MT5, completo (2026-09-08). Las tres preguntas, contestadas

Néstor pegó también `server.js`. Los **tres** archivos están ya en
`puente-mt5/`, y con ellos se cerraron las tres preguntas del mismo día:

| pregunta | respuesta |
|---|---|
| ¿Render sigue vivo? | **Sí.** «Cannot GET /» es Express contestando, no un servicio muerto |
| ¿El `POST` pide contraseña? | **NO.** Solo comprueba que venga un `symbol` |
| ¿Guarda historial? | **No.** `let liveMarketData = {}` en memoria; un reinicio lo borra |

⚠️ **Dos agujeros, y el segundo es más silencioso:** cualquiera que sepa la
dirección puede mandarle precios falsos al `POST`; y `app.use(cors())` **sin
opciones** deja que cualquier web del mundo lea `/api/signals`. Ninguna de las
dos cosas la decidió nadie: vinieron por defecto.

⚠️ **Y este servidor NO puede ser la fuente del historial**: los planes gratis
de Render reinician solos y `liveMarketData` se pierde. El primer `GET`
después de un reinicio devuelve `{"estado":"Esperando datos..."}` en vez de
precios; quien lo lea tiene que estar preparado para eso.

✅ **Ninguno de los tres archivos lleva credenciales**, comprobado línea por
línea: `mt5.initialize()` sin argumentos, `server.js` solo lee `process.env.PORT`,
y el `.bat` solo tiene rutas.

## 📌 Néstor escribió una contraseña en el chat

Ofreció inventarse una (`D180556nm@`) para tapar el agujero del `POST`. **No se
usó en ninguna parte** y se le dijo por qué: los dos repositorios son PÚBLICOS
—sería el agujero de Twelve Data otra vez— y el chat queda guardado. Se le pidió
cambiarla si la usa en algún sitio real.

⚠️ **Cuando se tape ese agujero, la contraseña va como variable de entorno en
Render y como secreto de GitHub**, nunca en un archivo. Igual que
`TWELVEDATA_KEY` el 2026-09-03.

---

# El agujero del backend: NO hay que taparlo, hay que APAGAR el servidor (2026-09-08)

Néstor dijo, con razón, que un agujero de seguridad hay que arreglarlo en el
momento «porque después se queda olvidado». Al ir a taparlo aparecieron dos
cosas que cambian cuál es el arreglo correcto.

## 1. La app publicada NUNCA llama a Render

```
app/.env.production:  VITE_API_URL=http://127.0.0.1:8000
```

Eso es **el propio aparato de quien abre la app**. Comprobado también sobre el
build: la palabra `onrender` **no aparece** en `dist/`, y las únicas
direcciones que quedan compiladas son las de Firebase, `raw.githubusercontent`
y ese `127.0.0.1`.

O sea que **nada de lo publicado lee ese servidor**. Y aunque `VITE_API_URL`
apuntara a Render, `CotizacionesVivo` arranca APAGADA y solo pide algo si
alguien pulsa el botón — así que tampoco hay un panel roto a la vista de nadie.

📌 Y de paso explica por qué el puente «nunca funcionó» en producción: una
página HTTPS llamando a `http://127.0.0.1` es el bloqueo de contenido mixto,
justo lo descrito esa misma mañana. La mitad JS lleva meses sin poder funcionar.

## 2. `nestor-forex-backend` NO está en GitHub

La cuenta solo tiene **dos** repositorios: `Nestor-forex` y
`Nestor-forex-intradia`. El backend vive únicamente en el PC de Néstor y en
Render.

⚠️ **Consecuencia que hay que tener clarísima:** `puente-mt5/server.js` de este
repositorio es una **copia de respaldo**, no el código que corre. Arreglarlo
aquí **NO arregla el servidor vivo**. Haría falta que Néstor lo cambiara en su
máquina y lo volviera a desplegar.

## ✅ El arreglo, entonces, es APAGAR el servicio de Render

No es pereza, es que endurecer un servidor que no usa nadie es trabajo tirado:

| | tapar el agujero | apagar el servicio |
|---|---|---|
| ¿cierra el `POST` abierto? | sí | **sí, del todo** |
| ¿cierra el `cors()` abierto? | sí | **sí, del todo** |
| ¿rompe algo publicado? | no | **no — nada lo lee** |
| ¿hay que desplegar? | **sí**, y Néstor no sabe | no, un clic |
| ¿sirve si luego se abandona Render? | no, se tira | — |

Y encaja con la recomendación que ya estaba escrita: cuando se retome el
puente, que **publique a la rama `datos`** como todo lo demás. Sin servidor no
hay agujeros que tapar, ni servicio que pagar, ni preguntarse si sigue vivo.

⚠️ **Si algún día se decide MANTENER Render**, entonces sí hay que hacer las
dos cosas —contraseña en el `POST` y `cors()` restringido a los orígenes de las
dos apps— y la contraseña va como variable de entorno en Render y secreto de
GitHub, **nunca escrita en el archivo**: los dos repositorios son públicos.

---

# ¿Para qué pasar los spreads a mano si el puente es justo para eso? (2026-09-08)

Néstor preguntó exactamente eso, y **tenía razón**. Queda escrito porque la
pregunta destapa que yo le estaba pidiendo trabajo que el puente hace mejor.

## La respuesta corta: sí, el puente los sustituye. Pero HOY no da ninguno

⚠️ **El puente tal como está no manda spread.** `bridge_mt5.py` manda velas
(`high`, `low`, `close`, `tick_volume`). El spread sale de `bid` y `ask`, y eso
**no lo manda nadie**: lo espera `useMT5Quotes.js`, la mitad que no encaja.

Así que hoy la elección real es:

| | qué da | cuándo |
|---|---|---|
| Néstor leyendo la pantalla | 18 números, un instante, una sesión | 5 minutos |
| El puente arreglado | los mismos 18, **muchas veces al día y solos** | días de trabajo |

**El puente gana por goleada en cuanto funcione** — muchas muestras a distintas
horas en vez de una foto— así que la lectura a mano es un **parche mientras
tanto**, y solo vale la pena si el puente se demora.

## Lo que NO cambia con el puente, y hay que decirlo igual

Sea a mano o automático, es **el spread de la cuenta de Néstor en AvaTrade**.
No es el del suscriptor. Eso hay que rotularlo siempre, y el puente no lo
arregla.

📌 **Lección para mí:** antes de pedirle trabajo manual, comprobar si algo que
ya estamos construyendo lo hace solo. Él lo vio y yo no.

---

# El calendario, rehecho tras verlo Néstor (2026-09-08)

Se publicó, él lo abrió y **no lo entendió**. Tres cosas concretas, y las tres
eran del diseño y no suyas. Queda escrito porque es el mejor ejemplo del
proyecto de que **compilar y hasta revisar en navegador no basta: hasta que no
lo mira el usuario de verdad, no está probado.**

## 1. El código de divisa iba pintado por impacto → lo leyó como «el USD está mal»

`USD` en rojo y `GBP` en ámbar. Él preguntó por qué unas divisas salían en rojo
y otras en naranja, y tenía toda la razón: **el calendario no sabe hacia dónde
se va a mover el precio**, así que pintar la divisa de rojo dice algo que el
dato no dice.

Ahora el código va en color neutro y el impacto se dice **con una palabra** en
su propia pastilla: «Mueve mucho» / «Mueve algo» / «Festivo». El color
acompaña a la palabra; nunca la sustituye.

📌 Es la misma familia de error que la decisión de `Correlacion.jsx` («el
número NO se pinta de verde ni de rojo»), pero aquí se coló igual. La regla
general: **antes de pintar algo de color, preguntarse qué afirma ese color.**

## 2. Los nombres venían en inglés y en jerga

Yo le conté en el chat «el BCE decide tipos» y «la inflación de EE. UU.». La
app decía `Main Refinancing Rate` y `Core PPI m/m`. No los reconoció, y con
razón: **son cosas distintas escritas en idiomas distintos.**

⚠️ **Néstor pidió expresamente conservar la jerga y poner la traducción entre
paréntesis**, no sustituirla — y es lo correcto: el nombre en inglés es el que
va a ver en cualquier otro calendario del mundo, así que cambiarlo le quitaría
el enlace con todo lo demás. Queda `Core PPI m/m (Inflación)`.

**`categoriaDe` CLASIFICA, no traduce.** Traducir cientos de títulos obligaría
a inventar, y el día que ForexFactory publique uno nuevo saldría mal traducido
sin que nadie se entere. Clasificar por familia es poco y es verdad: «Core PPI
m/m» ES inflación, se llame como se llame.

⚠️ **Y si no reconoce el evento, NO DICE NADA.** Devuelve `null` y se enseña
solo el nombre original. Una categoría equivocada es peor que ninguna, porque
se cree. Tiene comprobación propia.

## 3. «17 eventos» contra «6 en pantalla», sin decir qué contaba cada uno

Se le dijo «17 eventos reales» y él veía 6. **Los dos números eran ciertos**:
17 es la semana entera del archivo, 6 son los de las próximas 48 horas que la
tarjeta enseña. Pero puestos sin explicar, se lee como que la app se equivoca.

Ahora el pie lo dice: «Se muestran los 6 de las próximas 48 horas. Esta semana
hay 17 en total.»

📌 **Y el título también cambió**: «Qué se publica hoy y mañana» no dice para
qué sirve. Ahora «Noticias que pueden mover el precio» — **pueden**, no
«mueven», porque prometer el movimiento sería lo de siempre.

## ⚠️ Un fallo mío que no debe repetirse

Escribí «17 eventos reales, 1,7 KB» en una tabla **sin haber leído el log del
workflow**, y describí los eventos del jueves en español sin haber abierto el
archivo publicado. Los datos resultaron ser correctos al comprobarlos después
—el archivo traía 17, y el BCE era a las 7:15— pero **eso fue suerte, no
método**. Afirmar antes de verificar es exactamente lo que este proyecto
lleva meses corrigiendo.

---

# El puente de MT5, reescrito y enchufado (2026-09-08)

Néstor: **«quiero que el puente envíe los spreads también, quiero dejarlo
listo, no para después»**. Y sobre Render: **«¿para qué lo dejamos encendido si
nada lo lee?… si es mejor publicar a la rama de datos, entonces hagámoslo»**.

```
puente-mt5/bridge_mt5.py       # reescrito: lee MT5 y publica a la rama `datos`
puente-mt5/.gitignore          # token.txt NUNCA se sube (comprobado)
app/src/lib/useMT5Quotes.js    # lee un archivo, ya no llama a un servidor
app/src/components/CotizacionesVivo.jsx
app/scripts/prueba-mt5.mjs     # reescrito al contrato nuevo
```

## Lo que cambia, y por qué cada cosa

**1. Ahora manda el spread.** La versión anterior mandaba velas pero **no**
`bid` ni `ask`, y el spread sale justo de la diferencia entre esos dos. O sea
que **el dato por el que existe el puente no viajaba.**

**2. Se acabó el servidor.** Publica en la rama `datos`, igual que el vigía:

| archivo | qué lleva | para qué |
|---|---|---|
| `estado/mt5.json` | bid, ask, spread y ticks por par | la pantalla |
| `spreads/<fecha>.jsonl` | una muestra por corrida | **medir** |

⚠️ **El segundo es el que da sentido a todo esto.** Sin acumular, el dato se
evapora en cada vuelta y seguiríamos con `SPREAD_PIPS` escrita a mano —de donde
salen TODOS los números del banco de pruebas—.

⚠️ Va en `spreads/`, **lejos de `historial/`**: el historial de señales es lo
único irreparable y ningún guion nuevo tiene por qué escribir cerca de él.

**3. Cada 15 minutos, no cada 15 segundos.** Antes era una petición a un
servidor; ahora cada corrida deja un commit, y uno cada 15 s serían miles/día.

**4. 18 pares** (los 14 de Swing + los 4 de Intradía), no 5.

## 📌 Por qué el puente NUNCA funcionó en producción

No era un descuido: `VITE_API_URL` valía `http://127.0.0.1:8000`, que es «este
mismo aparato» —el teléfono de quien abre la app—. Y aunque hubiera apuntado a
un servidor real por `http://`, el navegador lo habría **bloqueado**: una
página HTTPS no puede llamar a una dirección sin cifrar. Leyendo un archivo de
`raw.githubusercontent.com` los dos problemas desaparecen a la vez.

## El permiso de GitHub: dónde va y dónde NO

El puente necesita escribir, y para eso hace falta un token. **Nunca en el
archivo**: los dos repositorios son públicos. Se busca en `NF_TOKEN` o en un
`token.txt` al lado del guion, que **`.gitignore` bloquea** — comprobado con
`git check-ignore`, no supuesto.

Es un token *fine-grained*, **solo este repositorio** y **solo Contents:
write**. No da acceso al correo, ni al bróker, ni al dinero. Los pasos con
clics están en `puente-mt5/README.md` §0.

## ⚠️ La prueba vieja falló, y eso era su trabajo

`prueba-mt5.mjs` fijaba el contrato viejo (un servidor con formatos variables:
lista pelada, dentro de `quotes`, llaves en mayúscula, sufijos del bróker…).
**Se reescribió al contrato nuevo, no se borró.**

Aquella flexibilidad tenía sentido mientras el formato lo decidía un servidor
escrito aparte. Ahora el archivo lo escribe `bridge_mt5.py`, que está en ESTE
repositorio: **aceptar diez formas de un archivo que escribimos nosotros no es
robustez, es dejar sin comprobar que el puente escriba lo que dice escribir.**
La limpieza de sufijos no se perdió — se hizo en el puente, que es donde está
el símbolo crudo de MT5.

## 📌 Y la prueba nueva cazó un fallo real al estrenarse

`minutosDesde(null)` no devolvía `null` sino **29 millones de minutos**:
`new Date(null)` NO es una fecha inválida en JavaScript, es el 1 de enero de
1970. Sin el `typeof`, un archivo sin `actualizadoEl` habría pintado un aviso
de «foto vieja» perfectamente convincente y completamente inventado.

## Cómo se verificó

Chromium, componente aislado, en español y árabe, **con los tres estados en
cargas separadas**: normal, foto de hace 5 h (sale el aviso ámbar arriba de la
tabla, no debajo) y puente apagado. Cero errores de consola, y `dir="ltr"`
comprobado con el CSS calculado en pares y números.

⚠️ La primera versión del banco de pruebas tenía un fallo MÍO: los tres casos
se renderizaban a la vez sobre una variable global y el último pisaba a los
otros dos — los tres salían «sin datos» y parecía un fallo de la app. Se
separó en tres cargas de página. **Antes de creerse que la app está rota,
comprobar que el banco de pruebas mide lo que dice.**

---

# Intradía se puso al día: calendario y spread real (2026-09-08)

Néstor preguntó «¿hiciste cambios también en Intradía?». La respuesta era **no
—todo lo del día había sido solo en Swing—** y al ir a mirar qué le faltaba
salió un error mío que llevaba horas publicado sin que nada fallara.

## ⚠️ EL ERROR: el puente vigilaba 18 pares, y dos no los usa nadie

`SYMBOLS` en `puente-mt5/bridge_mt5.py` se escribió **de memoria**. Los 14 de
Swing salieron bien; los 4 «que además usa Intradía» salieron así:

| escrito | real (`pairs.js` de Intradía) |
|---|---|
| EUR/GBP ✅ · AUD/JPY ✅ | EUR/GBP · AUD/JPY |
| **EUR/JPY ❌ · CAD/JPY ❌** | **NZD/JPY · AUD/NZD** |

**Y no falló nada.** El puente publicó 18 pares con precios reales, la cuenta
cuadraba (18 = 14 + 4) y el archivo se veía perfecto. Néstor incluso añadió
EURJPY y CADJPY a su Observación del Mercado siguiendo esa lista. Solo se vio
al abrir el `pairs.js` del otro repositorio y comparar par por par.

**Consecuencia práctica:** la tarjeta de precios de Intradía enseña hoy 16 de
sus 18 pares. Se comprobó en el navegador con el archivo real de producción: la
tabla sale entera menos NZD/JPY y AUD/NZD.

### El arreglo, que no es «tener más cuidado»

`app/scripts/prueba-mt5.mjs` bloque 7: lee `bridge_mt5.py` **como texto** (Node
no importa Python, y el puente necesita MetaTrader5 instalado), saca `SYMBOLS`,
y exige cuatro cosas — que estén los 14 de Swing (sacados de `pairs.js`, así que
si Swing añade un par lo pide solo), que estén los 4 de Intradía, que no haya
ninguno repetido, y **que no sobre ninguno**. Esa última es la que cazó el
error: EUR/JPY y CAD/JPY no rompían nada, solo hacían trabajar a MT5 de balde.

Comprobado que **muerde**: con la lista vieja puesta a propósito fallan dos
comprobaciones y nombran los cuatro pares. La lista buena la deja en verde.

⚠️ Los 4 de Intradía van **escritos a mano** en esa prueba y no hay forma de
evitarlo: su `pairs.js` vive en el otro repositorio y la prueba corre sin red.
Están escritos ahí Y en la nota de PRIMOS de `pairs.js` en `gemelos.mjs`.

## Lo que se portó a Intradía, y lo que NO

| | portado | por qué |
|---|---|---|
| Calendario económico | ✅ | En Intradía pesa MÁS: una operación empieza y acaba dentro de esas horas |
| Precios y spread del bróker | ✅ | El puente ya publicaba los 18 pares a propósito |
| Correlación entre pares | ❌ | La ventana de 60 sesiones son 60 HORAS ahí: 2,5 días. Elegir la de intradía pide mirar SUS datos |
| Clima del par | ❌ | Ya estaba decidido: los umbrales de ATR no se pueden copiar |
| Mediciones en pantalla | ❌ | Son las de cada app; enseñar las de la hermana sería mentir con números verdaderos |

## Seis archivos nuevos son GEMELOS, y uno de ellos es la propia lista

`calendario.js`, `Calendario.jsx`, `publicar-calendario.mjs`,
`prueba-calendario.mjs`, `useMT5Quotes.js` y `CotizacionesVivo.jsx`. Más
`scripts/gemelos.mjs` **a sí mismo**: es el archivo que dice qué no puede
separarse, así que es el último que puede permitirse separarse — si se le añade
un gemelo en una app y no en la otra, cada repositorio vigila una lista distinta
y ninguno lo dice. Ya eran idénticos por casualidad; ahora está comprobado.

Para que lo fueran hubo que quitar tres frases que decían «vela diaria»:

- **`calendario.js`, el filtro de impacto bajo.** Decía «ninguno mueve una vela
  diaria». En velas de una hora sí mueven algo, así que la tentación era
  dejarlos en Intradía. Pero el motivo real de quitarlos **no es que no muevan
  el precio: es que treinta líneas de ruido tapan las dos que importan**, y eso
  vale igual en las dos. Queda idéntico, con el porqué escrito dentro.
- **`calendario.js`, las 48 horas.** Decía «aquí cada vela es un día». No mide
  cuánto dura una operación: mide **hasta dónde se ve venir algo**. Saber que
  hay Fed esta noche cambia lo que se hace esta mañana en las dos.
- **`vivo.desc` en los 13 idiomas.** «trabaja con velas diarias» → «trabaja con
  velas». Y `calendario.pie` pasó a decir el motivo verdadero.

📌 Las tres se reescribieron **neutras en las DOS apps** en vez de crear una
diferencia nueva. Cada frase con «diaria» dentro de un archivo gemelo es una
divergencia esperando a ocurrir.

## Los dos que siguen siendo PRIMOS

- **`useCalendario.js`**: cada app publica y lee SU calendario. El contenido es
  el mismo —las 8 divisas coinciden— pero si Intradía leyera el archivo de
  Swing, un fallo del workflow de Swing la dejaría sin calendario y nadie sabría
  dónde buscar. Bajar el feed no cuesta ni un crédito: la independencia sale
  gratis. De paso, la clave de caché pasó de `nf_calendario_v1` (sin prefijo, en
  las dos) a `clave('calendario_v1')`.
- **`prueba-mt5.mjs`**: el bloque 7 abre el puente, y el puente vive en un solo
  sitio. Un puente, una casa, una comprobación.

## ⚠️ El puente es UNO y sirve a las dos apps

`useMT5Quotes.js` de Intradía apunta a la rama `datos` **de Swing**, que es
donde vive `bridge_mt5.py`. Por eso el archivo es gemelo exacto: la dirección es
la misma y cada app filtra con su propio `PAIR_NAMES`. Dos puentes serían dos
programas que Néstor tendría que arrancar cada mañana.

## Cómo se verificó

Lint, build y las 18 pruebas sin internet en Intradía (solo falla
`prueba-aviso-real`, que pide el secreto VAPID y manda un aviso de verdad).
Comprobado por máquina que **todas** las claves de i18n que usan los dos
componentes existen en el diccionario de Intradía, incluidas las nueve
categorías y los tres niveles de impacto — un `t()` sin clave no da error, sale
en blanco.

Y en **Chromium**, componente aislado (las dos tarjetas están detrás de
Firebase), con el `calendario.json` y el `mt5.json` **reales de producción**, en
cinco cargas de página separadas:

| caso | resultado |
|---|---|
| español | 6 eventos agrupados por día, con categoría entre paréntesis; 16 pares con su spread |
| **árabe** | títulos en árabe, y los códigos de par y los números en `ltr` — comprobado con el CSS calculado |
| calendario vacío | **no pinta absolutamente nada** |
| calendario nulo | ídem |
| puente apagado | «Todavía no hay precios del bróker», sin mensaje de error rojo |

Cero errores de consola en todos.
