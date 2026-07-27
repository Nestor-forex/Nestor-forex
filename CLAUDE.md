# Nestor Forex Swing — memoria del proyecto

App móvil de trading Forex para Néstor (administrador) y miembros invitados.
Barrido diario del mercado, diario de operaciones y calculadora de riesgo.
Ver `README.md` para el handoff de diseño original y `app/README.md` para
el README genérico de Vite.

**Renombrada de "Nestor Forex" a "Nestor Forex Swing" (2026-07-26)** para
distinguirla de su app hermana **Nestor Forex Intradía**
(`nestor-forex/nestor-forex-intradia`, repositorio separado): esta es la
de trading de posición (horas a días, datos del BCE una vez al día), la
otra es para intradía (velas de 1 hora, precio en vivo). Mismo cambio de
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
  con datos en vivo desde `api.frankfurter.dev` vía `useMarketData.js`.
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
    lib/
      firebase.js              # init de Firebase desde import.meta.env
      useAuthUser.js           # sesión + perfil Firestore en vivo, registrar/ingresar/salir
      useMembers.js            # listado en vivo de users/ para el admin
      useTrades.js             # diario de operaciones en users/{uid}/trades
      useMarketData.js         # fetch + caché diaria del barrido (Frankfurter)
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

No pude crear "Variables"/"Secrets" del repo desde este entorno (el proxy de
red de la sesión bloquea esos endpoints de la API de GitHub Actions) — por
eso la config de Firebase quedó commiteada directo en `.env.production` en
vez de inyectarse por CI.

## Limitaciones conocidas (a propósito, documentadas en la UI)
- Datos del barrido: tasas de referencia del BCE, **un cierre por día**
  (vía Frankfurter). No hay intradía, no hay spread/volumen real de bróker.
  RSI/ATR se calculan sobre esos cierres diarios.
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

Otras ideas mencionadas pero no elegidas todavía (no implementar sin
confirmar primero): historial/backtest de los setups sugeridos,
notificación por correo al admin ante solicitudes nuevas (necesitaría
Cloud Functions — costo/infra nueva a evaluar).
7. Explicaciones inline de términos (RSI, EMA, ATR) para quien no sabe de
   trading — tooltips o un glosario corto.
8. Dominio propio en vez de `nestor-forex.github.io`.

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
| Fuente de precios | BCE (Frankfurter), 1 cierre oficial al día | Twelve Data, velas de 1 hora |
| Tendencia | EMA20 / EMA50 | EMA9 / EMA21 (más rápidas) |
| RSI / ATR | Sobre cierres diarios | Sobre velas de 1 hora |
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

## Convenciones de trabajo en este repo
- Rama de trabajo: `claude/forex-barrido-diario-app-ws3bbu`. Si ya se
  fusionó su PR, reiniciarla desde `main` antes de seguir (no apilar commits
  nuevos sobre historial ya fusionado).
- El usuario (Néstor) **no sabe programar** — cada explicación debe ser en
  términos simples, sin jerga, y cada paso que requiera clics en GitHub o
  Firebase debe darse número por número, indicando exactamente dónde hacer
  clic. Confirmar antes de fusionar PRs o tocar configuración compartida.
- Antes de cada fase/tarea grande, avisar qué se va a hacer y esperar
  confirmación (así se ha trabajado hasta ahora).
