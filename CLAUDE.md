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

---

# Tasas de interés: la sonda, primero (2026-09-08)

La **#3 de la fase de información**. Néstor la pidió después del calendario.
Va por el mismo camino que aquél: **sonda primero, lector después.**

```
app/scripts/sonda-tasas.mjs        # pide, cuenta y enseña. No interpreta
.github/workflows/sonda-tasas.yml  # solo a mano
```

La red de estas sesiones **bloquea las tres candidatas** — comprobado, no
supuesto: `stats.bis.org`, `data-api.ecb.europa.eu` y `api.frankfurter.app`
devuelven `Host not in allowlist` del proxy. Así que desde aquí no se puede
ver ni si responden.

## La candidata buena, y por qué

**BIS, dataflow `WS_CBPOL`.** Publica la tasa de referencia de unos cuarenta
bancos centrales **con la misma definición para todos**, sin llave. Es la
fuente que republican los demás, FRED incluido: ir al BIS es ir al original.
Encaja con la decisión del COT del mismo día — leer el archivo oficial
nosotros mismos y no depender de nadie.

Se sondean **cuatro formas de la dirección** (v1 y v2, CSV y JSON) porque la
API del BIS cambió y desde aquí no se puede comprobar cuál está viva. Más el
BCE como contraste para el euro, y **FRED SIN llave a propósito**, para dejar
comprobado que la pide en vez de suponerlo.

Códigos de país en el BIS: `USD→US · EUR→XM · GBP→GB · JPY→JP · CHF→CH ·
CAD→CA · AUD→AU · NZD→NZ`. **`XM` es el área del euro**, no un país: la tasa
la pone el BCE para los veinte.

## ⚠️⚠️ LO QUE NO HAY QUE EXAGERAR CUANDO LLEGUEN LOS DATOS

**La diferencia de tasas NO ES EL SWAP.** Es de dónde SALE, que no es lo mismo:

- el banco central pone la referencia;
- el bróker le añade un margen que **no publica nadie**;
- y ese margen es **asimétrico**: en una dirección pagas y en la otra a veces
  cobras, pero casi nunca tanto como pagarías al revés.

O sea que esto da **el signo y el orden de magnitud**, no el número. El banco
de pruebas **seguirá barriendo varios niveles de swap**; lo que cambia es que
dejará de barrerlos a ciegas — sabremos cuáles son plausibles y en qué pares
el swap juega a favor.

📌 Queda escrito ANTES de ver los datos, a propósito. Es la cuarta vez en este
proyecto que un mecanismo convincente resulta ser menos de lo que parecía, y
«ya sabemos el swap» es justo la frase que se diría sola al ver la tabla.

## Lo siguiente

Lanzar la sonda (**Actions → «Sonda de las tasas de interés» → Run
workflow**), leer el log, y **con la forma real delante** escribir el lector.
Nunca al revés.

---

# El `.bat` no abría ninguna ventana, y era culpa del archivo (2026-09-09)

Néstor pegó el acceso directo en el escritorio, cerró la ventana negra para
probar, y al hacer doble clic **no pasaba nada**. Ni ventana, ni error.

## La causa, y no era suya

`Iniciar_Puente.bat` se escribió en Linux, o sea con **saltos de línea LF**, y
llevaba dos bloques así:

```bat
if not exist "bridge_mt5.py" (
  echo [ERROR] ...
  pause
)
```

**`cmd` de Windows no analiza bien un bloque de paréntesis de varias líneas
cuando los saltos son LF.** Aborta el guion entero, y la ventana se cierra
antes de que dé tiempo a leer nada — desde fuera se ve *exactamente igual* que
«no abre».

## ⚠️ El detalle que casi deja el arreglo a medias

Lo natural era poner `*.bat text eol=crlf` en un `.gitattributes`. **Habría
seguido roto**, y el motivo es cómo baja Néstor el archivo:

| | qué guarda el repositorio | qué baja Néstor |
|---|---|---|
| `text eol=crlf` | **LF** (convierte solo al hacer `git checkout`) | **LF — roto** |
| **`-text`** | **CRLF, tal cual se escribió** | **CRLF — bien** |

Él **no clona**: usa el botón de descarga de GitHub, y eso entrega los bytes
**tal como están guardados**. Comprobado con
`git cat-file -p :puente-mt5/Iniciar_Puente.bat`, que enseña lo que el
repositorio guarda de verdad — no lo que hay en el disco. La primera versión
del arreglo pasaba la comprobación del disco y fallaba la del repositorio.

📌 **La lección, que es la de siempre con otra cara:** comprobar el artefacto
que la persona va a recibir, no el que uno tiene delante. Es hermana de «el
banco de pruebas tiene que medir lo que dice medir».

## Las tres defensas, y las tres hacen falta

1. El archivo en **CRLF**.
2. `puente-mt5/.gitattributes` con **`*.bat -text`** (ver arriba por qué no
   `eol=crlf`).
3. El `.bat` **ya no usa bloques de paréntesis**: etiquetas y `goto`, que
   funcionan con cualquier salto de línea. Es más largo de leer y no se rompe.

Y de paso: **ni un emoji ni una tilde dentro**. La consola de Windows en
español no usa UTF-8 por defecto y los sacaría como símbolos sin sentido justo
en los mensajes de error, que es cuando más falta hace entenderlos.

## Dos cosas más que se aprendieron del mismo problema

📌 **La opción «Crear acceso directo» deja el acceso directo AL LADO del
original**, no en el escritorio. La que lo manda al escritorio es «Enviar a →
Escritorio». Néstor lo intentó tres veces y las tres se quedaron en la carpeta
— se veían en su captura, numeradas (2) y (3).

📌 **Se añadió una comprobación de que Python existe** (`where python`). Sin
ella, Windows dice «no se reconoce como un comando interno o externo», que no
le dice nada a nadie.

**Para arrancar el puente sin el `.bat`**, mientras tanto: abrir la carpeta,
clic en la barra de direcciones, escribir `cmd`, Enter, y ahí
`python bridge_mt5.py`.

## Y el motivo REAL era otro: Smart App Control (2026-09-09)

📌 **Corrección, y es del tipo que este archivo lleva meses coleccionando.**
El apartado de arriba diagnostica los saltos de línea con seguridad y dice
«encontrado, es culpa mía». **Era un fallo real y el arreglo se queda** — con
LF ese `.bat` habría fallado igual—, **pero NO era lo que le estaba pasando a
Néstor.**

Lo que salía en su pantalla, y solo se supo cuando mandó la foto:

> **Control Inteligente de Aplicaciones ha bloqueado un archivo que podría no
> ser seguro.** «Este archivo se bloqueó porque este tipo de archivos de
> Internet pueden ser peligrosos.»

Es **Smart App Control** de Windows 11: bloquea lo descargado de internet. Se
pulsa «De acuerdo» y no pasa nada más — desde fuera, otra vez, idéntico a «no
abre».

⚠️ **Quinta vez que presento un mecanismo convincente antes de tener la
prueba.** Y aquí con un agravante que conviene ver: el mecanismo era **cierto**
—el archivo tenía ese defecto— y aun así **no era la causa**. Un defecto real
que explicaría el síntoma sigue sin ser el diagnóstico. La lección práctica es
la de siempre en este proyecto y sigue costando: **pedir la captura antes de
teorizar**, exactamente como está escrito arriba del todo sobre el «no veo
nada nuevo» del 2026-07-30.

### ⚠️ LO QUE NO HAY QUE HACER: apagar esa protección

Windows **no deja volver a encender Smart App Control sin reinstalar el sistema
entero**. Es un camino de una sola dirección. Nunca proponérselo a Néstor ni a
un suscriptor.

### Las dos salidas, y por qué la primera es mejor

**A. Que el acceso directo llame a `cmd`, no al `.bat`.** Target
`cmd.exe /k python bridge_mt5.py` y la carpeta del puente en «Iniciar en».
**No hay nada que descargar, así que no hay nada que bloquear**: `cmd.exe` es
un programa del propio Windows, firmado. Hace exactamente lo mismo que el
`.bat` por un camino que Windows no toca.

**B. Desbloquear el archivo** (Propiedades → casilla «Desbloquear»). Funciona,
pero **hay que repetirlo cada vez que se vuelva a bajar**.

📌 **Consecuencia de diseño, no solo de soporte:** un `.bat` descargado es
frágil en Windows 11 por construcción. Si algún día se le da esto a
suscriptores, la instrucción por defecto tiene que ser la A — o habrá que
firmar el archivo, que cuesta dinero y no lo vale para tres líneas.

---

# El swap, explicado para suscriptores (guardado a petición suya, 2026-09-09)

Néstor pidió guardar esto **tal cual** para la exposición a suscriptores:
«en su momento veremos cómo la agregamos como información general». Va con las
otras tres del mismo tipo —la del volumen, la de TradingView y la de la
correlación—, y funciona por el mismo motivo: **es una forma de exagerar que la
app decide no usar, contada con el mecanismo delante.**

> **De dónde salen las tasas.** La candidata fuerte es el **BIS** (Banco de
> Pagos Internacionales): publica la tasa de referencia de unos 40 bancos
> centrales **con la misma definición para todos** y sin llave. Es de donde
> copian los demás.
>
> **Una cosa que quiero dejarte clara desde ahora, antes de ver ningún número:**
>
> **La diferencia de tasas NO es el swap.** El banco central pone la
> referencia, pero el bróker le suma su margen — y ese margen **no lo publica
> nadie**, y además es **desigual**: en una dirección pagas, en la otra a veces
> cobras, pero casi nunca lo mismo.
>
> Lo que esto nos da es **el signo y el tamaño aproximado**: en qué pares el
> swap juega a tu favor y en cuáles en contra. Seguiremos probando varios
> niveles en el banco de pruebas, pero **ya no a ciegas**. Lo escribí así en el
> código **antes** de mirar los datos, a propósito.

📌 **Por qué esto vende, igual que las otras tres:** el suscriptor aprende algo
verdadero y comprobable —que el swap que le cobran no es la resta de las tasas—
y de paso ve que la app dice hasta dónde llega su propio dato. Es información,
no promesas.

📌 **Y el detalle que lo hace creíble está en el repositorio, no en la frase:**
la advertencia está escrita dentro de `app/scripts/sonda-tasas.mjs` con fecha
anterior a los datos. Si algún día alguien pregunta si eso se dijo antes o
después de ver la tabla, el historial de commits lo contesta.

---

# «¿Por qué dice que no hay datos de MT5 si ya los recibe?» (2026-09-09)

La preguntó Néstor leyendo la app, y **tenía razón**. Es el mismo patrón que
este archivo lleva meses coleccionando: **al cambiar algo, mirar también quién
lo NOMBRA.** El puente empezó a publicar bid/ask el 2026-09-08 y el texto del
pie se quedó como estaba.

## El estado real, comprobado en el código antes de contestar

| dato | ¿llega de MT5? | ¿lo usa alguien? |
|---|---|---|
| bid, ask y **spread real** | ✅ 18 pares cada 15 min | ✅ **solo** la tarjeta «Lo que cuesta abrir la operación» |
| **tick volume** | ✅ viaja en `estado/mt5.json` | ❌ **nadie lo pinta** — `useMT5Quotes` lo lee y ahí se queda |
| el barrido / el tablero | ❌ | velas de Twelve Data, sin tocar MT5 |
| el reporte diario | ❌ | `reporte-diario.mjs` no menciona MT5 ni una vez |
| el banco de pruebas | ❌ | `SPREAD_PIPS` sigue escrita a mano |

📌 **La frase no era del todo falsa, y esa es la parte interesante.** Donde
está escrita describe **el barrido**, y el barrido efectivamente no usa ninguno
de los dos. Lo que la volvía engañosa es que, leída en la app, está a pocos
centímetros de una tarjeta que **sí** enseña el spread real del bróker.

## Cómo quedó

> «El barrido no usa tick volume ni el spread del bróker — la liquidez se
> estima cualitativamente. El spread REAL del bróker se muestra aparte,
> mientras el puente de MT5 esté encendido.»

En **los 13 idiomas y en las DOS apps**, más el `fakeData.js` de cada una.

⚠️ **A propósito NO se nombra la tarjeta** («Lo que cuesta abrir la
operación»). Ese título está traducido en cada idioma, así que citarlo obligaría
a mantener dos textos en sintonía en trece sitios — y el día que cambiara el
título, doce quedarían mintiendo.

📌 **Y ocho idiomas de Intradía tenían la frase redactada DISTINTA**, así que el
reemplazo falló ahí en la primera pasada. Se trajo el texto exacto de cada uno
en vez de suponer que coincidían. Es lo que tiene que pasar cuando un script de
reemplazo exige encontrar el original **exactamente una vez**: si hubiera hecho
`replace` a ciegas, esos ocho se habrían quedado viejos en silencio.

## ⚠️ Lo que esta pregunta deja pendiente

**El tick volume se está publicando y no lo mira nadie.** El puente lo saca de
la vela diaria en curso, viaja en `estado/mt5.json` y `useMT5Quotes` lo
normaliza — pero `CotizacionesVivo` no lo pinta. O sea que hay un dato real
llegando cada 15 minutos a la nada.

No es un fallo: nunca se decidió enseñarlo. Pero **si algún día se enseña, hay
que rotularlo por lo que es** — cuántas VECES cambió el precio en un solo
bróker, no volumen — con el texto que ya está escrito en este archivo bajo «Lo
que NO se puede tener en Forex».

---

# La actividad (tick volume) ya se ve en pantalla (2026-09-09). En las dos apps

Néstor lo pidió al leer la nota de arriba: **«el tick volume se está publicando
cada 15 minutos y no lo mira nadie… quiero que esto lo mostremos en las apps»**.
Tenía razón: llevaba un día entero llegando a la nada.

Cambio **emparejado y gemelo**: `CotizacionesVivo.jsx` idéntico en los dos
repositorios, misma rama en los dos, más dos claves nuevas (`vivo.actividad` y
`vivo.actividadPie`) en los 13 diccionarios de cada app.

## Qué se enseña, y cómo

Una quinta columna en la tarjeta «Lo que cuesta abrir la operación»: el número
y una barrita con la proporción respecto al par más activo de **esa misma
lectura**. Debajo, el rótulo honesto de lo que es y de lo que no es.

## Las cuatro decisiones que no hay que ablandar

⚠️ **No se llama «volumen» en ninguna parte de la pantalla.** Se llama
ACTIVIDAD. En Forex no existe un volumen real —no hay bolsa central que apunte
las operaciones—, así que nadie tiene el total. El dato no es basura y hay
operadores con experiencia que lo usan sabiendo lo que es; **el problema sería
el rótulo, no el dato**. Ver «Lo que NO se puede tener en Forex» más arriba.

⚠️ **Solo compara pares entre sí, nunca días entre sí.** Los 18 números salen
del MISMO instante, del MISMO día y del MISMO bróker: compararlos unos con
otros es legítimo. Compararlos con los de ayer no lo sería, porque es el
`tick_volume` de la vela diaria **EN CURSO** y crece hasta el cierre. Por eso la
barra se mide contra el par más activo de esa lectura y no hay ni una
comparación con nada anterior. La frase «el día va a medias» está en los 13
idiomas a propósito.

⚠️ **La barra va en color neutro.** Ni verde ni rojo: mucha actividad no es
buena ni mala, y el color afirmaría lo contrario. Misma decisión que en
`Correlacion.jsx`, y misma regla general — **antes de pintar algo de color,
preguntarse qué afirma ese color**.

⚠️ **Si NINGÚN par trae actividad, la columna entera desaparece.** Pasa con un
archivo publicado por un puente viejo, y una columna de guiones se lee como que
la app está rota. Si solo faltan algunos, sale `—` y no `0`: un cero diría «no
se movió», que es una afirmación, y no sabemos nada.

## 📌 Dos cosas que solo se vieron en el navegador, y las dos eran reales

**1. El separador de miles hacía que el número pareciera un precio.** Se usaba
`toLocaleString(locale)`, que en español agrupa con PUNTO: salía «2.926» justo
al lado de una columna de precios donde el punto es el decimal («1.16290»). Y
en árabe el mismo formateador sacaba cifras árabo-índicas mientras los precios
de la misma tabla iban en cifras latinas — **dos sistemas de dígitos en una
tabla de números**. El entero pelado no tiene ninguno de los dos problemas.

**2. La barra se leía como un SUBRAYADO del número.** El riel iba del ancho del
número y en un color casi invisible, así que solo se veía la parte llena: sin el
riel entero detrás no hay contra qué comparar, y una barra sin referencia no
dice nada. Ahora el riel mide siempre 38 px y se ve.

Ninguna de las dos las ve un build ni un `lint`. Es la cuarta o quinta vez que
esta pantalla concreta lo demuestra.

## Cómo se verificó

Chromium, componente aislado (la tarjeta está detrás de Firebase), a 390 px de
ancho y con el `mt5.json` **real de producción**, en cuatro cargas separadas:

| caso | resultado |
|---|---|
| español | 14 pares con su actividad y 14 barras; USD/JPY y GBP/JPY las más llenas |
| **árabe** | cabecera en árabe, y pares y números en `ltr` — comprobado con el CSS calculado |
| ningún par con `ticks` | la columna **no existe**: 4 columnas, 0 barras, y el pie de actividad tampoco sale |
| unos sí y otros no | la columna se queda y los que faltan salen con `—` |

Cero errores de consola en los cuatro, y **`scrollWidth == clientWidth` en los
cuatro**: la quinta columna no obliga a desplazar la pantalla de lado en un
teléfono, que era el riesgo de añadirla.

---

# La actividad, explicada para suscriptores (2026-09-09)

Néstor la pidió con estas palabras: **«quiero una explicación sencilla para que
guardes para los suscriptores de qué es eso, para qué se usa o para qué les
puede servir»**. Va con las otras cuatro del mismo tipo —el volumen,
TradingView, la correlación y el swap— y funciona por el mismo motivo: **es una
forma de exagerar que la app decide no usar, contada con el mecanismo delante.**

> **Qué es.** Cada vez que el precio de un par cambia, aunque sea un punto, eso
> es un «tick». La app te enseña **cuántas veces ha cambiado el precio hoy** en
> cada par, según el bróker del que salen esos datos.
>
> **Lo PRIMERO, para que no lo leas mal: no dice hacia dónde ni cuánto.** No
> te dice si va a subir o a bajar, ni si conviene comprar o vender, ni cuántos
> pips se movió. Solo cuenta **veces**. Un par puede cambiar 8.000 veces y
> acabar el día exactamente donde empezó.
>
> **Para qué te sirve entonces.** Para saber **dónde hay gente ahora mismo**.
> Si el USD/JPY lleva 8.000 cambios y el NZD/CHF lleva 1.900, el yen está
> siendo negociado con mucha más intensidad esta mañana. Eso te dice dos cosas
> prácticas, y ninguna es una dirección:
>
> · Donde hay mucha actividad, **entrar y salir cuesta menos y duele menos
>   equivocarse**: hay quien te compre y quien te venda, el spread suele ser
>   más estrecho y el precio no salta a trompicones.
> · Donde hay poca, **desconfía del gráfico**: un movimiento que se ve grande
>   puede ser cuatro operaciones cruzadas de madrugada. Es el mismo dibujo con
>   la mitad de gente detrás, y se deshace igual de rápido.
>
> Dicho de otro modo: la actividad no elige el par, **ayuda a decidir el
> MOMENTO** de operar el par que ya elegiste por otras razones.
>
> **Y ahora lo que NO es, que es la parte que casi nadie te cuenta.**
>
> Esto **no es volumen**. Volumen sería «cuánto dinero se movió», y en Forex ese
> número **no existe**: las acciones se negocian en una bolsa —la de Nueva York,
> la de Madrid— que apunta cada operación, pero el Forex es una red de bancos
> negociando entre sí. **No hay un sitio, así que no hay un total.** No lo
> tenemos nosotros y no lo tiene nadie.
>
> Cuando otra plataforma te enseña «volumen» de Forex, te está enseñando esto
> mismo: cuántas veces cambió el precio **en su propio bróker**. La prueba es
> fácil de ver: abre dos plataformas distintas a la misma hora y te darán
> números diferentes. Eso solo puede pasar si no es una medición del mercado.
>
> **No te digo que sea un dato malo** — no lo es, y hay operadores con
> experiencia que lo usan muy bien sabiendo lo que es. Lo que no vamos a hacer
> es llamarlo volumen, porque no lo es.
>
> **Un último detalle, para que no lo leas mal.** El número cuenta el día que
> va corriendo, así que a las nueve de la mañana es pequeño y a las cinco de la
> tarde es grande. Sirve para comparar **unos pares con otros en este momento**,
> no para comparar el de hoy con el de ayer.

📌 **Por qué esto vende, igual que las otras cuatro:** el suscriptor aprende
algo verdadero y comprobable —que el «volumen» de Forex que le enseñan por ahí
es el contador de un solo bróker— y de paso ve que la app dice hasta dónde llega
su propio dato. Es información, no promesas.

📌 **Y el detalle que lo hace creíble está en la pantalla, no en la frase:** el
rótulo va debajo de la tabla, en los 13 idiomas, donde lo lee cualquiera que
mire el número. No en un glosario aparte que nadie abre.

## 📌 Néstor leyó la columna y preguntó lo correcto (2026-09-09, el mismo día)

> **«¿a qué te refieres con el par que se está moviendo más? ¿más para pérdidas
> o más para ganancias? ¿el que más se mueve es el mejor para operarlo según su
> dirección?»**

**La pregunta señala un error MÍO de redacción en el chat, no de la app.** Yo
resumí la columna como «para ver de un vistazo qué par se está moviendo más», y
esa frase dice dos cosas falsas a la vez:

1. **«moviéndose más» suena a distancia**, y esto cuenta VECES, no pips. Un par
   puede cambiar 8.000 veces y cerrar donde abrió.
2. **«moviéndose» invita a preguntar hacia dónde**, y la actividad no tiene
   dirección ninguna. No dice comprar ni vender.

📌 Es exactamente la lección del 2026-09-04 —**una etiqueta equivocada es un
error de medición**— aplicada a una frase de chat en vez de a una tabla. El
número era correcto y el rótulo que le puse encima inducía la conclusión
contraria.

## Lo que se cambió por esa pregunta

El pie de la columna **ahora lo dice de frente y en primer lugar**, en los 13
idiomas de las dos apps:

> «NO dice hacia dónde ni cuánto: un par puede cambiar 8.000 veces y acabar
> donde empezó.»

⚠️ **Y va ANTES de la parte del volumen, no después.** El orden no es estético:
la confusión que más dinero cuesta es leer actividad como dirección, no
confundirla con volumen. Lo primero que se lee es lo que se recuerda — la misma
razón por la que en `medicion.js` el acierto va antes que «se pierden 3 centavos
por dólar», y no al revés.

📌 **Y la regla general que deja este día:** cuando Néstor pregunta «¿esto qué
me quiere decir?», la respuesta correcta casi nunca es explicárselo en el chat.
Es meter la explicación EN LA PANTALLA, porque el suscriptor que se lo pregunte
mañana no me tiene a mí al lado. Pasó igual con el calendario el 2026-09-08.

---

# La actividad, versión ampliada para suscriptores (2026-09-09)

Néstor pidió guardar también la explicación de POR QUÉ el aviso va primero, y
«si puedes agregar algo más claro, mejor». Esto sustituye a nada: se suma a «La
actividad, explicada para suscriptores» de más arriba, que sigue siendo el
texto base. Aquí van las tres piezas que lo hacen entendible de una lectura.

## 1. La comparación que lo explica sin tecnicismos

> Imagina que cuentas **cuánta gente entra y sale de una tienda** en una hora.
>
> Ese número te dice si la tienda está movida. **No te dice si la tienda gana
> dinero, ni si subieron los precios, ni si te conviene comprar allí.**
>
> La actividad de un par de divisas es exactamente eso: **el conteo de gente en
> la puerta.** Nada más, y nada menos.

📌 Funciona porque separa las dos preguntas que la gente junta sin darse cuenta:
*«¿está pasando algo?»* y *«¿qué está pasando?»*. La actividad contesta la
primera. La segunda no la contesta esta columna — ni ninguna otra sin arriesgar
una opinión.

## 2. El matiz honesto que casi nadie dice: mucha actividad no es «mejor»

Hay dos clases de actividad alta y **no significan lo mismo**:

| | qué es | qué le pasa al spread |
|---|---|---|
| **Sostenida** (Londres, Londres-Nueva York) | mucha gente negociando durante horas | se **estrecha**: es más fácil entrar y salir |
| **De golpe** (sale una noticia) | todos reaccionando en el mismo minuto | se **abre**, y el precio puede saltarse tu stop |

> Así que «este par tiene mucha actividad» **no quiere decir «este par es el
> bueno»**. Quiere decir «aquí hay gente». Si esa gente apareció toda de golpe
> porque acaba de salir un dato, el mejor momento para entrar es justo el que no
> es. **Para eso está la tarjeta del calendario, unos centímetros más arriba:
> mira si hay una noticia a esa hora antes de fiarte del número.**

⚠️ Esto es lo que hace creíble el resto del argumento, y por eso se guarda: la
tentación de vender la actividad como «entra donde hay movimiento» es enorme y
sería medio verdad. Media verdad en un producto de trading es una mentira con
buenos modales.

## 3. La frase de una línea, que es la que hay que recordar

> **La actividad no elige el par. Ayuda a elegir el MOMENTO del par que ya
> elegiste por otras razones.**

## Por qué el aviso va PRIMERO, y no al final (esto también va a la landing)

> Nos habrás visto poner la advertencia antes que la explicación. Es a
> propósito.
>
> De todas las formas de leer mal este número, **la que cuesta dinero es
> confundir actividad con dirección**: creer que «el que más se mueve» es el que
> hay que comprar. Confundirla con volumen no le hace perder plata a nadie —
> solo es inexacto.
>
> Lo primero que se lee es lo que se recuerda, así que lo primero que decimos es
> lo que más caro sale ignorar. Es la misma razón por la que en la pantalla de
> mediciones ponemos «55 % de acierto» **y justo debajo** «y aun así se pierden
> 3 centavos por cada dólar arriesgado», y no al revés: puesto al revés, el
> porcentaje se lee como la conclusión.

📌 **Este último bloque es de los que más valen para vender**, porque no habla
del mercado: habla de **cómo está construida la app**. Un suscriptor no puede
comprobar si nuestro RSI está bien calculado, pero sí puede comprobar que le
avisamos antes de impresionarle. Es del mismo tipo que las tres decisiones de la
correlación y la del swap.

---

# Las tasas ya se ven en la app (2026-09-09). La #3 de la fase de información

Néstor preguntó **«¿lo de las tasas de interés dónde quedó para poderlas
ver?»** y la respuesta honesta era: **en ninguna parte**. La sonda solo sirvió
para saber de dónde sacarlas; el dato vivía únicamente dentro del log de un
workflow. Esto lo pone en pantalla.

```
app/src/lib/tasas.js              # cuentas puras (Node + navegador)   GEMELO
app/scripts/publicar-tasas.mjs    # baja del BIS y escribe el archivo  GEMELO
app/src/components/Tasas.jsx      # la tarjeta                          GEMELO
app/scripts/prueba-tasas.mjs      # 70 comprobaciones, sin internet     GEMELO
app/src/lib/useTasas.js           # lo lee desde la app                 PRIMO
.github/workflows/tasas.yml       # una vez al día, 06:20 UTC
```

**En las DOS apps.** Son 50 gemelos ahora (eran 46).

## Dónde está, y por qué ahí

**Pestaña Barrido, justo DEBAJO de «Lo que cuesta abrir la operación».** No es
casual: son las dos mitades del peaje. Aquella enseña el spread, que se paga
UNA VEZ al entrar; ésta, de dónde sale lo que se paga (o se cobra) CADA NOCHE
que la operación siga abierta. Separarlas obligaría a buscar en dos pantallas
lo que es la misma pregunta.

⚠️ **En Intradía NO sobra por llamarse Intradía**, y está medido: el **52 % de
las operaciones reales de esa app cruzaron al menos una noche** (Fase 2,
2026-09-02). La intención era no pagar swap; lo que pasa de verdad es otra cosa.

## Las decisiones que no hay que ablandar

⚠️⚠️ **EL AVISO DE QUE ESTO NO ES EL SWAP VA PRIMERO, ANTES DE NINGÚN NÚMERO.**
El banco central pone la referencia; el bróker le suma un margen que no publica
nadie y que además es asimétrico. La pantalla nunca dice «vas a cobrar X»: dice
hacia qué lado **suele** jugar. Es el mismo criterio que con la actividad —
lo primero que se lee es lo que se recuerda, así que lo primero que se dice
tiene que ser lo que más caro sale ignorar.

⚠️ **`UMBRAL_NEUTRO = 0.25` y el número no es estético.** El margen del bróker
está típicamente entre 0,5 y 1,5 puntos anuales, así que una diferencia de dos
décimas se la come entera y el signo deja de significar nada. Por debajo de
0,25 la pantalla dice «apenas pesa» en vez de recomendar un lado.

⚠️ **Nada se pinta de verde ni de rojo.** Que la diferencia favorezca a la
compra no es «bueno»: depende de hacia dónde vaya a operar quien mira. Misma
decisión que en `Correlacion.jsx`.

⚠️ **Cada fila enseña LA FECHA DE SU DATO, no la de la consulta.** Una tasa de
referencia solo cambia el día que se reúne el banco central, así que ver una
fecha de hace semanas es NORMAL. Sin enseñarla, ese dato se leería como de hoy.

⚠️ **Si falta alguna de las ocho, el publicador NO publica y falla.** Es más
estricto que el calendario a propósito: aquí una ausencia borra filas enteras
de la pantalla (sin JPY desaparecen los tres pares con yen) y parecería que la
app se olvidó de ellos. El archivo anterior sigue siendo válido — estas tasas
cambian una vez cada varias semanas.

⚠️ **Una tasa que falta devuelve `null`, nunca 0.** Un 0 diría «las dos pagan
lo mismo», que es una afirmación. Misma decisión que `pearson` en
`correlacion.js`.

## 📌 Los dos errores que las pruebas cazaron

**1. El CSV NO se puede partir por comas.** Dos de las quince columnas
(`COMPILATION` y `TITLE`) llevan comas DENTRO, entre comillas — una fila real
dice `"From 1 Jun 1994 onwards: Central bank target, overnight rate; …"`.
Partir a pelo corre las columnas de sitio y `OBS_VALUE` sale texto: **no falla,
devuelve basura**. Comprobado que la prueba MUERDE: al sustituir el partidor
por `split(',')` fallan **11 comprobaciones**, y se miró el archivo con el daño
puesto antes de darlo por bueno.

**2. Una comprobación mía no comprobaba el código, sino los datos de mentira.**
Escribí «entre los cinco primeros de la lista hay alguno negativo» para probar
que se ordena por valor ABSOLUTO — y falló, porque con esas ocho tasas los
cinco mayores resultaron ser todos positivos. Reescrita con un caso hecho a
propósito (−9 contra +1) que sí exige lo que dice exigir. Es «la prueba tiene
que medir lo que dice medir», otra vez.

## Cómo se verificó

Las 70 comprobaciones sin internet, lint, build y **todas** las pruebas de los
dos repos. Y en **Chromium**, componente aislado, 390 px, cuatro cargas:

| caso | resultado |
|---|---|
| español | 14 pares ordenados por diferencia absoluta + las 8 tasas con su fecha |
| **árabe** | todo traducido, y los 52 elementos `ltr` comprobados con el CSS calculado |
| archivo con `tasas: {}` | **no pinta absolutamente nada** |
| archivo que no existe (404) | ídem |

`scrollWidth == clientWidth` en los cuatro. Cero errores de la app (el único
error de consola es el 404 que el propio banco de pruebas provoca a propósito).

⚠️ **Los números del navegador eran de mentira menos tres.** De la sonda real
solo se leen enteros `US 3,625`, `CH 0` y, vía BCE, el euro en `2,4`; los otros
cinco se inventaron plausibles para probar cómo se PINTA. Los reales llegarán
con la primera corrida del workflow.

## Lo que queda por comprobar con datos reales

📌 **Contrastar `XM` del BIS con el BCE.** La sonda dejó el valor del BIS
cortado en el log y el BCE dijo 2,4 — **no está comprobado que coincidan**. Es
justo para lo que el BCE estaba en la sonda. Mirar el log de la primera
corrida.

## ✅ Corrió con datos REALES, y el contraste con el BCE tenía respuesta

Primera corrida el 2026-09-09 a las 07:29 UTC, en las dos apps. **320 bytes**,
las ocho divisas, y **los dos archivos publicados salieron idénticos**
(comprobado bajándolos los dos y comparándolos, no supuesto).

| divisa | tasa | fecha del dato |
|---|---:|---|
| AUD | 4,350 % | 2026-08-27 |
| GBP | 3,750 % | 2026-08-28 |
| USD | 3,625 % | 2026-09-01 |
| NZD | 2,500 % | 2026-08-28 |
| CAD | 2,250 % | 2026-08-31 |
| EUR | 2,250 % | 2026-09-01 |
| JPY | 1,000 % | 2026-09-01 |
| CHF | 0,000 % | 2026-09-01 |

Las tres diferencias más grandes: **USD/CHF +3,63 · GBP/JPY +2,75 ·
USD/JPY +2,63**, todas a favor de comprar. Y el dato más viejo tenía 13 días,
que es exactamente lo normal aquí.

### 📌 El BIS dice 2,25 para el euro y el BCE dijo 2,4. NO se contradicen

Quedaba anotado como pendiente y la respuesta estaba **en el propio CSV del
BIS**, en su columna `COMPILATION`, que la sonda había traído sin que nadie la
leyera:

> «From 18 Sep 2024 onwards: official central bank steering rate is the
> **deposit facility rate**, fixed rate; from 15 Oct 2008 to 17 Sep 2024:
> …**main refinancing operations**, fixed rate»

O sea que **son dos tasas distintas del mismo banco**: la sonda pidió al BCE la
de operaciones principales de financiación (2,4) y el BIS publica, desde
septiembre de 2024, la de facilidad de depósito (2,25). Los 0,15 de diferencia
no son un fallo: es que miden cosas distintas.

⚠️ **Y la que usa el BIS es la que sirve aquí**, según el texto del propio BIS:
desde 2024 la facilidad de depósito **es** la tasa de referencia efectiva del
BCE, que es la que sigue el dinero a un día — que es de lo que sale el swap.
No hay nada que corregir.

📌 **La lección práctica:** el dato para resolver la duda llevaba desde el
primer día dentro de la respuesta de la sonda, en una columna que el lector
descarta a propósito. **Antes de dar una diferencia por sospechosa, releer la
respuesta cruda entera** — la sonda no está solo para elegir la dirección.

---

# El COT ya se ve en la app (2026-09-14). La #4 de la fase de información

```
app/scripts/sonda-cot.mjs      la sonda (4 corridas; el detalle en app/CLAUDE.md)
app/src/lib/cot.js             las cuentas puras (Node + navegador)
app/scripts/publicar-cot.mjs   baja de la CFTC y escribe estado/cot.json
app/src/lib/useCot.js          lo lee desde la app
app/src/components/Cot.jsx     la tarjeta, en la pestaña Barrido
app/scripts/prueba-cot.mjs     98 comprobaciones, sin internet
.github/workflows/cot.yml      una vez al día, 07:20 UTC
```

**Fuente: `TFF_All` (`udgc-27he`) de la CFTC**, elegido CON LA SONDA. Sin llave,
sin secretos y **sin gastar un crédito de Twelve Data**.

⚠️ **SOLO EN SWING.** El COT es semanal y llega con entre 3 y 10 días de
retraso. Para operaciones de horas a días todavía dice algo; para una que abre
y cierra el mismo día, no. Si se quiere en Intradía, que sea con un motivo
escrito y no por simetría.

## ⚠️ La trampa que más cerca estuvo de colarse

**`TFF_All` son DOS informes en la misma tabla** (`FutOnly` y `Combined`), y
pedir sin fijar `futonly_or_combined` devuelve uno de los dos **según le
apetezca al servidor**. No falla: devuelve un número plausible del informe que
no era. En EURO FX el mismo día, 942.464 contra 1.056.521 de interés abierto y
94.808 contra 81.335 de fondos largos — **un 14 %**.

Es la misma familia de fallo que el ATR de cierre a cierre del 2026-08-09: un
dato correcto **de una cosa distinta de la que uno cree estar midiendo**.

📌 Comprobado en producción, no solo en las pruebas: los ocho números
publicados cuadran con las filas `FutOnly` y no con las `Combined`.

## ⚠️ Tres de los ocho nombres de contrato estaban MUERTOS

`NEW ZEALAND DOLLAR` → **`NZ DOLLAR`** · `U.S. DOLLAR INDEX` → **`USD INDEX`** ·
`BRITISH POUND STERLING` → **`BRITISH POUND`**.

**Un contrato muerto no da error**: sigue en la tabla y devuelve su último dato,
de hace años, sin decir que es viejo. Por eso la pregunta que decide no es «¿está
en la lista de contratos?» sino **«¿tiene fila en el ÚLTIMO informe?»**.

📌 **Y el motivo del error es el de siempre con otra cara:** los leí de una lista
que **un filtro mío había recortado**. `PARECE_DIVISA` pedía «DOLLAR INDEX» y el
contrato vivo se llama «USD INDEX», así que el filtro **escondía justo lo que se
buscaba**. `CONTRATOS_MUERTOS` los guarda y hay una comprobación que falla si
alguno vuelve a colarse.

## Las decisiones de pantalla que no hay que ablandar

⚠️ **EL AVISO VA PRIMERO, ANTES DE NINGÚN NÚMERO.** Igual que en `Tasas.jsx` y
en la actividad. Aquí lo caro es leerlo como «compra lo que compran los grandes».

⚠️ **NADA SE PINTA DE VERDE NI DE ROJO, y el signo va en la POSICIÓN.** La barra
sale del centro a la derecha si están comprados y a la izquierda si están
vendidos. La posición dice hacia qué lado sin decir «esto es bueno» — que es
justo lo que hace falta, porque media industria lee un extremo como continuación
y la otra media como vuelta.

⚠️ **ESCALA FIJA (25 %), no «el mayor de hoy».** Al revés que en la columna de
actividad, y a propósito: con escala relativa, una semana en la que nadie
estuviera posicionado seguiría enseñando una barra llena. La escala fija deja
las semanas tranquilas con barras cortas.

⚠️ **NADA DEVUELVE UN VEREDICTO.** No hay `lado`, ni `compra`, ni `venta`. El
COT es un **FILTRO**, no información: cambiaría las señales y no ha pasado por
el banco de pruebas. Hay una comprobación dedicada solo a eso, para que añadir
un veredicto obligue a venir a borrarla — o sea, a propósito y no de pasada.

⚠️ **Si falta una de las ocho no se publica nada y el workflow falla.** El fallo
que esto caza ya ocurrió: la CFTC renombra contratos.

⚠️ **A DIARIO aunque el dato sea semanal.** El reloj de GitHub se salta horas
(el vigía perdió el viernes 5 de septiembre entero); con una corrida semanal un
salto costaría una semana.

## Lo que solo se vio MIRANDO la captura

Las 98 comprobaciones y las 13 del navegador pasaban, y aun así:

📌 **«+13,302» estaba mal en español.** Usaba `toLocaleString('en-US')` al lado
de un «−16.6 %»: en español esa coma es el decimal, así que el número grande se
leía como pequeño. Ahora va entero pelado, **la misma decisión que en la columna
de actividad y por las mismas dos razones** (la otra: en árabe saldrían cifras
árabo-índicas junto a porcentajes en latinas).

📌 **La marca del cero no se veía.** Era de 1 px dentro del riel y en un tono
casi idéntico: no había forma de saber desde dónde salía la barra, y una barra
sin referencia no dice nada. Ahora **sobresale** del riel y se lee como un eje.
Es la misma lección que la barrita de actividad.

📌 **Y en árabe se mezclaban dos sistemas de dígitos en la MISMA frase:**
`٨ سبتمبر ٢٠٢٦ (قبل 6 يوماً)`. La regla que sale de aquí, y que ya estaba
implícita en el resto de la app: **dentro de una frase traducida los números
siguen al idioma; en las columnas de datos van en cifras latinas, `mono` y
`ltr` fijo, como los precios.**

## Cómo se verificó

19 pruebas sin internet (gemelos incluido: los 50 siguen idénticos), lint, build,
y **Chromium a 390 px** con el `cot.json` real de producción en cuatro cargas
separadas: español, árabe, archivo vacío y 404. Cero errores de consola, cero
desplazamiento lateral, y `dir` comprobado con el CSS calculado en los 24
elementos de datos **y en las 8 barras** — una barra que heredara `rtl` diría lo
contrario de lo que pasa.

**Comprobado que las pruebas muerden**, con el daño verificado en su sitio antes
de darlas por buenas: cambiar el informe a `Combined` tumba 2 · devolver el NZD a
su nombre muerto tumba 9 · quitar la línea que distingue el vacío del cero tumba 5.

📌 **Y dos fallos del banco de pruebas antes que de la app:** guardaba el idioma
como JSON (`"es"` en vez de `es`), así que todo salía en inglés; y pedía un CSS
por una ruta que no existía. **Antes de creerse que la app está rota, comprobar
que el banco de pruebas mide lo que dice medir.**

---

# El COT NO sirve para filtrar las señales (2026-09-14). Séptima familia que falla

Néstor lo pidió expresamente, y con la condición correcta: **«hazlo como una
medición interna como prueba […] sin que por ahora me haga cambios en la app y
si no sirve lo dejamos tal cual como está ahora como información»**.

```
app/scripts/lib/preregistro-cot.mjs    el listón, escrito ANTES
app/scripts/lib/cot-historia.mjs       historial con disciplina de fecha
app/scripts/medir-cot.mjs              la medición
app/scripts/prueba-cot-historia.mjs    38 comprobaciones, sin internet
.github/workflows/medir-cot.yml        solo a mano, 14 créditos
```

**Cero archivos de `src/` tocados.** Nada se encendió.

## El resultado, con la vara neutra 1:1 y costes

2.240 señales con COT publicado (62 descartadas por no haberlo todavía),
mitades partidas en 2024-06-04.

| filtro | ops | acierto | por 1R | 1ª mitad | 2ª mitad |
|---|---:|---:|---:|---:|---:|
| **SIN FILTRO (la app tal cual)** | 2.228 | 49 % | **−0,044** | −0,046 | −0,041 |
| seguir a los fondos, \|sesgo\| ≥ 0 | 1.154 | 49 % | −0,032 | **+0,002** | −0,065 |
| seguir, ≥ 2 | 1.015 | 49 % | −0,043 | −0,014 | −0,069 |
| seguir, ≥ 5 | 870 | 48 % | −0,064 | −0,041 | −0,083 |
| seguir, ≥ 10 | 653 | 49 % | −0,044 | −0,038 | −0,048 |
| seguir, ≥ 15 | 476 | 48 % | −0,059 | +0,010 | −0,096 |
| ir EN CONTRA, ≥ 0 | 1.074 | 48 % | −0,057 | −0,097 | −0,015 |
| en contra, ≥ 2 | 972 | 48 % | −0,056 | −0,093 | −0,021 |
| en contra, ≥ 5 | 823 | 47 % | −0,072 | −0,112 | −0,033 |
| en contra, ≥ 10 | 593 | 47 % | −0,079 | −0,133 | −0,035 |
| en contra, ≥ 15 | 409 | 46 % | −0,096 | −0,224 | −0,014 |

**Las once filas pierden.** Ninguna llega a cero. La mejor pierde menos
(−0,032 contra −0,044), y eso es todo lo que hay.

## Por qué suspende: los dos criterios que fallan

❌ **No mejora en las dos mitades.** La mejor da +0,002 en la primera y
**−0,065 en la segunda**, cuando sin filtro la segunda daba −0,041. O sea que
en la segunda mitad el filtro es PEOR que no tener filtro.

❌ **La dirección cambia de una mitad a otra.** En la primera gana «seguir a
los fondos»; en la segunda gana «ir en contra». **Es la firma exacta de una
moneda al aire**, y es el criterio que se escribió a propósito para este caso,
porque probar las dos lecturas y quedarse con la ganadora sería elegir a
posteriori.

Mírese en la tabla: «en contra ≥15» va **−0,224 en la primera mitad y −0,014 en
la segunda**. Un salto de dos décimas entre mitades no es una regla.

## ⚠️⚠️ EL NÚMERO QUE PARECÍA UN HALLAZGO, Y POR QUÉ NO CUENTA

Con **la geometría real de la app** (que va como comprobación, no como decisión)
dos filas salen POSITIVAS:

| filtro (geometría real) | ops | acierto | por 1R | 1ª mitad | 2ª mitad |
|---|---:|---:|---:|---:|---:|
| sin filtro | 2.218 | 56 % | −0,037 | −0,045 | −0,029 |
| **seguir, ≥ 10** | 648 | 60 % | **+0,019** | **+0,034** | **+0,008** |
| **seguir, ≥ 15** | 473 | 60 % | **+0,029** | +0,112 | −0,016 |

«Seguir ≥ 10» es positivo en el total **y en las dos mitades**. Parece el
hallazgo del año.

**No lo es, y esto es lo importante de toda la medición:** ese MISMO filtro, con
las MISMAS operaciones y los MISMOS días, mide **−0,044 con la vara neutra, y
negativo en las dos mitades** (−0,038 y −0,048).

El mismo filtro es positivo en las dos mitades con una vara y negativo en las
dos con la otra. Eso no puede venir de que el COT sepa hacia dónde va el precio
— si lo supiera, acertaría con cualquier vara. **Viene de la geometría**: con
objetivos variables, un filtro puede seleccionar operaciones con buena
proporción objetivo/riesgo sin acertar ni una dirección de más.

📌 **Para eso existe la vara neutra**, y por eso el listón decía desde antes que
se decide con ella. Si se hubiera decidido con la geometría real se habría
encendido un filtro que no sabe nada.

## 📌 Un regalo de la medición: la fecha del cambio de nombre

Al listar el historial salió esto:

```
AUD, CAD, CHF, EUR, JPY  → 401 informes, desde 2019-01-08
GBP, NZD, USD            → 240 informes, desde 2022-02-08
```

**Son exactamente las tres divisas que tenían el nombre muerto** (`BRITISH POUND
STERLING`, `NEW ZEALAND DOLLAR`, `U.S. DOLLAR INDEX`). Lo que dice el dato es
que la CFTC las renombró **alrededor del 8 de febrero de 2022** y antes de esa
fecha solo existen bajo el nombre viejo.

⚠️ Es una **inferencia de los datos**, no un anuncio de la CFTC que se haya
leído. Pero encaja perfecta y explica por qué esas tres empiezan 3 años después.

Consecuencia práctica: para pares con GBP o NZD antes de 2022-02-08 no hay COT,
y esas señales quedaron fuera de la medición (las 62 descartadas).

## Lo que confirma el retraso, ya no como teoría

**Mediana 8 días, máximo 11.** Ése es el dato con el que se habría filtrado cada
señal. El informe del martes no se puede usar hasta el lunes siguiente, y la
disciplina está en `DIAS_HASTA_PUBLICAR = 4` con cinco comprobaciones dedicadas.

⚠️ **Sin esa disciplina el backtest habría mirado tres días de futuro TODAS las
semanas durante cinco años**, y no habría fallado: habría devuelto un resultado
creíble y demasiado bueno.

## 📌 Un error mío, encontrado leyendo la primera corrida

La columna «señales al mes» salía inflada un 45 %: dividía días de MERCADO entre
30,44, que son los días de un mes de CALENDARIO. La app aparecía a 50,0 señales
al mes cuando en este archivo está medida en 36,1 — y esa discrepancia es lo que
lo destapó.

No cambió el veredicto (el criterio era «al menos 10 al mes» y se cumplía con
las dos cuentas), pero se arregló y se volvió a correr. Es **hermano de los
otros dos errores de estos días**: la etiqueta «(hoy)» que envejeció sola y el
«+13,302» con coma inglesa. **En los tres el número estaba bien calculado y
describía algo distinto de lo que decía describir.**

## La limitación que va dicha en el propio informe

Aquí el filtro **solo QUITA** señales. En la app de verdad el hueco lo rellenaría
la siguiente de la lista (se queda con los 5 mejores por lado), y está medido
desde el 2026-08-25 que un filtro así **no quita señales: las cambia por otras**.

Se midió la versión que solo quita por dos razones: es la única que no obliga a
tocar `marketCalc.js` —lo que Néstor pidió que no se hiciera— y contesta primero
la pregunta de fondo, que es si el COT sabe algo sobre cuáles de estas señales
son malas. **Como la respuesta es que no, la versión con relleno sobra**: no se
puede rellenar con información que no existe.

## El veredicto y lo que cambia

**NO PASA el listón.** El COT se queda **exactamente como está**: información en
pantalla, con su fecha y sus advertencias. Nada se encendió y nada se apagó.

⚠️ **Séptima familia de filtros que se mide y falla** (RSI, ADX, confluencia de
marcos, barrido de liquidez, y ahora el COT). El patrón lleva meses siendo el
mismo y conviene tenerlo escrito: **en esta app, los filtros no funcionan.** Lo
único que ha medido positivo son reglas de ENTRADA distintas —la reversión y
«comprar la caída»—, no filtros sobre la entrada que ya existe.

---

# El retraso de GitHub, cerrado por el lado que sí se podía cerrar (2026-09-14)

Néstor: **«creo que esto ya lo hemos hablado y si no recuerdo mal te pedí que lo
resolviéramos… creo que esos retrasos nos perjudican las app»**.

Lo comprobé antes de contestar, y tenía razón a medias — pero la mitad que
faltaba es la importante.

## Son DOS problemas distintos que se llaman igual

| | qué es | ¿resuelto? |
|---|---|---|
| **A. El reloj se salta corridas** | el cron no dispara; el vigía de Swing perdió el viernes 5 de septiembre ENTERO | ✅ **sí**, el 2026-09-07 (tres crones + `yaCorrioHoy`) |
| **B. La API tarda en enseñar el resultado** | el trabajo termina en 65 s y el log sigue dando 404 | ❌ **no se había tocado** |

**A sí perjudicaba a la app** —un día de historial que no vuelve— y está
arreglado. **B nunca la ha perjudicado**: la app no lee logs de Actions, lee
`barrido.json` de la rama `datos`. Lo único que B estropeaba era que yo pudiera
mandarle el reporte al chat a su hora.

📌 Decírselo así importa: si le hubiera dado la razón entera, se habría quedado
creyendo que su app lleva meses sirviendo datos tarde, y no es verdad.

## El arreglo de B: el reporte se PUBLICA, no se lee del log

El mismo patrón que todo lo demás del proyecto. `reporte-diario.mjs` sigue
imprimiendo entre marcadores **y además** escribe `estado/reporte.json` en la
rama `datos` cuando se le pasa `VIGIA_DATOS`. Se lee por
`raw.githubusercontent.com`, que **no pasa por la API de Actions**.

En las DOS apps (`reporte-diario.mjs` es PRIMO: cada una arma su texto).

⚠️ **`generadoEl` va DENTRO del archivo, y es la pieza que evita el desastre.**
Un archivo que se sobrescribe cada día se lee igual de bien estando viejo, así
que sin esa marca leer el de ayer y presentarlo como el de hoy sería
indistinguible de que todo fue bien — **y eso ya pasó una vez**. Quien lo lea
comprueba que `generadoEl` empieza por la fecha de hoy en UTC.

⚠️ **El log NO se quita.** Si un día falla el guardado en la rama `datos`, el
reporte sigue existiendo en algún sitio. Dos caminos a propósito.

⚠️ **Y el `git diff --cached --quiet` aquí FALLA en vez de saltarse el commit**,
al revés que en `cot.yml`. Allí lo normal es que el dato no cambie (es semanal);
aquí `generadoEl` cambia siempre, así que «no cambió nada» solo puede significar
que el guion no escribió.

## De paso, dos cosas que llevaban tiempo mal

- **Los workflows del reporte no tenían `timeout-minutes`** — el agujero que ya
  estaba anotado el 2026-09-03 para los de Swing y nunca se cerró. Ahora 10.
- **El cron de Swing decía «después de que el BCE publica el cierre del día»**,
  falso desde el 2026-08-09. Y la cabecera del guion decía que el entorno tiene
  bloqueado `api.frankfurter.dev`, que tampoco es la fuente. Es otra vez
  **«al cambiar algo, mirar también quién lo NOMBRA»**.

## ✅ Comprobado con las dos apps, y con el número al lado

Se lanzaron los dos workflows desde la rama y se leyó el archivo por
`raw.githubusercontent.com`:

| | `generadoEl` | leído sin problema a las |
|---|---|---|
| Intradía | 16:19:01 UTC | 16:21 |
| Swing | 16:20:43 UTC | **16:22:29 — 1 min 46 s después** |

Contra los **40 minutos** que tardó el log esa misma mañana.

---

# Sentimiento minorista: la sonda, primero (2026-09-14)

La **#5 y última de la fase de información**. Mismo camino que el calendario,
las tasas y el COT: **sonda primero, lector después.**

```
app/scripts/lib/robots.mjs          ¿nos deja el robots.txt? (puro)
app/scripts/sonda-sentimiento.mjs   pide, cuenta y enseña. No interpreta
app/scripts/prueba-sentimiento.mjs  27 comprobaciones, sin internet
.github/workflows/sonda-sentimiento.yml   solo a mano, sin secretos
```

## ⚠️ Esta sonda tiene una segunda mitad que las otras NO tenían: el permiso

El calendario, las tasas y el COT venían de organismos públicos (BIS, CFTC) o
de un feed hecho para que lo lea cualquiera. **Aquí no.** El sentimiento
minorista es de EMPRESAS: es su dato, de sus clientes, y lo publican como
reclamo comercial, no como bien público.

Por eso cada candidata se sondea **dos veces**: si responde y con qué forma, y
si su `robots.txt` deja pedirlo.

⚠️ **`robots.txt` NO es lo mismo que las condiciones de uso.** Uno permisivo no
autoriza nada; uno que lo prohíbe sí es un «no» explícito. Sirve para
**DESCARTAR, nunca para aprobar**. Lo que aprueba es leerse las condiciones, y
eso lo hace una persona.

## Lo escrito ANTES de ver ningún número, a propósito

1. **Es el libro de UN bróker, no del mercado.** Mismo problema que el tick
   volume («Lo que NO se puede tener en Forex»), con un agravante que aquél no
   tiene: **la clientela de cada casa es distinta**, así que dos brókers pueden
   discrepar aunque los dos midieran bien.
2. **«Los minoristas pierden, hagamos lo contrario» NO está medido aquí.** Es
   la frase más repetida del negocio y suena convincente — que es justo la
   señal de alarma, con cinco ocasiones ya documentadas en este archivo en las
   que un mecanismo convincente resultó falso al medirlo.
3. **Entra como INFORMACIÓN o no entra.** Como filtro, al banco de pruebas con
   su listón escrito antes, igual que el COT.
4. **Sin FECHA no sirve.** Un porcentaje sin decir de cuándo es se lee siempre
   como de ahora mismo.

## Por qué el lector de robots.txt vive aparte y tiene pruebas

Bajar el archivo es lo fácil; **interpretarlo mal no se ve**: devuelve un
veredicto perfectamente creíble, y ese veredicto decide si se le pide el dato a
alguien que había dicho que no.

Los cinco casos que un analizador ingenuo falla, todos con prueba propia:

- **`Disallow:` VACÍO significa «no prohíbo nada».** Como cadena vacía es el
  prefijo de TODO, así que un analizador ingenuo prohíbe el sitio entero — lo
  contrario de lo que dice.
- **Gana el prefijo MÁS LARGO, no el primero que coincida**, o un
  `Allow: /api/publico/` dentro de un `Disallow: /api/` se leería al revés.
- **Solo cuentan las reglas de `User-agent: *`**, y **varios `User-agent`
  seguidos comparten bloque** — apagar el bloque al ver un agente ajeno se
  saltaría el `Disallow` entero.
- **La ruta incluye lo de después del `?`**: una candidata lleva el dato en
  `index.php?path=sentiment_index`, o sea justo ahí.
- **Ante cualquier duda dice «no se sabe», nunca «permitido».** Misma asimetría
  que `yaCorrioHoy` y `esSombra`, y por la misma razón.

**Comprobado que las pruebas MUERDEN**, con el daño verificado en su sitio
antes de darlas por buenas: cambiar «prefijo más largo» por «el primero»
tumba 1, y quitar el guardia del `Disallow` vacío tumba otra.

## Lo siguiente

Lanzar la sonda (**Actions → «Sonda del sentimiento minorista» → Run
workflow**), leer el log, y **con la forma real delante** decidir si hay
candidata y escribir el lector. Nunca al revés.

⚠️ Varias direcciones de la sonda son **conjeturas** sobre cómo se llaman esos
endpoints. Una que dé 404 solo dice que esa dirección no es, no que la fuente
no sirva.

## ✅ La sonda corrió. Primera ronda: cinco de seis caen

| fuente | robots.txt | qué pasó |
|---|---|---|
| Myfxbook (API) | no se sabe (403) | **200 con `{"error":true,"message":"Required fields missing."}`** → pide sesión |
| Myfxbook (página) | no se sabe (403) | **403** a un User-Agent honesto |
| Dukascopy | no se sabe (404) | **403**, cuerpo vacío |
| DailyFX / IG | Allow: / | 200, pero sirve el **explicativo de IG UK**: cero pares |
| OANDA | no lo prohíbe | 200 de marketing: cero «sentiment», cero «short» |
| **FX Blue** | **Allow: /** | **200 sin credencial** ← la única que pasó |

📌 **Myfxbook contestó 200 con un error dentro.** Es exactamente la trampa que
la sonda venía a cazar y que ya había mordido con `TFF_All`: un 200 no quiere
decir que haya datos.

📌 **Y que Myfxbook y Dukascopy den 403 a un User-Agent honesto TAMBIÉN es una
respuesta**: no están publicando un dato, están sirviendo una página a
personas. Disfrazarse de navegador habría entrado, y es justo lo que no se
hace aquí.

## ⚠️⚠️ Segunda ronda: FX Blue tampoco sirve, y de paso me desmiente a mí

Escribí en el commit de la primera ronda que en FX Blue «los números
aparentemente están dentro del HTML», por el recuento `net-short ×13`,
44 porcentajes y `EUR/USD ×14`. **Era falso, y lo desmintió la propia mejora
que le hice a la sonda esa misma tarde.**

Al enseñar el HTML **alrededor** de la palabra en vez de contarla:

```
"net-short" en su sitio: …<meta name="description" content="Trader sentiment
showing the number of real-money accounts on FX Blue which are currently
net-long or net-short. …"
```

Está en **el texto de propaganda de la página**, no en un dato. Y el resto
encaja: es una aplicación Next.js (`/_next/static/chunks/…`), «Updated» no
aparece, el único `UTC` está dentro de la configuración de la interfaz junto a
`"now":"$undefined"` —o sea, **los valores no vienen del servidor**—, y
**`rutas que parecen de datos dentro del HTML: 0`**. Las dos conjeturas de
archivo (`.csv`, `.json`) dieron 404, y `/terms` también.

**Los números los pide el navegador después de cargar.** No hay archivo.

📌 **Es la sexta vez en este archivo que presento un mecanismo convincente
antes de comprobarlo**, y esta vez con un agravante y un atenuante. El
agravante: se lo llegué a decir a Néstor por el chat. El atenuante: la
comprobación que lo destapó la había escrito yo mismo **para esto**, con el
motivo dentro («contar cuántas veces aparece "net-short" no distingue "el
número está aquí" de "aquí solo se nombra"»). La lección no es nueva —
**contar apariciones no es leer** — pero esta vez la herramienta ya estaba
puesta y funcionó.

## El veredicto de la #5

**Ninguna de las seis pasa el listón**, que estaba escrito antes: responder sin
credencial · permitido · con fecha · con varios pares.

Lo que quedaría sería una de estas tres, y ninguna es buena:

| salida | por qué NO |
|---|---|
| llamar a la API interna de la app de FX Blue | no es un feed publicado; es raspar con otro nombre, y se rompe **devolviendo números mal leídos**, no con un error |
| abrir cuenta en Myfxbook y guardar la sesión | un secreto más que mantener, y su página ya nos cerró la puerta |
| disfrazar la sonda de navegador | pasar por encima de un «no» explícito |

**Recomendación: la #5 NO entra.** Y conviene ver que no es una derrota
técnica: es el listón haciendo su trabajo. De las cinco de la fase de
información, **cuatro entraron** (calendario, correlación, tasas, COT) y esta
se queda fuera porque nadie publica el dato de forma que se pueda usar sin
pedir permiso o sin raspar.

⚠️ Y aunque se consiguiera, seguía en pie lo escrito antes de mirar: es el
libro de UN bróker —de una clientela particular, además— y «los minoristas
pierden, hagamos lo contrario» no está medido aquí. O sea que el premio por
saltarse el listón sería pequeño.

📌 La sonda y su prueba **se quedan en el repositorio**. Si algún día alguna de
las cinco publica un feed de verdad, se lanza otra vez y se ve en un minuto.

---

# ¿Y el sentimiento de AvaTrade, el bróker de Néstor? (2026-09-14)

Néstor: **«¿y con los sentimientos del bróker con el que yo opero no se puede?
¿AvaTrade tiene eso? ¿lo podemos sacar de ahí?»**. La pregunta tiene dos
mitades y se contestan por caminos distintos.

## Mitad 1: por MT5 NO se puede, y está comprobado en el código

El puente le pide a MT5 exactamente dos cosas: `symbol_info_tick` (bid/ask) y
`copy_rates_from_pos` (velas). Y no es que no se le haya pedido más: **la API
de MT5 no expone las posiciones de los DEMÁS clientes.** De posiciones solo da
las de la cuenta abierta en ese terminal — una persona. **Una persona no es
sentimiento.**

📌 Para que MT5 diera «el 70 % está comprado», AvaTrade tendría que agregar a
todos sus clientes y publicarlo, y eso no pasa por el programa: pasa por su web
o su app. O sea que **el puente es nuestro canal autorizado al bróker y ese
dato no viaja dentro**. No hay nada que «sacar de ahí».

## Mitad 2: por su web tampoco. La puerta está cerrada a los programas

**AvaTrade responde 403 con «Just a moment…»** — la pantalla de desafío de
Cloudflare. No solo la portada: **sus cinco sitemaps también dieron 403**, uno
detrás de otro.

O sea que da igual si publican sentimiento o no: **no se puede leer nada de ese
sitio con un programa** sin fingir ser un navegador, que es exactamente la línea
que este proyecto decidió no cruzar (ver la primera ronda: el User-Agent es
honesto a propósito).

⚠️ Matiz honesto: un 403 de Cloudflare **no es lo mismo que una prohibición
legal** — su `robots.txt` no prohíbe nada. Es protección antirrobots. Pero el
resultado práctico es el mismo y la conclusión no cambia.

## ⚠️⚠️ Y la sonda cazó un fallo MÍO, que es lo más importante de esta ronda

Esta ronda se escribió con una mejora: **no adivinar direcciones**. En vez de
inventarme URLs (las tres de FX Blue dieron 404 y no enseñaron nada), la sonda
lee los `Sitemap:` que el propio `robots.txt` anuncia y busca ahí.

Pero al no encontrar nada, imprimió esto:

```
  páginas listadas: 0
  ⚠️ NINGUNA página con esas palabras en su dirección.
     …pero sí que no la publican abiertamente.
```

**Habiendo leído CERO páginas.** El informe afirmaba «no la publican» cuando lo
que había pasado es que **no se pudo mirar**. Las dos cosas se escriben igual y
significan lo contrario:

| | qué es |
|---|---|
| «miré 40.000 páginas y ninguna coincide» | un hallazgo |
| «no pude abrir ni una» | **nada** |

Es la misma familia que ya está en este archivo: **una etiqueta equivocada es
un error de medición**, y **una comprobación que se adapta a lo que encuentra
no comprueba nada**.

**El arreglo no es «tener más cuidado»:** el veredicto se calculaba dentro del
guion y ahora vive en `app/scripts/lib/sitemaps.mjs` (`veredictoBusqueda`),
puro y con **14 comprobaciones sin internet** dedicadas a esto. La regla que no
hay que ablandar: **sin páginas leídas NO hay veredicto**; ante la duda, «no se
pudo mirar», nunca «no existe». Misma asimetría que `yaCorrioHoy` y
`decidirConRobots`.

**Comprobado que muerden**, con el daño verificado en su sitio: al quitar la
condición que separa los dos casos, **fallan 5**.

📌 Y lo que conviene ver: **la sonda que iba a contestar una pregunta acabó
contestando dos**, y la segunda era sobre mí. La mejora de la ronda anterior
(enseñar el contexto en vez de contar) destapó mi error con FX Blue; la de ésta
destapó un error en la propia herramienta.

## El veredicto, entonces

**AvaTrade no cambia nada.** La #5 sigue fuera, ahora con un motivo más: ni
siquiera el bróker con el que Néstor opera —donde tenemos acceso autorizado y
funcionando— puede dar ese dato, ni por el programa ni por la web.

---

# Las tres del documento de arquitectura (2026-09-14). En las dos apps

Néstor trajo una directiva de arquitectura («Risk-First FX Telemetry»), pidió
opinión honesta y aprobó las tres cosas que recomendé. **La mitad del documento
ya existía** —el filtro de R/B en 1:1.5, la jerga invariante en los 13 idiomas,
el importador del bróker, las reglas de sombra que nacen calladas— y eso es en
sí mismo el hallazgo: alguien de fuera llegó a las mismas decisiones a las que
este proyecto llegó midiendo. Va a la landing.

📌 Lo que se RECHAZÓ y por qué, para que no vuelva sin argumento nuevo:

- **El «kill-switch» automático** («si el backtest baja del umbral, pausa los
  avisos»). No existe esa medición en vivo: el banco de pruebas se lanza a mano
  y mide cinco años. Y con ~36 señales/mes y ventaja cercana a cero, cualquier
  ventana móvil cruzaría el umbral constantemente — un interruptor que se
  enciende y se apaga solo es peor que cualquiera de los dos estados. No es
  imposible: es un problema de preregistro, como el COT, y son semanas.
- **«Nuestro Experimento #N sugiere que hagas X».** Los experimentos llevan 12 y
  3 operaciones reales. Sería presentar una regla sin probar como consejo.

## 1. El diario ya no se queda ENCERRADO al retirar a alguien

⚠️ **Esto no lo propuso el documento: salió al comprobarlo.** `retirar` hacía
`deleteDoc(users/{uid})`. **Firestore no borra las subcolecciones** al borrar un
documento, así que `users/{uid}/trades/*` sobrevivía — pero la regla exige que la
ficha exista y diga `'aprobado'` para leerlo. O sea que el diario **no se
borraba: se quedaba encerrado para siempre**, y readmitir a la persona tampoco
se lo devolvía. Nadie decidió eso; salió así.

Ahora `retirar` deja `estado: 'retirado'`. La persona ve **exactamente lo
mismo** (la app ya mandaba cualquier estado que no fuera aprobado ni pendiente a
la pantalla de entrada con su aviso), su diario sigue ahí, y readmitirla se lo
devuelve entero.

✅ **Las reglas de Firestore NO hubo que tocarlas** —el admin ya podía escribir
cualquier `estado`—, así que Néstor no tiene que entrar a la consola de Firebase.

## 2. El estado vacío del Diario

Antes: **una línea gris al FINAL de la pantalla**, debajo de todo. Quien abría
el Diario por primera vez veía un muro de campos sin saber para qué sirve, y el
aviso llegaba donde ya no orienta.

Ahora una tarjeta **arriba del formulario** con las dos puertas que ya existían
y están probadas: importar el informe del bróker, o ir a las señales (donde
«Anotar en el Diario» precarga par, dirección y nota). **No se inventó un camino
nuevo.**

## 3. Tus propios números por grupos

```
app/src/lib/diagnostico.js        las cuentas puras         GEMELO
app/src/components/Diagnostico.jsx  la tarjeta plegable     GEMELO
app/scripts/prueba-diario.mjs     58 comprobaciones         GEMELO
```

Tres cortes que el Diario ya distingue: **cruce o par con dólar**, **compra o
venta**, y **por par**. Cada uno con sus operaciones, su acierto y su neto.

### ⚠️⚠️ CADA PORCENTAJE VA CON SU MARGEN PEGADO, Y ES LA PIEZA CENTRAL

`margen(n) = 98/√n` — la mitad del intervalo de confianza del 95 % en el peor
caso (p = 0,5), en puntos porcentuales:

| n | margen |
|---:|---:|
| 10 | **±31** (un 40 % y un 70 % son el mismo número) |
| 25 | ±20 |
| 100 | ±10 |
| 400 | ±5 |

Sin eso, «38 % en cruces» sobre veinte operaciones se lee como un diagnóstico
sobre uno mismo. El precedente es de este proyecto: **el 89 % de Néstor sobre 9
operaciones**, donde está medido que con una moneda al 55 % sacar 8 o 9 de 9
pasa una de cada 26 veces. En la pantalla real se ve «USD/JPY 33 % ±33»: el
margen es tan grande como el número, y eso lo dice todo de un vistazo.

### Las decisiones que no hay que ablandar

⚠️ **NO DA CONSEJOS.** No hay veredicto, ni lado, ni «te sugerimos». Hay una
comprobación que falla si aparecen las palabras `sugiere`, `consejo`,
`recomend`, `experimento`… — la misma idea que en `cot.js`: añadir un veredicto
obliga a venir a borrarla a mano.

⚠️ **El acierto NO se pinta de color; el neto SÍ.** Está medido en esta app que
se puede acertar el 55 % y perder dinero, así que pintar el acierto de verde
afirmaría algo que el número no dice. El dinero sí significa algo en plata —
misma decisión que en `SetupDetalle`.

⚠️ **Por par se ordena por CANTIDAD, nunca por acierto.** Ordenar por acierto
pone arriba al par con dos operaciones ganadas y un 100 %, que es justo el que
menos dice. Y por debajo de 8 operaciones un par no sale.

⚠️ **Los grupos vacíos siguen saliendo con n = 0.** Esconderlos dejaría en
pantalla solo los que parecen significar algo, que es cómo se fabrica un
espejismo.

⚠️ **El lote es CONTEXTO, no un consejo.** Se enseña el menor, el mayor y
cuántos tamaños distintos. A propósito NO se dice «usa lote fijo»: que sea peor
**no está medido aquí**, y es de las cosas que suenan tan razonables que se dan
por ciertas.

⚠️ **Cruce y «con dólar» se definen por lo que SON**, no por descarte. Ya mordió
tres veces en este proyecto (`esSombra`, `ventasPausadas`, `esDeLaApp`): un
`par` con basura dentro caería en el grupo del dólar en silencio.

## ⚠️ Lo que solo se vio en el navegador, y llevaba ahí desde siempre

**En árabe, TODO el Diario salía con los números al revés.** No lo causó este
cambio: los 128 elementos `mono` de la pantalla —las tres estadísticas de
arriba, los códigos de par, los lotes, las fechas y los resultados— heredaban
`rtl`, y **el Diario nunca se había mirado en árabe**. Es la quinta vez que este
error aparece en este repo (el gráfico, el clima, la correlación, el calendario).

Arreglado con la regla de siempre: **se fija la dirección solo de lo que NO es
idioma**. Los números y los códigos de par en `ltr` fijo; la línea que mezcla
número con palabra traducida (`0.05 lote · 2026-09-01`) usa `<bdi>` para aislar
solo el número, que es el arreglo del calendario — ponerle `ltr` al renglón
entero partía «24.5K» en dos.

📌 **Y de paso, la dirección de cada operación se mostraba SIN traducir** en la
lista (`Compra` en los 13 idiomas) mientras el formulario justo encima sí la
traducía. Corregido; el valor guardado en Firestore sigue siendo `'Compra'`/
`'Venta'`, que es lo que manda la nota del 2026-07-30.

## Cómo se verificó

Lint, build y **todas** las pruebas sin internet en los dos repos. `gemelos`
pasa de 50 a **53** archivos idénticos.

**Comprobado que las pruebas MUERDEN**, con el daño verificado en su sitio:
devolver el `deleteDoc` tumba 3 · ordenar los pares por acierto en vez de por
cantidad tumba 2.

Y en **Chromium a 390 px**, componente aislado (el Diario está detrás de
Firebase), en español y árabe, con el estado lleno y el vacío:

| qué se comprobó | resultado |
|---|---|
| español, 61 operaciones | los tres cortes con sus márgenes; «USD/JPY 33 % ±33» |
| **árabe** | **212 hojas de datos, 0 en `rtl`** — comprobado con el CSS calculado |
| estado vacío | la tarjeta con las dos puertas, y la de diagnóstico **no se pinta** |
| desplazamiento lateral | ninguno en los tres |
| errores de consola | ninguno |

📌 La primera comprobación de dirección que escribí era **demasiado burda**:
exigía que TODO elemento `mono` fuera `ltr`, y eso contradice la regla del
propio proyecto — los contenedores que llevan texto traducido deben seguir en
`rtl`. Reescrita para mirar solo las **hojas** que contienen un número o un
código de par. Una comprobación que exige lo que no debe exigir es tan inútil
como una que no exige nada.

---

# El margen de error, explicado para suscriptores (2026-09-14)

Néstor leyó la tarjeta nueva y preguntó qué era el «±». Se lo conté por el chat
con una moneda, lo entendió a la primera, y **pidió las dos cosas: que la
comparación fuera A LA PANTALLA, y que la explicación se guardara como las
otras cinco** —el volumen, TradingView, la correlación, el swap y la
actividad— para que los suscriptores la lean en la página web **antes de
suscribirse**.

Va con aquéllas porque funciona por el mismo motivo: **es una forma de exagerar
que la app decide no usar, contada con el mecanismo delante.** Y ésta es, de
las seis, la que más directamente desactiva el truco favorito del sector.

## El texto

> **Qué es ese ± que va pegado a cada porcentaje.**
>
> Es **cuánto puede moverse ese número solo por casualidad**. No es un margen
> de error de la app: es el de la muestra. Con pocas operaciones es enorme, y
> con muchas es pequeño.
>
> **Piénsalo con una moneda.** Si la tiras 10 veces y salen 7 caras, no está
> trucada — eso pasa todo el rato. Si la tiras 400 veces y salen 280, ahí sí
> pasa algo. **Es el mismo 70 % las dos veces**, y significan cosas
> completamente distintas.
>
> Tus operaciones son igual. Por eso cada porcentaje de la app va con su ±
> al lado:
>
> | operaciones | margen | qué quiere decir |
> |---:|---:|---|
> | 10 | ±31 | un 40 % y un 70 % **son el mismo número** |
> | 25 | ±20 | sigue sin decirte casi nada |
> | 100 | ±10 | ya empieza a significar algo |
> | 400 | ±5 | ahora sí |
>
> **Y por qué te lo contamos en vez de callarnos.** Porque el número sin el ±
> al lado es el truco más viejo de este negocio: enseñar «87 % de acierto» sin
> decir que son quince operaciones. No es mentira — es que no significa nada, y
> se lee como si significara todo.
>
> Nos pasó **aquí dentro**. El dueño de la app abrió su Historial y vio **89 %
> de acierto**. Sonaba a que algo funcionaba de maravilla. Eran **9
> operaciones**: con una moneda cargada al 55 % sacar 8 o 9 aciertos de 9 pasa
> **una de cada 26 veces**. O sea que ese 89 % era perfectamente compatible con
> no tener ninguna ventaja.
>
> Esa es la razón de que el ± exista en la pantalla. No para que desconfíes de
> tus números: **para que sepas cuándo ya se pueden creer.**

## Las dos decisiones que lo sostienen, por si alguien las mueve

⚠️ **El margen es el del PEOR caso a propósito** (`98/√n`, que es p = 0,5). Un
margen que se afina a favor propio serviría para presumir, no para decidir
sobre dinero. Es la misma elección que hace el resolver al contar como PERDIDA
el día que toca stop y objetivo.

⚠️ **En pantalla va primero el ± y DESPUÉS la moneda**, no al revés. El ±
explica qué es el número; la moneda lo hace entender. Puesta delante, la moneda
se lee como una curiosidad suelta y nadie la conecta con el símbolo que tiene
al lado de cada cifra. Hay una comprobación en `prueba-diario.mjs` (bloque 9)
que falla si alguien invierte el orden, y otra que exige la clave en los 13
idiomas — una mitad traducida y la otra en español sería peor que nada.

📌 **Y la regla general que este día vuelve a confirmar**, ya escrita el
2026-09-09: cuando Néstor pregunta «¿esto qué me quiere decir?», la respuesta
correcta casi nunca es explicárselo en el chat. **Es meter la explicación EN LA
PANTALLA**, porque el suscriptor que se lo pregunte mañana no me tiene a mí al
lado. Van tres veces: el calendario, la actividad y ahora el margen.

---

# La importación del bróker leía CUALQUIER COSA (2026-09-14). El peor fallo del proyecto

Néstor subió su informe real de MT5, vio «129 operaciones nuevas · +1754.43» y
preguntó, sin sospechar nada, **«¿para qué me sirve esa información?»**. Al ir a
contestarle salió esto. Es el fallo más grave que ha tenido el proyecto, y el
motivo es el que este repo lleva meses escribiendo: **no dio error ni una vez.
Dio 129 filas con números perfectamente creíbles y todos falsos.**

📌 **Y yo le había dicho «pulsa Añadir las 129 tranquilo, lo que entra es
correcto».** Se lo dije **sin haber visto el archivo**, razonando desde el
código. Es la séptima vez documentada aquí que presento un mecanismo
convincente antes de comprobarlo, y la primera en la que mi error iba a
escribirle datos falsos en su Diario. Se salvó porque no lo pulsó.

## Los tres fallos, que son independientes

### 1. ⚠️⚠️ La celda ESCONDIDA que corría todas las columnas

MT5 mete dentro de cada fila de posiciones una celda que el navegador no
enseña, con su identificador interno:

```html
<td>buy</td>
<td class="hidden" colspan="8">FIX:0:ATG-ImEIk-052516096</td>
<td class="">0.03</td>          ← el volumen de verdad
```

La cabecera **no tiene esa columna**. Contarla corre todo lo que viene detrás:

| lo que creía leer | lo que leía |
|---|---|
| volumen | ese texto → `aNumero` da null → **lote 0 en las 129** |
| resultado en dólares | **el precio de CIERRE** |
| fecha de cierre | un precio → no se entiende → **la de hoy** |

La prueba que lo cierra, con sus propias filas: USD/JPY «+158.93» es el cierre
158.933 · GBP/USD «+1.34» es 1.34435 · USD/CAD «+1.38» es 1.38400 · USD/CHF
«+0.79» es 0.78767. **El «+1754.43» era una suma de precios de cierre.**

### 2. ⚠️⚠️ Un informe de MT5 trae CUATRO tablas, no una

Posiciones, Órdenes, Transacciones y Órdenes activas, **cada una con sus
columnas**. El lector se aprendía las de la primera y las usaba para las
cuatro. Resultado: la misma operación entraba tres veces bajo tres formas, y
hasta una orden **pendiente** (`sell limit`, estado `placed`) que nunca se
ejecutó. **36 posiciones cerradas reales → 129 filas a punto de guardarse.**

Ahora se localizan todas las cabeceras y se importa de UNA sola tabla, elegida
por su FORMA y no por su título (los títulos están traducidos y cambian entre
MT4 y MT5): **+2 si tiene columna de resultado** (así caen Órdenes y Órdenes
activas) y **+1 si tiene DOS columnas de hora** (así cae Transacciones, donde
cada fila es media operación —la entrada o la salida— y su mitad de entrada
trae resultado 0). Un CSV de una sola tabla no se entera de nada.

⚠️ Y **se avisa** de las filas que quedan fuera (`otrasTablas`, en los 13
idiomas). Saltarse tres tablas en silencio es justo el import callado que la
cabecera de `importarOperaciones.js` dice que es peor que uno que falla.

### 3. «Fecha/Hora» no coincidía con NINGÚN sinónimo

Así se llama esa columna en el MT5 en español. `'fecha/hora'` no es `'fecha'`
ni empieza por `'fecha '`, así que **no había columna de fecha en absoluto** y
`fechaDe('')` caía al valor por defecto. Con los otros dos fallos arreglados las
129 seguían saliendo todas con la fecha de hoy.

Arreglado con los sinónimos y quitando los espacios alrededor de la barra al
comparar («S / L» y «Fecha/Hora» se escriben sin criterio fijo).

## El resultado, con el archivo real

| | antes | ahora |
|---|---:|---:|
| operaciones | 129 | **32** (36 posiciones − 4 pares que Swing no sigue) |
| lote | 0 en todas | 0.01 a 0.04 |
| fechas distintas | **1** (hoy) | **20**, del 25 may al 14 sep |
| «resultado total» | **+1754.43** | **−47.14** |

📌 **Y sus números reales dicen justo lo que la app predica:** acertó el **78 %**
(25 de 32) **y perdió dinero**. Una sola operación, EUR/USD, se llevó −74.65
—de los cuales **−23.09 son swap**, que es el coste que este proyecto barre a
ciegas en cinco niveles—. Es el mejor ejemplo real que tiene el proyecto de que
el acierto sin el tamaño al lado no dice nada.

## Lo que se comprobó, y una prueba que NO mordía

Cuatro bloques nuevos en `prueba-importar.mjs`, con un informe de MT5 que
reproduce la **forma** del real (las cuatro tablas, la celda oculta, la orden
pendiente) pero **no sus datos**: son las operaciones de una persona y los dos
repositorios son públicos.

**Comprobado que muerden**, con el daño verificado en su sitio antes de darlo
por bueno: volver a contar las celdas ocultas tumba 7 · quitar «fecha/hora» de
los sinónimos tumba 3.

📌 **Pero la de elegir tabla tumbaba CERO.** En MT5 las posiciones van primero,
así que «quedarse con la primera» acierta por casualidad y la comprobación
pasaba sin comprobar nada — el agujero de siempre. Se añadió un montaje con las
órdenes DELANTE y solo la segunda tabla con resultado: ahí sí, quitar la
elección tumba 4.

📌 **Y de paso me equivoqué en la aritmética del aviso** (dije 4 filas fuera
cuando eran 5) y la prueba me lo cantó. Es lo que tiene que pasar.

## El botón de borrar YA existía, y yo dije que no

Le dije a Néstor que no había forma de borrar una operación del Diario. **Era
falso**: la ✕ está ahí desde siempre. Mi búsqueda fue `grep borrar` y el prop se
llama `onBorrar`, con B mayúscula. **Buscar sin distinguir mayúsculas cuesta lo
mismo**, y afirmar que algo no existe sin haberlo encontrado es el mismo error
que el veredicto «no la publican» de la sonda de sentimiento: *no lo encontré* y
*no existe* no son lo mismo.

Lo que sí faltaba, y se hizo: **la ✕ borraba al primer toque, sin deshacer.** Un
dedo en el sitio equivocado de un teléfono y esa operación desaparecía para
siempre. Ahora pide un segundo toque («¿Borrar?» en rojo, en los 13 idiomas).

⚠️ A propósito **no se usa `confirm()`** del navegador: en la PWA instalada sale
un cuadro del sistema en inglés, fuera de los 13 idiomas de la app.

## Cómo se verificó

Lint, build y **todas** las pruebas sin internet en los dos repos. Los 53
gemelos siguen idénticos (`importarOperaciones.js`, `DiarioTab.jsx` y
`prueba-importar.mjs` lo son, así que el cambio va emparejado y en la misma
rama).

Y en **Chromium a 390 px**, en español y en árabe: un toque en la ✕ enseña
«¿Borrar?» y **no borra**; el segundo sí. Cero errores de consola, cero
desplazamiento lateral.

📌 **La comprobación de dirección volvió a salirme demasiado burda**, por
tercera vez: marcaba en rojo la flechita de plegar «▸», que es `.mono` pero no
es un dato. Acotada a las hojas que llevan un número o un código de par — 5 de
5 en `ltr` en los dos idiomas.

---

# Historial contra Diario, explicado para suscriptores (2026-09-15)

Néstor preguntó **«¿el historial de señales es diferente al diario de
operaciones? dime por qué, porque eso también va para los suscriptores»**. Es
la séptima de esta serie y hace falta de verdad: son dos porcentajes en la
misma app que **nunca van a coincidir**, y sin explicarlo el suscriptor va a
pensar que uno de los dos está mal.

## El texto

> **Son dos cosas distintas, y las dos tienen que estar.**
>
> **El Historial de señales es el boletín de notas de la APP.** Cada día el
> vigía anota lo que la app señaló, y en los días siguientes mira los precios
> reales y decide él solo si tocó antes el objetivo o el stop. **Es idéntico
> para todos los suscriptores** porque no es de nadie: es el registro de lo que
> la app dijo. Nadie lo puede tocar, ni tú ni nosotros. Se escribe solo, hacia
> adelante, y por eso vale.
>
> **El Diario de operaciones es lo que hiciste TÚ.** Vive en tu cuenta, es
> privado, y ahí va lo que operaste de verdad con tu dinero, hayas seguido a la
> app o no.
>
> | | Historial de señales | Diario de operaciones |
> |---|---|---|
> | ¿de quién es? | **de la app** — igual para todos | **tuyo** — privado |
> | ¿qué anota? | lo que la app señaló | lo que tú hiciste |
> | ¿quién dice ganada o perdida? | la app sola, con los precios | **tu bróker** |
> | ¿en qué se mide? | **pips** | **dólares** |
> | ¿descuenta spread y swap? | **no** | **sí** (resultado neto) |
>
> **Por eso no coinciden, y está bien que no coincidan.** Uno contesta «¿acertó
> la app?» y el otro «¿gané yo dinero?». Son preguntas distintas, y la segunda
> depende de cuánto arriesgaste, cuándo entraste y qué te cobró tu bróker.

## ⚠️ Y la parte que hace que esto sirva de argumento y no de excusa

El Historial **cojea por los dos lados**, y ahora lo dice en pantalla:

- **Optimista en los costes.** Los pips salen del objetivo y el stop que puso
  la app, sin restar spread ni swap. En una cuenta real es peor. El ejemplo
  vivo lo dio el propio informe de Néstor: **una sola operación con −23 dólares
  SOLO de swap**.
- **Pesimista en el orden.** Si un mismo día se toca el stop y el objetivo,
  cuenta como PERDIDA — la vela diaria no dice cuál pasó primero, y se elige el
  peor caso a propósito.

📌 **Decir las dos es lo que lo vuelve creíble.** Decir solo la segunda sería
presumir de rigor; decir solo la primera sería una disculpa. Un suscriptor no
puede comprobar si nuestro RSI está bien calculado, pero sí puede comprobar que
le contamos por dónde cojea el número **antes** de que lo use.

## Lo que se cambió por esta pregunta

`historial.pie` en los 13 idiomas, debajo de la lista de señales de Swing.

⚠️ **Va DESPUÉS de los números, no antes** — al revés que en la actividad, las
tasas y el COT. La diferencia no es capricho: allí el aviso previene de **leer
mal el dato**, y lo caro es leerlo antes que el número. Aquí es **letra pequeña
de cómo está calculado**, y puesta delante de una tabla que todavía no se ha
visto no orienta a nadie.

⚠️ **`HistorialTab.jsx` es PRIMO, no gemelo**, así que esto es **solo Swing**.
**Intradía tiene exactamente el mismo agujero** (su resolver tampoco resta
costes) y hay que portarlo con su texto propio, porque allí además los cruces
se derivan. Queda pendiente y dicho.

## 📌 Y de paso, el error de dirección en árabe por SEXTA vez

Al mirarlo en Chromium salió que **los 39 números del Historial se pintaban al
revés en árabe**: el acierto, las operaciones, los pips netos, los códigos de
par y el resultado de cada fila. No lo causó este cambio — **esta pantalla
nunca se había mirado en árabe**, igual que el Diario la semana pasada.

Arreglado con la regla de siempre: `dir="ltr"` **solo en lo que NO es idioma**
(el número suelto, `EUR/USD COMPRA`), y **sin tocar** ni la etiqueta traducida
(«REVERSIÓN»), ni la fecha que arma `toLocaleString`, ni la frase de medición
que lleva números dentro.

📌 **Y la comprobación del navegador me volvió a salir demasiado burda**, por
cuarta vez: marcaba como error la frase traducida `medicion.pieLinea` solo por
llevar dígitos. Acotada a **datos puros** —un número suelto o un código de par—
y comprobado que MUERDE: al quitar un solo `dir="ltr"` saltan 9 elementos.

---

# Cobros y suscripciones: la investigación del 2026-09-15

Néstor pidió **automatizar los cobros, las suscripciones y la suspensión por
falta de pago**. Esto recoge lo averiguado ese día para no volver a buscarlo.
**Todavía no se ha construido nada ni se ha elegido plataforma.**

## El punto de partida, comprobado en el código

La app **ya tiene el candado puesto**: `useAuthUser.js` deja entrar solo si
`users/{uid}.estado === 'aprobado'`. Cualquier otro valor manda a la pantalla
de entrada. Automatizar **no es construir el candado, es cambiar quién gira la
llave** — hoy lo hace Néstor a mano en la pestaña Miembros.

Y la llave para escribir en Firestore desde un workflow **ya existe**:
`FIREBASE_SERVICE_ACCOUNT`, la que usa el vigía para los avisos al celular.
`scripts/lib/firestore-rest.mjs` sabe `listar` y `borrar`; **le falta un
`actualizar` (PATCH)**, que es lo único nuevo por ese lado.

## El diseño acordado: una FECHA DE VENCIMIENTO, y el robot cierra solo

Un `venceEl` por miembro y un workflow diario que cierra la puerta al que se le
pasó. Sirve **igual para los dos carriles**, que es lo que lo hace valer:

| | carril automático | carril manual (Venezuela) |
|---|---|---|
| quién pone la fecha | el robot, leyendo la plataforma | Néstor, cuando le pagan |
| quién cierra la puerta | **el robot** | **el robot igual** |

📌 Lo que arregla: hoy lo manual es manual de principio a fin y **olvidarse deja
la puerta abierta gratis**. Con la fecha, olvidarse no le abre la puerta a
nadie. Es la misma asimetría de `yaCorrioHoy` y `esSombra`: equivocarse hacia el
lado barato.

⚠️ Y encaja con la arquitectura de siempre — **nada recibe visitas, todo
consulta y publica**. El robot le PREGUNTA a la plataforma quién está al día;
no hace falta servidor, ni Render, ni Cloud Functions, ni plan de pago de
Firebase.

## Lo que Néstor decidió

- Clientes: **todo el mundo → acotado a Latinoamérica**, y dentro de ella
  **Colombia y Venezuela primero**.
- **Persona natural**, sin empresa, por ahora.
- Precio de partida: **$15/mes con 1 mes gratis** (sin confirmar).

## Lo que tiene a mano (dicho por él)

| | |
|---|---|
| Venezuela | cuentas bancarias · **Binance** · abriría **Pago Móvil** |
| Colombia | **Bancolombia** · **Davivienda** · **Daviplata** · miraría afiliarse a **Efecty** |

📌 Bancolombia abre una puerta que no se ha mirado todavía: **Wompi es de
Bancolombia** y acepta PSE, Nequi y transferencia. Para el carril colombiano
hay que compararla con Mercado Pago antes de decidir.

## ⚠️ VENEZUELA NO SE PUEDE AUTOMATIZAR. Y no es opinable

Lo dice **la propia página de ayuda de Hotmart**: los métodos de pago desde
Venezuela están restringidos por **las sanciones de la OFAC** (Estados Unidos).
No es un capricho de esa empresa: le aplica a casi toda plataforma con vínculo
estadounidense.

| | Venezuela |
|---|---|
| Stripe | no |
| Hotmart | restringido (OFAC) |
| PayPal | a medias — **no se retira a un banco venezolano** |
| Mercado Pago | presencia muy limitada |

Lo que sí funciona allá: **Pago Móvil** (bolívares, entre cuentas venezolanas),
**Binance/USDT** y **Zelle** (exige banco en EE. UU. **de los dos lados**).

⚠️ **Ninguno de los tres cobra solo cada mes.** No existe el cobro recurrente en
Pago Móvil ni en cripto. **Venezuela será manual siempre**, y quien diga lo
contrario está vendiendo algo. Por eso el `venceEl` no es un adorno: es lo que
hace que ese carril cueste un minuto al mes en vez de vigilancia constante.

⚠️ Las sanciones atan a **las plataformas estadounidenses**, no a un colombiano
que le vende información a un venezolano — por eso las cripto y el Pago Móvil
funcionan allá: no pasan por esas tuberías. **Esto NO es consejo legal**; si
crece, lo mira un contador.

## Hotmart: investigada a fondo y DESCARTADA

Parecía la ganadora por los métodos de pago locales (PSE, Efecty, Baloto, OXXO,
PIX, PagoEfectivo, Pago Fácil, Sencillito), prueba gratis de hasta 30 días,
webhooks de suscripción y ~9,9 % + $0,10, que sobre $15 son **35 centavos más**
que un 5 % + $0,50. Se cayó por tres cosas:

1. **Venezuela restringida por OFAC** — lo que Néstor puso como requisito.
2. **Cláusula de exclusividad:** mientras el producto esté publicado ahí, **no
   se puede vender en otra parte** (sí se puede tener página de venta propia, y
   **no se ceden los derechos de autor** para siempre). A Néstor no le cuadró, y
   con razón.
3. ⚠️ **Está hecha para CURSOS, no para software.** Su comisión paga reproductor
   de video y área de miembros que esta app **no usa**. Es la categoría
   equivocada.

📌 **La distinción que sale de aquí y que hay que tener clara**, porque las dos
clases de empresa se parecen por fuera:

| | **revendedor / marketplace** | **procesador de pagos** |
|---|---|---|
| quiénes | Hotmart, Gumroad, Polar, Lemon Squeezy | Mercado Pago, Wompi, ePayco, PayU |
| qué hace | **te compra el producto y lo revende** | solo mueve la plata |
| condiciones | exclusividad, aprobación, revisión | casi ninguna |
| impuestos | los lleva él | **los llevas tú** |

**Si molesta que un tercero ponga reglas, la salida es un procesador.** El
precio de esa libertad son los impuestos propios.

⚠️ Y el motivo por el que el 2026-09-15 yo empujaba hacia un revendedor era
**el IVA europeo** (vender servicios digitales a consumidores de la UE obliga a
registrarse desde el primer euro, y una persona natural en Colombia no puede).
**Al acotar a Latinoamérica ese motivo desaparece.** Si algún día se vuelve a
abrir a Europa, vuelve a aparecer — no olvidarlo.

## Lo que queda pendiente para mañana

1. ❓ **LA pregunta que decide el carril automático**, y hay que hacérsela a
   ellos: *«cuenta de persona natural en Colombia, ¿puedo cobrar suscripciones
   recurrentes a clientes de México, Argentina, Chile y Perú?»*. Las cuentas de
   Mercado Pago son **por país** y eso no se pudo resolver desde aquí.
2. Comparar **Wompi (Bancolombia)** contra Mercado Pago para Colombia.
3. Cerrar Venezuela: Binance y/o Pago Móvil, confirmación manual.
4. **Construir el `venceEl` y el robot** — es lo único que **no depende de
   ninguna respuesta ajena** y se puede empezar ya.
5. **Precio por región.** $15 en Venezuela o Argentina deja fuera a mucha gente
   que sí entraría. No decidido.

⚠️ **Nada de esto se ha construido.** El único cambio real en el repositorio a
fecha de hoy es este texto.

## Lo que NO hay que rehacer

Varias páginas oficiales están **bloqueadas por la red de estas sesiones**
(`stripe.com`, `docs.lemonsqueezy.com`, `polar.sh`, `hotmart.com`). Lo de arriba
sale de sus centros de ayuda accesibles y de fuentes de terceros. **Las
comisiones exactas y las listas de países se confirman al registrarse**, no de
memoria — y Hotmart anunció un cambio de tarifas para el **21 de septiembre de
2026**.

## La IA de promoción, y las tres advertencias que van con ella

Néstor está **ensayando** una IA que hace la página de venta, los videos y la
segmentación. Está bien y no hay nada que objetar al ensayo. Lo que va escrito:

1. **Meta y Google restringen los anuncios financieros.** Acumular rechazos
   puede costar la cuenta publicitaria. Presentarla como herramienta de
   información y educación, sin una sola cifra de ganancia, pasa el filtro — y
   es lo que la app es.
2. ⚠️ **Esas IA exageran por defecto**: fajos de billetes y «gana $500 al día»
   salen solos. **Cada frase se lee antes de publicarla.** El argumento entero
   del proyecto es enseñar los propios números siendo malos; un video de carros
   lo mata el primer día.
3. **No meterle plata a la campaña antes de resolver los cobros.** Hoy cada
   suscriptor habría que aprobarlo y retirarlo a mano.

## Wompi contra Mercado Pago, y la pregunta de los costos fijos (2026-09-15)

Néstor preguntó tres cosas: la comparación, si conviene tener **las dos** para
diversificar, y —la que más le importaba— **si tener las cuentas le genera
gastos mensuales o solo comisiones por uso**.

### La respuesta a lo de los costos: NINGUNA cobra mensualidad

| | ¿mensualidad? | ¿cuándo cobran? | ¿cuesta retirar? |
|---|---|---|---|
| **Wompi** (Bancolombia) | **no**, en el plan por uso | **solo si el pago sale bien** — si rebota, no hay cobro | se desembolsa a la cuenta |
| **Mercado Pago** | **no** | solo cuando te pagan | **gratis**, con tope de operaciones gratis al mes |

📌 **Se cobra sobre la venta, no por tener la cuenta ni por retirar.** No hay
renta fija que se coma los primeros meses, que era justo el riesgo de abrir
varias cuentas «por si acaso».

### Las cuentas sobre $15 (≈60.000 COP a ~4.000/USD)

| | comisión | te queda | equivale a |
|---|---|---:|---:|
| **Wompi** | 2,65 % + $700 + IVA | **~$14,32** | **4,5 %** |
| **Mercado Pago** (al instante) | ~3,29 % + $800 + IVA | ~$14,17 | 5,5 % |
| Mercado Pago (a 14 días) | ~2,79 % + $800 + IVA | ~$14,26 | 4,9 % |
| *Hotmart, para comparar* | *9,9 % + $0,10* | *~$13,41* | *10,6 %* |

📌 **Cobrar en Colombia con una pasarela colombiana cuesta menos de la mitad**
que cualquier plataforma internacional. Confirma por segunda vía que descartar
Hotmart estuvo bien.

### ⚠️ La diferencia que decide, y NO es el precio (son 15 centavos)

- **Mercado Pago tiene suscripciones NATIVAS** (`preapproval`): cobra solo cada
  mes, reintenta si la tarjeta falla, cancela y avisa por webhook. **El robot
  solo escucha.**
- **Wompi NO.** Tiene **tokenización**: guarda la tarjeta, pero **el calendario
  de cobros, los reintentos y los fallos serían código NUESTRO**.

⚠️ **Eso es justo la clase de código que falla en silencio** —un mes no cobra y
nadie se entera, o cobra dos veces— con dinero de otra gente de por medio. La
regla del proyecto es no construir lo que alguien ya hace bien. **Para el carril
automático: Mercado Pago**, aunque cueste 15 centavos más.

### ⚠️ Lo que exige que la persona ACTÚE no se puede cobrar solo

PSE, Efecty, Baloto y el efectivo piden que alguien entre a su banco o vaya a un
punto. Una «suscripción» con esos métodos es un **recordatorio mensual**, no un
cobro automático. Solo la tarjeta guardada y el saldo en la app se cobran solos.

📌 Es la misma forma del hallazgo de Hotmart (su mes gratis **solo funciona con
tarjeta**). Conclusión práctica: **PSE y Efecty sirven para VENDER, no para
COBRAR solo.** Hay que tenerlos, sabiendo que esos suscriptores caen en el
carril semiautomático.

### ¿Tener las dos? Sí, pero NO al empezar

1. Cada pasarela es integración, cuenta y contabilidad aparte: el doble de
   trabajo antes de saber si alguien paga.
2. Más métodos en la caja de pago **no siempre venden más**: una lista larga
   confunde y la gente abandona.
3. 📌 **Y lo que lo vuelve fácil: como el candado es UN campo, añadir una
   segunda pasarela después es añadirle un LECTOR al robot, no rehacer nada.**
   O sea que **no hay castigo por empezar con una** — y sí lo habría por
   construir dos y que sobre una.

Además ya se arranca con **dos carriles**, no con uno: Mercado Pago (automático)
y Binance/Pago Móvil (manual, Venezuela). Wompi entra en una segunda vuelta, con
un dato real en la mano: si se ve que hay colombianos abandonando el pago.

### Las tres preguntas para Mercado Pago (las hace Néstor)

1. **«Persona natural en Colombia: ¿puedo cobrar suscripciones recurrentes a
   clientes de México, Argentina, Chile y Perú?»** ← la que decide el carril.
2. «¿Qué medios se pueden cobrar AUTOMÁTICAMENTE en una suscripción? ¿PSE y
   Efecty también, o solo tarjeta guardada?»
3. «¿Cuántos retiros gratis al mes tengo a mi cuenta bancaria?»

### ⚠️ El estado al cerrar el día

Néstor: **«mañana lo hacemos… espera a que yo en la mañana te confirme para
arrancar con el robot»**. **NO empezar el `venceEl` ni el robot sin esa
confirmación.** Sigue en pie la convención del repo: avisar y esperar antes de
cada tarea grande.

---

# El robot de vencimientos: la puerta se cierra sola (2026-09-15)

Néstor dio el visto bueno por la mañana («dale, arranca con el robot») y se hizo
entero: el campo, la pantalla, el robot y las dos vueltas de comprobación con
datos reales. **Ya corre solo, todos los días.**

```
app/src/lib/vencimientos.js        las cuentas de fechas (puras)     GEMELO
app/scripts/lib/vencimientos.mjs   decidir a quién se le cierra      solo Swing
app/scripts/cerrar-vencidos.mjs    el robot                          solo Swing
app/scripts/prueba-vencimientos.mjs  74 comprobaciones, sin internet
.github/workflows/vencimientos.yml   diario 05:40 UTC + botón a mano
```

## El punto de partida, que cambia cómo se lee todo esto

**El candado YA EXISTÍA.** `useAuthUser.js` deja entrar solo si
`estado === 'aprobado'`. Automatizar los cobros **no era construir el candado:
era cambiar quién gira la llave.** Hasta hoy la giraba Néstor a mano, y eso
significa que **olvidarse deja la puerta abierta gratis**. Con una fecha por
miembro, olvidarse ya no le abre la puerta a nadie.

⚠️ **Y sirve igual para los dos carriles de cobro**, que es lo que lo hace
valer: en el automático la fecha la pondrá el robot leyendo la plataforma; en el
manual (Venezuela, que **no se puede automatizar** — ver la investigación del
2026-09-15) la pone Néstor cuando le pagan. **Quien cierra la puerta es el mismo
robot en los dos casos.**

⚠️ **LAS DOS APPS COMPARTEN LA COLECCIÓN `users`** (mismo proyecto de Firebase,
comprobado). Una sola fecha gobierna el acceso a Swing **y** a Intradía. Por eso
el robot vive **solo en Swing**: dos robots sobre la misma lista serían dos
programas peleándose por la misma puerta.

## Las decisiones que no hay que ablandar

⚠️ **SOLO CIERRA, NUNCA ABRE.** Abrir sigue siendo de Néstor en la pestaña
Miembros. Los dos errores no cuestan lo mismo: cerrar de más se arregla con un
toque y la persona escribe para quejarse; **abrir de más regala el producto y no
se entera nadie**. Es la misma asimetría de `yaCorrioHoy` y `esSombra`.

⚠️ **EL ADMINISTRADOR ESTÁ PROTEGIDO POR CORREO, y va lo PRIMERO** en el orden
de guardas de `decidir()`. Un robot que pueda dejar a Néstor fuera de su propia
app es un robot mal escrito. Comprobado con su correo real en producción.

⚠️ **SIN FECHA NO SE CIERRA.** Al empezar nadie tiene `venceEl`, así que el
robot no puede hacer una limpieza masiva sin querer el primer día. Es también lo
que permite dejarlo encendido mientras se deciden las plataformas de pago.

⚠️ **UNA FECHA ILEGIBLE NO CIERRA: AVISA** (empuja a `avisos` y el workflow
acaba en rojo). Un `venceEl` con basura dentro no puede leerse como «venció».

⚠️ **`DIAS_GRACIA = 1`.** Si vence hoy, no se cierra hoy. Un pago que entra a
las once de la noche o un huso horario no pueden costarle el acceso a nadie.

⚠️ **Sin `--aplicar` NO ESCRIBE**, igual que el publicador de reglas. Y al
revés que el botón, **la corrida automática siempre aplica**: el cron no depende
de que nadie se acuerde de marcar nada.

⚠️ **`retirar` deja `estado: 'retirado'`, NO borra la ficha.** Ya estaba
arreglado el 2026-09-14 (borrarla dejaba el diario de la persona **encerrado
para siempre**, porque la regla exige que la ficha exista y diga `aprobado`), y
el robot se apoya en eso: readmitir a alguien le devuelve su diario entero.

## ⚠️⚠️ DOS AGUJEROS QUE APARECIERON AL CONSTRUIRLO, Y NINGUNO ERA DEL ROBOT

**1. Cualquier miembro aprobado podía escribir CUALQUIER campo en su propia
ficha.** La regla decía «puedes actualizar tu documento si no cambias `estado`
ni `email`». Mientras ahí solo hubiera un `nombre`, era inofensivo. **En cuanto
la ficha lleva `venceEl`, cualquiera podía regalarse un año de suscripción
desde la consola del navegador.**

Arreglado con lista blanca: `diff(resource.data).affectedKeys().hasOnly(['nombre'])`.
Se comprobó **primero** que ninguna de las dos apps escribe otra cosa desde el
cliente, y solo entonces se cerró.

📌 **La lección: una regla escrita por DESCARTE («todo menos esto») envejece
mal.** Es el mismo fallo que `esSombra`, `ventasPausadas` y `esDeLaApp` — cuatro
veces ya. Lo que se añade después cae dentro en silencio.

**2. `Aprobar` solo se pintaba para `pendiente`.** O sea que **a un retirado no
se le podía volver a admitir desde la app**. Inofensivo mientras retirar fuera
raro y manual; con un robot cerrando puertas todos los días, sería un cliente
que paga y no hay forma de dejarle entrar. Ahora sale `Aprobar`/`Reactivar`
para cualquier estado que no sea aprobado.

## Cómo se pone una fecha (es lo que Néstor preguntó)

Pestaña **Miembros**, junto a cada persona: un campo de fecha y un botón
**«+30 días»**. El botón suma un ciclo **desde el vencimiento actual si todavía
no ha pasado** (así renovar antes de tiempo no regala días) y **desde hoy si ya
venció**. Borrar la fecha la quita (`deleteField`), y entonces el robot deja a
esa persona en paz.

El color es información, no adorno: neutro normal, **ámbar a 3 días o menos**,
**rojo si ya venció**.

## Comprobado en producción, las dos mitades

**Las reglas** se publicaron con el botón nuevo (ver la sección siguiente) y se
comprobó **por fuera** —relanzando el ensayo— que la versión en vigor era la
nueva, en vez de creerle al guion que las publicó.

**El robot** se lanzó en modo «solo mirar» contra el Firestore real:

```
   Fichas leídas: 4
   Se quedan dentro: 4 (sinFecha: 3 · admin: 1)
✓ Hoy no hay a quién cerrarle la puerta.
```

📌 Eso demuestra las dos cosas que ninguna prueba sin internet puede demostrar:
que habla con el Firebase de verdad, y que **la protección del administrador
funciona con el correo real de Néstor**.

---

# Publicar las reglas de Firestore con un botón (2026-09-15)

```
app/scripts/lib/reglas.mjs        las piezas puras
app/scripts/publicar-reglas.mjs   el publicador
app/scripts/prueba-reglas.mjs     22 comprobaciones, sin internet
.github/workflows/reglas.yml      SOLO a mano, con casilla de «publicar»
```

## ⚠️ Por qué existe, y es una lección de diseño, no una comodidad

Le pedí a Néstor que copiara 115 líneas del repositorio y las pegara en la
consola de Firebase. **No pudo** —el portapapeles no le funcionaba entre las dos
ventanas— y estuvo media hora peleando. Su mensaje fue: *«imposible con todas
tus indicaciones no puedo copiar ni pegar»*.

📌 **Pedirle a una persona que copie un archivo a mano es un fallo de diseño, no
un paso del procedimiento.** Si el archivo vive en el repositorio, publicarlo es
trabajo de una máquina.

Y arregla algo peor que la molestia: mientras se copiara a mano, **lo PUBLICADO
y lo que está en el repositorio podían separarse sin que nadie se enterara** —
el mismo fallo silencioso de siempre. Ahora el repositorio es la única fuente.

## Lo que lo hace seguro

La API son **dos pasos y el orden importa**: primero se SUBE el archivo y Google
lo valida (no cambia nada), y solo después se pone en vigor. Así **el ensayo no
es de mentira**: un error de sintaxis sale antes de publicar.

`revisar()` **no valida sintaxis** —para eso está Google— sino que no se suba un
archivo **truncado**: llaves descuadradas, vacío, o **sin una sola `allow`**,
que dejaría la base de datos cerrada entera. Es el error que una máquina sí
puede cometer y un humano no notaría.

⚠️ El permiso para tocar reglas **no es el mismo** que para leer datos. Se pide
el de Firebase y **no `cloud-platform` entero**: pedir más permiso del necesario
es permiso regalado. La cuenta de servicio ya lo tenía — no hubo que tocar IAM.

## ⚠️ Y salió otro hallazgo: Intradía tenía su propia copia, ya desactualizada

Su `firestore.rules` decía en la cabecera *«esta es una copia idéntica»* **y ya
no lo era**: le faltaba el arreglo de seguridad. Quien leyera ese repositorio
creería que rigen unas reglas que no rigen.

Hay **un solo** proyecto de Firebase y **unas solas** reglas en vigor. Ahora
`../firestore.rules` es **GEMELO (55)** — los caminos de `gemelos.mjs` se
resuelven desde `app/`, así que `'../'` alcanza la raíz del repositorio.

---

# La opinión de un tercero sobre Swing (2026-09-15)

Néstor mandó capturas de la app a otra IA pidiéndole una valoración de trader,
y trajo la respuesta. **Va guardada porque la mitad sirve para la landing y la
otra mitad señala un hueco real.** Pero primero, lo que hay que corregir.

## ⚠️ Lo que la opinión dice MAL, comprobado contra los datos de producción

| dice | es |
|---|---|
| «"comprar la caída" acierta un **6 %**» | **0 %** — 0 de 5, y con 5 operaciones el 6 % **no es un valor posible**. Los −272 pips sí son exactos |
| «**76 %** de acierto en **17 operaciones**» | **78 % sobre 18** — leyó mal dos dígitos de una captura |
| «sin módulo de **tamaño de posición**» | **existe desde la fase 1** y es una pestaña entera: «Riesgo» |
| «ojalá el botón de 5 años tenga esa profundidad» | **ya la tiene**: es la sección de mediciones, con el backtest de 1.436 días |

## ⚠️⚠️ Y AQUÍ ME EQUIVOQUÉ YO, CORRIGIENDO. La versión anterior de esta tabla

decía que lo real era «**74 % sobre 23 cerradas**, de las cuales 17 ganadas» y
que el revisor «confundió las ganadas con el total». **Las dos cosas eran
falsas**, y la captura de Néstor lo destapó en un minuto: la pantalla dice
**78 % · 18 · +462**.

**El fallo estaba en mi conteo, no en la app.** Conté por `tipo` e ignoré el
campo `sombra`, así que metí en el cubo de la app las **5 ventas pausadas** —
que son señales de la app que **no se proponen**, y por eso `resumir()` las
excluye a propósito desde el 2026-09-05. Los números reales, con la lógica de
`historialCalc.js`:

| | ops | ganadas | acierto | pips |
|---|---:|---:|---:|---:|
| la app | 18 | 14 | **78 %** | +462 |
| reversión | 18 | 7 | 39 % | −337 |
| comprar la caída | 5 | 0 | **0 %** | −272 |
| ventas pausadas | 5 | 3 | 60 % | +15 |

📌 **La lección tiene dos capas y la segunda es peor.** La primera es la de
siempre: afirmé antes de comprobar. La segunda es que **lo hice mientras
corregía a otro**, que es justo cuando uno se siente con más razón — y encima
lo escribí en la memoria del proyecto, donde una corrección falsa sobrevive a
todo. **Corregir a alguien exige la misma comprobación que afirmar, o más.**

📌 **Y el 6 % se cae solo con aritmética, sin datos:** con 5 operaciones los
únicos aciertos posibles son 0, 20, 40, 60, 80 y 100. Eso bastaba para
descartarlo **antes** de abrir ningún archivo, y no lo hice.

## Lo que sí dice, y era el verdadero problema de rótulo

Que el revisor y yo leyéramos mal la misma captura no era casualidad: **el
primer bloque no decía de quién era.** Los otros dos llevaban título
(«Historial de la regla contraria», «Historial de comprar la caída») y el
primero no, así que su número se leía como el total de todo — cuando cuenta
**solo lo que la app propuso**, sin las dos reglas de sombra ni las ventas
pausadas. Y el subtítulo, en los 13 idiomas, decía «**cada** señal que encontró
el vigía», que para ese bloque es sencillamente falso.

Arreglado el 2026-09-15: título propio («Las señales de la app») y subtítulo
que ya no promete lo que el número no cuenta.

## Lo que dice BIEN, y coincide con lo que este archivo ya dice

- **«17 trades no prueban nada»** — exacto, y es justo para lo que existe el
  `±` de `margen()`. Con 23 cerradas el margen es **±20 puntos**: ese 74 % es
  compatible con un 54 %. **Un lector externo llegó solo a la conclusión que la
  app ya imprime en pantalla**, y eso es la mejor validación que ha tenido esa
  decisión de diseño.
- **«velas diarias, no sirve para minuto a minuto»** — correcto, y es el diseño.
  No sabía que existe la app hermana. **Para la landing: las dos apps hay que
  presentarlas juntas**, o cada una parece incompleta por separado.
- **«el puente estaba apagado»** — real. Matiz importante que él no podía saber:
  el puente **solo alimenta la tarjeta de spread y actividad**, no el barrido.
  El barrido no depende del PC de Néstor.

## ⚠️ EL HUECO REAL QUE SEÑALA, Y ES BARATO DE TAPAR

> «sin un chequeo de **correlación entre señales simultáneas** como el que armé
> yo a mano hoy»

**Tiene razón y es lo mejor de toda la opinión.** Hoy la correlación está en el
tablero como **tarjeta plegada aparte**, y el aviso del Diario solo mira si dos
operaciones **comparten una divisa**. Ninguno de los dos dice lo que hace falta:
**«estas dos señales de HOY son la misma apuesta»**.

Y el dato **ya está calculado y publicado** en `barrido.json` (`correl`, 2,1 KB)
desde el 2026-09-08. No hace falta ningún dato nuevo, ni un crédito.

📌 Él mismo detectó así el conflicto **GBP/JPY y USD/JPY**, que en este archivo
está medido en **+0,95**. La app tenía el número y no se lo puso delante.

⚠️ **Sería INFORMACIÓN, no un filtro**: avisar de que dos señales del día van
juntas, **sin apagar ninguna**. Apagar señales por correlación cambiaría las
señales y tendría que pasar por el banco de pruebas, como todo lo demás.

## Lo que dice del precio, que es un dato de fuera y vale

| estado | pagaría |
|---|---|
| hoy (muestra chica, puente que se cae, sin cruce de correlación) | **$10-20/mes** |
| con feed resuelto + 5 años de historial real + cruce de riesgo | **$30-40/mes** |

📌 **Los $15 que Néstor había elegido caen justo en medio del primer rango.** Es
la primera confirmación externa de ese número, y encaja con que lo que se vende
hoy es **información**, no señales.

## Lo que NO hay que hacer con esta opinión

⚠️ **No perseguir «el feed en vivo» para Swing.** Es una app de velas diarias a
propósito; el tiempo real es el trabajo de Intradía. Su tercera crítica **ya
tiene respuesta y se llama la app hermana**.

📌 Y el origen del malentendido está en la propia petición: Néstor le pidió
señales **de 15 minutos** sacadas de capturas de **Swing**. Esa mezcla es justo
la que el propio reviewer acabó detectando con el caso del yen. **Al enseñar las
apps hay que decir siempre cuál es cuál** — la misma regla del 2026-07-30.

---

# El cruce de riesgo entre las señales del MISMO día (2026-09-15)

`app/src/components/RiesgoSenales.jsx` · `riesgoEntreSenales` en
`correlacion.js` · bloques 8-10 de `prueba-correlacion.mjs`.

**Solo Swing.** Todos los archivos que toca son PRIMOS y la correlación no
existe en Intradía, así que no hay cambio emparejado: una rama, un PR.

Es el único hueco real que señaló la opinión externa del 2026-09-15, y el dato
**ya estaba calculado y publicado** en `barrido.json` desde el 2026-09-08. La
app lo tenía y no se lo ponía delante a nadie.

## ⚠️ LA DIRECCIÓN ES LA MITAD DEL ASUNTO, y es lo que lo hace distinto

La tarjeta de correlación que ya existía **no podía contestar esta pregunta**,
y no por estar plegada: porque **no sabe hacia dónde señala la app**. Con la
misma correlación, el lado le da la vuelta al resultado:

| correlación | los dos lados | qué pasa de verdad |
|---|---|---|
| +0,9 | los dos COMPRA | una apuesta del **DOBLE** de tamaño |
| +0,9 | uno de cada | **se ANULAN**: dos spreads para nada |
| −0,9 | los dos COMPRA | se ANULAN |
| −0,9 | uno de cada | una apuesta del DOBLE |

O sea que «EUR/USD y USD/CHF van a −0,88» es verdad y **no dice nada útil** sin
el lado delante. `efectivo = lados iguales ? r : −r` y ya responde.

Con las correlaciones REALES del barrido de producción y cuatro señales
plausibles salen justo los dos casos:

```
GBP/JPY COMPRA · USD/JPY COMPRA → +0,92  MISMA APUESTA (dobla)
EUR/USD COMPRA · USD/CHF COMPRA → −0,88  SE ANULAN
```

El primero es **exactamente el conflicto que el revisor externo detectó a
mano** y por el que pidió esto.

## Las decisiones que no hay que ablandar

⚠️ **ES INFORMACIÓN, NO UN FILTRO.** No apaga ninguna señal, no las reordena y
no las puntúa. Apagar señales por correlación cambiaría lo que la app propone y
tendría que pasar por el banco de pruebas con su listón escrito antes, como el
COT. Octava familia que tendría que medirse; ésta ni se intenta.

⚠️ **SOLO CRUZA LAS SEÑALES DE LA APP** (`setups`), nunca las de la sombra.
Las de sombra no se proponen, así que decir «estas dos van juntas» de dos
operaciones que nadie va a abrir sería ruido con pinta de aviso.

⚠️ **SIN NADA QUE DECIR NO SE PINTA NADA.** Lo normal es que no haya conflicto
—el día que se construyó, las 2 señales reales no se parecían y la tarjeta no
salía—, así que una tarjeta permanente diciendo «hoy todo bien» se volvería
decorado y dejaría de leerse justo el día que sí tenga algo. **Que aparezca es
la señal.**

⚠️ **`null` se salta, no se trata como 0.** Un par sin dato en la matriz es «no
se pudo calcular», no «no se parecen». Tiene comprobación propia.

⚠️ **VA ANTES DE LA LISTA DE SEÑALES, no después.** Sirve para decidir cuáles
abrir; leído al final llega cuando la decisión ya está tomada. Mismo criterio
que la actividad y las tasas.

⚠️ **El número no se pinta de verde ni de rojo.** Doblar el riesgo y pagar dos
spreads para nada son los dos malos de maneras distintas; el color afirmaría
que uno es bueno. Misma decisión que en `Correlacion.jsx`.

## Comprobado que las pruebas MUERDEN

Quitar la vuelta del signo (`efectivo = r` en vez de `lados iguales ? r : −r`)
tumba **5 comprobaciones**, con el daño verificado en el archivo antes de darlo
por bueno.

📌 **Y de paso, un tropiezo mío que conviene tener escrito:** la primera vez
conté los fallos con `grep -c "FALLA"` y salió 1, cuando el marcador de este
guion es `MAL` y los fallos eran 5. **Casi doy por floja una prueba que muerde
fuerte, por buscar la palabra equivocada.** Es hermano del `grep borrar` que el
2026-09-14 me hizo decir que el botón de borrar no existía.

---

# Dos textos que llevaban meses diciendo un número que no era (2026-09-15)

Los dos salieron tirando del hilo de la captura de Néstor, no buscándolos.

## 1. `medicion.queSignifica` decía «la app acierta el 55 %»

Escrito a mano, en los 13 idiomas. Los valores reales de `medicion.js` son
**56** (la app) y **48** (la vara neutra): **ninguno de los dos es 55** — el 55
es el de la reversión, otra fila. Se quedó viejo el **2026-09-05**, al aflojar
`TENDENCIA_MIN`, y nadie lo notó porque nada falla.

Es **exactamente** el caso de las etiquetas «(hoy)» del banco de pruebas, del
2026-09-05, y el arreglo es el mismo: **pasa a ser función y LEE el valor**
(`({ acierto }) => …`). Cambiar la medición mueve la frase sola.

📌 La regla ya estaba escrita en este archivo —«al cambiar un umbral, mirar
también quién lo NOMBRA»— y aun así el mismo día que se cambió el umbral se
dejó atrás este texto. **La lección sola no basta; lo que funciona es que el
texto lea el número.**

## 2. El adelanto de las mediciones, que estaba escondido

«¿Y a largo plazo? Lo que medimos sobre 5 años» era un botón plegado con una
flechita `▸` de 12 px en gris. Un operador externo que revisó la app con lupa
**ni supo que se podía abrir** — pidió que «ojalá tuviera profundidad» cuando
ya la tenía.

Ahora, con la tarjeta cerrada, se lee el número: «Acierta el 56 % de las veces
y aun así pierde 0.03 por cada dólar arriesgado». **Es el mejor argumento que
tiene la app** —enseñar el propio número siendo malo— y estaba detrás de un
título que parecía un encabezado más.

⚠️ **El valor va SIN SIGNO y la frase solo sale si se pierde.** Con el signo
daba «pierde −0.03», un doble negativo que se lee como lo contrario. Y si algún
día midiera positivo, la frase sería falsa, así que entonces **no se pinta**:
equivocarse hacia «falta un adelanto» cuesta un adelanto; hacia «se afirma que
pierde cuando gana» cuesta la credibilidad, que es lo único que este proyecto
vende. Misma asimetría que `esSombra` y `yaCorrioHoy`.

📌 **Lo del doble negativo NO lo ve un build ni un lint.** Salió mirando la
captura del navegador, que es la enésima vez que esa costumbre paga.

## Y la Calculadora no estaba escondida

Es una **pestaña entera del menú de abajo**, llamada «Riesgo». El revisor no la
vio porque **nunca tuvo la app**: trabajó con capturas. No había nada que
arreglar ahí, y decirlo importa tanto como arreglar lo que sí estaba mal.

---

# Que los botones parezcan botones, y que cada herramienta diga su nombre (2026-09-15)

Cambio **emparejado**, misma rama en los dos repositorios.
`src/components/TarjetaPlegable.jsx` es **GEMELO nuevo (56)**.

Néstor lo pidió con estas palabras: **«quiero que todas las pestañas o botones
que tenemos en las app se distingan y te llamen o atraigan a oprimirlos, que se
vean a simple vista que hay que tocarlos»**, y **«que todas estas herramientas
lleven los nombres tal cual como se conocen en el trading, con abreviatura y
nombre completo, pero también con lo que las describen»**.

## ⚠️ «¿DÓNDE ESTÁ EL CALENDARIO?» — la pregunta que destapó lo de fondo

La hizo a mitad del trabajo y **no era una pregunta de nombres**: el calendario
estaba en el **tablero completo**, detrás de «Ver tablero completo →», mientras
el spread, las tasas y el COT vivían en la pestaña Barrido. Las herramientas de
información estaban repartidas en dos pantallas sin que nada lo dijera.

**El dueño de la app no lo encontraba. Nadie más iba a encontrarlo.**

Y es justo el que peor aguanta estar escondido: **es el único que caduca en
horas**. Comprobado ese día contra el archivo real de producción —13 eventos en
las próximas 48 h, con la Fed entre ellos—. Un aviso de la Fed que hay que ir a
buscar dos pantallas más adentro no es un aviso.

**Movido a la pestaña Barrido en las DOS apps**, arriba de las otras tres:
aquéllas dicen lo que cuesta la operación y no cambian de aquí a mañana; ésta
dice a qué hora conviene no estar dentro. En Intradía pesa todavía más — una
operación empieza y termina dentro de esas horas.

📌 **La lección: «no lo encuentro» casi nunca es un problema de nombre.**
Se estaba puliendo el rótulo de una tarjeta que estaba en otra pantalla.

## El problema medido, antes de tocar nada

**Ocho tarjetas plegables, ocho cabeceras copiadas**, todas terminadas en una
flechita de 12 px en `--text-muted`. Un triángulo del color del texto apagado,
en la esquina, **no dice «tócame»: dice «adorno»**. Un operador externo que
revisó la app con lupa ni supo que la de mediciones se podía abrir.

⚠️ **EL ARREGLO NO ES «HACER LA FLECHA MÁS GRANDE». Es que haya una PALABRA:**
«Ver» / «Cerrar» dentro de una pastilla con borde y fondo. Un glifo hay que
interpretarlo; una palabra dentro de un recuadro es un botón en cualquier idioma
y a cualquier edad. La flecha se queda al lado porque confirma la dirección,
pero ya no carga sola con el mensaje.

## Los tres renglones, y por qué son tres

```
COT · Commitments of Traders          ← sigla + nombre de trading
Lo que tienen comprado los grandes    ← qué es, en una línea
                          [ Ver ▾ ]   ← que se puede abrir
```

⚠️ **LA DESCRIPCIÓN SE VE CON LA TARJETA CERRADA, y eso es lo que de verdad
cambia.** Antes, para saber qué era el COT había que abrirlo — y quien no
supiera qué son esas tres letras no tenía ningún motivo para tocarlas. Ahora el
motivo está fuera.

📌 **La transformación fue elegante y por eso no se perdió calidad:** el título
de hoy («Lo que tienen comprado los grandes») **describe bien y no es el nombre
de nada**, así que BAJÓ a ser la descripción —ya traducido a los 13— y arriba
entró el nombre real. Solo hubo que traducir los nombres nuevos.

| | sigla | nombre | qué era antes (hoy es la descripción) |
|---|---|---|---|
| COT | **COT** | Commitments of Traders | Lo que tienen comprado los grandes |
| correlación | — | Correlación entre pares (n) | Pares que se mueven casi igual |
| calendario | — | Calendario económico (n) | Noticias que pueden mover el precio |
| tasas | — | Tasas de interés y swap | Lo que cuesta mantenerla abierta |
| glosario | — | Glosario | ¿Qué significan estos términos? |
| mediciones | **BACKTEST** | Prueba sobre 5 años de mercado real | ¿Y a largo plazo? Lo que medimos sobre 5 años |

⚠️ **«Commitments of Traders» NO se traduce en ninguno de los 13**, igual que
RSI o ATR: es el nombre propio del informe oficial de la CFTC y así se llama en
todas partes. Traducirlo rompería el enlace con cualquier otra fuente que Néstor
mire. La sigla va en `mono` y con `dir="ltr"` fijo — es jerga invariante y en
árabe se dibujaría al revés.

📌 **«BACKTEST» era el que peor estaba.** Su título era una PREGUNTA («¿Y a
largo plazo?»), no el nombre de nada. Quien opera conoce esa palabra y le dice
de una vez qué es; la pregunta no se lo decía.

## Lo del botón de 5 años, que Néstor dijo que seguía confuso

Tenía razón: eran **dos textos sueltos** (título y adelanto) sin nada que dijera
que aquello se abría. Ahora son cuatro cosas ordenadas —sigla, nombre,
descripción, adelanto— con la pastilla al lado. Y se quitó la coletilla **«Toca
para ver cómo se midió»** de los 13 idiomas: **eso ya lo dice la pastilla**, en
su idioma y dentro de un recuadro. Repetirlo era ruido justo donde se pedía
claridad.

## ⚠️⚠️ EL GUION DIO «✓» MIENTRAS BORRABA CONTENIDO

Las ocho cabeceras se sustituyeron con un guion que exigía encontrar sus anclas
exactamente una vez. En el **Calendario** dijo `✓` y **se llevó por delante dos
cosas**: el número de eventos del título y el **aviso de noticia urgente que se
veía sin abrir**.

**Comprobó que sus anclas coincidían, no que no se perdiera nada** — y las siete
cabeceras iguales hicieron creer que la octava también lo era. Lo cazó el
linter, avisando de que la variable `horas` se había quedado sin usar.

📌 **La regla que sale de aquí: un guion de reemplazo masivo tiene que decir qué
CONTENIDO había dentro de lo que borra, no solo si encontró el sitio.** En los
dos archivos siguientes (`Diagnostico`, `ImportarBroker`) el guion imprimió los
`<span>` de contenido que encontraba **antes de escribir**, y por eso se supo
que ahí no se perdía nada.

El aviso urgente volvió, y mejor: ahora vive en la ranura `avance` de la tarjeta
compartida, que existe precisamente para lo que hay que ver **sin abrir**.

## Y el pie del Historial, portado a Intradía

Quedaba pendiente desde el 2026-09-15 por la mañana. Allí el resolver tiene
**exactamente el mismo agujero** (`pips: ganada ? pipBeneficio : −pipRiesgo`,
sin spread ni swap), pero el texto es PROPIO y dice una cosa más:

⚠️ **En Intradía eso pesa MÁS, y con la causa medida:** el stop típico es de ~30
pips contra los ~120 de Swing, así que los mismos 2 pips de spread son el **7 %
del riesgo en vez del 1,8 %**. `HistorialTab.jsx` es PRIMO justo por esto.

## Cómo se verificó

Lint, build y **todas** las pruebas sin internet en los dos repos. Los gemelos
pasan de 55 a **56**.

Y en **Chromium a 390 px**, componente aislado, con el `calendario.json` y el
historial **reales de producción**, en español y en árabe:

| qué se comprobó | resultado |
|---|---|
| las cuatro cabeceras | sigla + nombre + descripción + pastilla «Ver ▾» |
| el aviso urgente del calendario | **«GBP: dato importante en 7 h»**, visible sin abrir |
| **árabe** | todo reflejado, pastilla a la izquierda, y `BACKTEST` en `ltr` — comprobado con el CSS calculado |
| hojas de datos en `rtl` | **0** en los dos idiomas |
| desplazamiento lateral | ninguno |
| errores de consola | ninguno |

---

# Cada herramienta dice ahora PARA QUÉ SIRVE (2026-09-16)

Néstor volvió sobre lo mismo y con razón, porque de tres cosas que había
pedido el día anterior solo se le habían entregado dos:

> «en intradía no veo nada todavía y también noto que los botones tienen el
> mismo triángulo invertido gris… quiero que todos esos botones tengan sus
> nombres reales acompañados de sus siglas si las tienen, y agregado a eso lo
> que es o lo que significa, y **adentro para qué sirve o para qué lo utilizan
> los traders**, en una explicación abreviada pero con un mensaje claro,
> preciso y conciso.»

## ⚠️ Lo primero: no veía nada porque NO SE HABÍA FUSIONADO NADA

Las dos observaciones tenían **una sola causa**, y no era caché ni service
worker. Los PR #84 (Swing) y #60 (Intradía) se quedaron en borrador el día
anterior —la API de GitHub cortó por límite de peticiones en el último paso— y
nadie los fusionó. **Las dos apps publicadas seguían siendo las de antes**, con
la flechita gris de 12 px y sin el calendario en la pestaña Barrido.

Comprobado antes de contestar, no deducido: `grep` de los triángulos sueltos en
los dos repos da **cero** —las ocho tarjetas ya usan `TarjetaPlegable`— y el
`git log` de `main` no tenía los commits. Fusionados los dos y sigue lo demás.

📌 **Y la lección no es «acordarse de fusionar»:** un trabajo verificado en
navegador, con todas las pruebas en verde, **vale exactamente cero hasta que
está en `main`**. Néstor no ve ramas: ve la app publicada.

## Lo que faltaba de verdad: la cuarta cosa

De las cuatro que pidió, se habían hecho tres —sigla, nombre real y descripción
de qué es— y **faltaba la que más le importaba**: para qué se usa. La
diferencia no es matiz:

| | ejemplo |
|---|---|
| QUÉ ES (ya estaba, fuera) | «Lo que tienen comprado los grandes» |
| **PARA QUÉ SIRVE** (nuevo, dentro) | «para saber si una apuesta ya está muy llena: cuando casi todos los grandes están del mismo lado, queda poca gente por entrar y mucha por salir» |

Con lo primero la herramienta se entiende y no se sabe qué hacer con ella.

`TarjetaPlegable` gana la ranura `paraQue`, que se pinta **lo primero al
abrir**, con su rótulo y una raya al costado. Ocho tarjetas en Swing
(calendario, tasas, COT, correlación, glosario, BACKTEST, tus números,
importar) y cinco en Intradía, en los **13 idiomas** de cada app.

## ⚠️ Las decisiones que no hay que ablandar

⚠️ **NINGUNA LLEVA DIRECCIÓN.** Al redactar un «para qué sirve» la frase se
quiere terminar sola en consejo («…así sabes cuándo comprar»), y eso convierte
en FILTRO lo que es información — la línea que este proyecto no cruza sin pasar
por el banco de pruebas. Por eso varias acaban diciendo lo que NO dicen: el
calendario «no dice hacia dónde se va a mover, solo cuándo va a haber
sacudida»; el COT «no dice qué par operar ni cuándo».

⚠️ **VA ANTES DEL AVISO ROJO, y eso NO rompe la regla** de «el aviso va antes
de ningún número»: esto no es un número. El orden queda **para qué sirve →
aviso → datos**, y está comprobado en el navegador (`esPrimero`).

⚠️ **LA PASTILLA PASÓ AL VERDE DE LA APP.** La primera versión la pintaba en
`--text-secondary` sobre `--bg-input`: **gris sobre gris**, o sea del color de
lo que no se toca — exactamente de lo que Néstor se quejaba, aunque ya llevara
la palabra dentro. El verde es el acento de la marca y aquí **no afirma nada
sobre ningún dato**: es un control, no un valor. Es el matiz de la regla
«antes de pintar algo de color, preguntarse qué afirma ese color» — **un botón
solo afirma que es un botón**.

## La comprobación que lo vigila, y muerde

`prueba-idiomas.mjs`, bloque nuevo (GEMELO, en las dos apps). **No lee una
lista escrita a mano**: abre todos los `.jsx`, se queda con los que usan
`TarjetaPlegable` y exige que cada uno pase un `paraQue` **y que la clave que
nombra exista en `es.js`**.

Vigila los dos fallos silenciosos de esta pantalla:
- **la tarjeta novena que nadie explique** — no falla nada, solo sale sin el
  bloque y nadie se entera;
- **un `t('x.paraQue')` que no exista** — un `t()` sin clave **no da error:
  sale en blanco**.

Más una guarda para que no se adapte a lo que encuentre: si algún día se
renombra el componente, el bucle no entraría nunca y quedaría en verde sin
haber mirado ni una tarjeta.

**Comprobado que muerde, con el daño verificado en su sitio antes de darlo por
bueno** (lección del 2026-09-03): quitarle el `paraQue` al COT falla 1;
apuntarlo a una clave inventada falla 1.

## Cómo se verificó

Lint, build y **todas** las pruebas sin internet en los dos repos (24 y 19).
Los 56 gemelos siguen idénticos.

Y en **Chromium a 390 px**, banco aislado (las tarjetas están detrás de
Firebase), en español y en árabe, con tres tarjetas distintas a la vez:

| qué se comprobó | resultado |
|---|---|
| las tres pastillas | palabra + flecha, en `oklch(0.78 0.13 155)` — el verde, no gris |
| el bloque nuevo | rótulo traducido y 152-253 caracteres de texto en los dos idiomas |
| su posición | **el primero** dentro de la tarjeta, antes del aviso |
| el aviso urgente del calendario | «USD: dato importante en 6 h» sin abrir, y su versión árabe |
| **árabe** | pastilla a la izquierda, la raya del bloque volteada, **12 hojas de datos y 0 en `rtl`** |
| desplazamiento lateral | ninguno |
| errores de la app | ninguno |

📌 **Y dos tropiezos MÍOS del banco de pruebas, no de la app** — que es la
cuarta vez que pasa y por eso se escribe: los datos de mentira tenían la forma
equivocada (`Calendario` recibe el calendario, no el envoltorio del hook; el
campo del Diario es `pl`, no `resultado`), así que dos de las tres tarjetas no
se pintaban y parecía un fallo. Y una comprobación mía exigía «en 7 h» cuando
el texto dice 6, porque `horasHasta` redondea hacia abajo. **Antes de creerse
que la app está rota, comprobar que el banco de pruebas mide lo que dice
medir.**
