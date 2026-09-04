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
