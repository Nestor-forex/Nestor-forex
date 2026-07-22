# Handoff: Nestor Forex — App con acceso real por internet

## Overview
App móvil de trading Forex para un solo administrador (Néstor) y miembros invitados. Funciones: portada de marca, inscripción de miembros con aprobación del administrador, barrido diario del mercado Forex (fuerza relativa de divisas y sesgo por par), diario de operaciones y calculadora de lote/riesgo.

**Objetivo de este handoff:** convertir el prototipo (que guarda todo en localStorage del dispositivo) en una app real con backend, donde:
1. Cualquiera se inscribe desde su teléfono y la solicitud llega al administrador.
2. El administrador aprueba o retira miembros desde SU teléfono y el cambio aplica al instante para todos.
3. Solo miembros aprobados ven el contenido (barrido, diario, calculadora).
4. La app queda publicada en una URL pública, instalable como PWA ("Agregar a pantalla de inicio").

## About the Design Files
Los archivos incluidos son **referencias de diseño hechas en HTML** (prototipo funcional con datos locales), NO código de producción para copiar tal cual. La tarea es **recrear estas pantallas** en el stack elegido, respetando el diseño, y añadir el backend de autenticación/aprobación.

- `Nestor Forex.dc.html` — prototipo completo (todas las pantallas y la lógica de cálculo). El JS dentro del archivo contiene los algoritmos EXACTOS de fuerza relativa, RSI, EMA, clasificación de sesgo y valor de pip: **portar esos cálculos tal cual**.
- `Barrido Forex Diario.dc.html` — versión de escritorio del barrido completo (setups con entrada/SL/TP, reporte .md descargable). Opcional: integrarla como vista "tablero completo".

## Fidelity
**High-fidelity.** Colores, tipografía, espaciados y copys son finales. Recrear pixel-perfect.

## Stack sugerido (usuario no técnico — priorizar lo simple)
- **Frontend:** React + Vite, PWA (manifest + service worker) para que sea instalable.
- **Backend/Auth/DB:** **Firebase** (Auth con email+clave, Firestore para usuarios/operaciones, Hosting para publicar) o Supabase. Todo tiene capa gratuita suficiente.
- **Regla de seguridad clave:** el estado de cada usuario vive en Firestore (`users/{uid}: {nombre, email, estado: 'pendiente'|'aprobado'}`). Reglas de Firestore: el contenido solo es legible si `estado == 'aprobado'`; solo el UID del administrador puede escribir el campo `estado` de otros. Retirar = borrar el doc o poner estado 'retirado' → el cliente escucha en tiempo real y cierra la sesión.
- **Admin:** el administrador es un usuario normal cuyo UID está en la configuración (custom claim o lista en Firestore). Nada de PIN en producción — el PIN del prototipo era un placeholder.

## Screens / Views

### 1. Portada (splash)
- Fondo oscuro `oklch(0.13 0.015 255)` con gráfico de velas decorativo semitransparente (verde `oklch(0.62 0.11 155)` / rojo `oklch(0.55 0.11 25)`) y degradado vertical que oscurece hacia abajo.
- Eyebrow: "TRADING · FX" — IBM Plex Mono 12px, letter-spacing 0.3em, color `oklch(0.72 0.13 155)`.
- Título: "NESTOR FOREX" — IBM Plex Sans 700, 44px.
- Subtítulo 15px `oklch(0.7 0.02 255)`: "Barrido diario del mercado, diario de operaciones y gestión de riesgo. Acceso solo para miembros autorizados."
- Botón "Entrar": alto 52px, radio 8px, fondo `oklch(0.72 0.13 155)`, texto oscuro 700.

### 2. Acceso (Ingresar / Inscribirse)
- Dos tabs tipo botón. Login: correo + clave. Registro: nombre completo + correo + clave, botón "Enviar solicitud", nota "Tu solicitud queda pendiente hasta que Néstor la autorice."
- Inputs: alto 48px, radio 8px, fondo `oklch(0.2 0.015 255)`, borde `oklch(0.32 0.02 255)`.
- Mensajes de estado en caja ámbar `oklch(0.75 0.13 85)`.
- **En producción:** tras registrarse, el usuario ve una pantalla "Solicitud pendiente" en vivo (listener de Firestore); al aprobarse, entra automáticamente.

### 3. Barrido (tab por defecto)
- Header sticky con nombre de la app + saludo + botón "Salir".
- Barras de fuerza relativa por divisa (0–10): grid `42px 1fr 40px`, barra 9px de alto, verde ≥6.5, rojo ≤3.5, gris intermedio.
- Lista de pares: tarjetas radio 8, grid `86px 70px 1fr auto` con par, sesgo (COMPRA verde / VENTA rojo / VIGILAR ámbar / — gris), tendencia y RSI.
- Pie: "Tasas de referencia BCE, un cierre por día. Análisis educativo, no asesoría financiera."

### 4. Diario de operaciones
- 3 stats arriba (Operaciones, % ganadas, P/L USD con color según signo).
- Formulario: par (select 14 pares), dirección Compra/Venta, lote, resultado USD ±, notas. Botón verde "Guardar operación".
- Lista de operaciones con botón ✕ para borrar (mín 44×44px).
- **En producción:** las operaciones se guardan por usuario en Firestore (`users/{uid}/trades`), sincronizadas entre dispositivos.

### 5. Calculadora de riesgo
- Inputs: capital USD, riesgo % (paso 0.5), stop en pips, par.
- Resultado en caja borde verde: Riesgo USD, Valor del pip, **Lote sugerido** (18px 700 verde), equivalencia mini/micro.
- Cálculo: riesgo = capital × %/100; lote = riesgo / (pips × valorPipUSD). Valor pip por lote estándar: 10 si cotiza en USD; si no, (1000 si JPY, 10 si no) / tasa USD→divisaCotizada.

### 6. Miembros (solo admin)
- Lista: nombre, correo, estado (aprobado verde / pendiente ámbar), botones "Aprobar" (verde sólido) y "Retirar" (borde rojo, confirmación antes de ejecutar).
- **En producción:** lista en tiempo real desde Firestore; idealmente notificación push o email al admin cuando llega una solicitud.

### Navegación inferior
Fija abajo, máx 430px de ancho, 4 tabs (Barrido ▦, Diario ≡, Riesgo %, Miembros ⚙ solo admin), alto 60px + safe-area-inset-bottom, activo verde / inactivo gris.

## Datos del barrido (portar tal cual del prototipo)
- Fuente: `https://api.frankfurter.dev/v1/{fecha-220d}..?base=USD&symbols=EUR,GBP,JPY,CHF,AUD,NZD,CAD` (tasas BCE, gratis, sin API key, CORS abierto).
- Fuerza por divisa: promedio sobre las otras 7 de (0.2·cambio%1d + 0.4·cambio%5d + 0.4·cambio%20d), reescalado min-max a 0–10.
- Tendencia: Alcista si cierre > EMA20 > EMA50; Bajista si cierre < EMA20 < EMA50; si no, Rango.
- RSI 14 (Wilder) sobre últimos 60 cierres.
- Sesgo: COMPRA si dif fuerza > +0.5 y Alcista; VENTA si < −0.5 y Bajista; VIGILAR si |dif| > 0.5 sin tendencia; — en el resto.
- 14 pares: EUR/USD, GBP/USD, USD/JPY, USD/CHF, USD/CAD, AUD/USD, NZD/USD, EUR/CHF, EUR/CAD, EUR/NZD, GBP/CAD, GBP/JPY, NZD/CHF, NZD/CAD.
- Cachear la respuesta del día (los datos cambian una vez al día ~16:00 CET).

## State Management
- Sesión: Firebase Auth (persistente).
- Perfil/estado del usuario: listener en tiempo real → si estado deja de ser 'aprobado', expulsar a la pantalla de acceso.
- Trades: colección por usuario, offline-first (Firestore ya lo da).
- Barrido: fetch al abrir + caché diaria en localStorage.

## Design Tokens
- Fondo página: `oklch(0.13 0.015 255)` · superficie: `oklch(0.16 0.015 255)` · tarjeta: `oklch(0.185 0.015 255)` · input: `oklch(0.2 0.015 255)`
- Bordes: `oklch(0.26–0.32 0.02 255)`
- Texto: `oklch(0.93 0.005 255)` · secundario: `oklch(0.7 0.02 255)` · atenuado: `oklch(0.6 0.02 255)`
- Verde (acción/alcista): `oklch(0.72 0.13 155)` · Rojo (bajista): `oklch(0.66 0.13 25)` · Ámbar (pendiente/vigilar): `oklch(0.75 0.13 85)`
- Fuentes: IBM Plex Sans (UI) e IBM Plex Mono (números, tickers) — Google Fonts.
- Radios: 8px (controles), 10px (tarjetas grandes). Alturas táctiles mínimas 44px.
- Layout móvil: columna central máx 430px.

## Assets
Sin imágenes externas: el fondo de velas de la portada es decorativo generado por código (divs). Fuentes de Google Fonts.

## Files
- `Nestor Forex.dc.html` — prototipo completo de la app móvil.
- `Barrido Forex Diario.dc.html` — tablero de escritorio del barrido (setups + reporte .md).

## Plan sugerido de implementación (para pedírselo a Claude Code por fases)
1. Scaffold React+Vite+PWA con las 6 pantallas y datos falsos.
2. Portar los cálculos del barrido y la calculadora desde el prototipo.
3. Conectar Firebase Auth + Firestore con las reglas de seguridad descritas.
4. Flujo de aprobación en tiempo real + pantalla "pendiente".
5. Deploy en Firebase Hosting y prueba en dos teléfonos.
