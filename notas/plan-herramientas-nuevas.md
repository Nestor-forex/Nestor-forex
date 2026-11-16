# Plan de las herramientas nuevas (2026-11-16)

Néstor pegó una conversación con otra IA (análisis de competencia, precios y
mejoras) y pidió: *«todas y cada una de las recomendaciones, sugerencias y
aportes las quiero sí o sí en mis apps»*. Este archivo es la lista, con lo que ya
existe, lo que falta, y lo que hay que decidir antes. **Es la fuente para retomar
el trabajo en cualquier sesión**: se actualiza al terminar cada pieza.

Estado: ⬜ por hacer · 🟨 en obra · ✅ hecho · ❓ falta una decisión de Néstor

## Lo que hay que construir

| # | qué | app | estado | depende de |
|---|---|---|---|---|
| 1 | **Arranque guiado con «Mis pares»**: al entrar la primera vez, preguntar qué opera y proponer pares con un toque, sin pantalla vacía | las dos | ✅ (PR, 2026-11-16) | nada |
| 2 | **Avisos inteligentes por contexto**: noticia de impacto alto para una divisa de tus pares en los próximos ~15-30 min; dos pares de tu lista muy correlacionados (Swing); spread de un par tuyo muy por encima de lo normal | las dos (la correlación solo Swing) | ✅ (PR, 2026-11-16) | nada |
| 3 | **Planes por app** (Swing, Intradía, Combo) y **pago anticipado con 2 semanas de regalo** | las dos | ❓ | precios y decisión de Néstor; ver abajo |
| 4 | **Insignias de disciplina y aprendizaje** (gamificación ética): premiar usar el stop, respetar el freno del día, completar lecciones; **nunca** premiar ganancias | las dos | ✅ (PR, 2026-11-16; las de lecciones y práctica, cuando existan) | nada (las de lecciones, del curso) |
| 5 | **Modo práctica** (paper trading ligero): anotar operaciones de práctica que la app sigue con precios reales y resuelve sola, separadas del Diario real | las dos | ⬜ | nada |
| 6 | **«Qué es y qué no es» obligatorio antes del primer uso de la IA** | las dos | ⬜ | Qwen (fase 5) |
| 7 | **Página web de presentación + tutorial básico** con capturas reales | aparte | ⬜ | precios (3) para la sección de planes |
| 8 | **Curso detallado** para principiantes: teoría, ejemplos, fórmulas y ejercicios en demo, enlazado con las insignias y el modo práctica | aparte | ⬜ | 4 y 5 para los ejercicios |
| 9 | **Muro de análisis de la comunidad** (moderado) | las dos | ❓ | decidir quién modera y las reglas; ver abajo |
| 10 | **Diario: revisar cierres parciales y moneda de la cuenta** en la importación | las dos | ⬜ | un informe real con cierres parciales |
| 11 | **Vista ancha a voluntad** en PC, laptop y tableta (y el celular en horizontal): hoy la app es una columna de 430 px centrada aunque la pantalla sea ancha. Un botón para elegir vista estrecha o ancha | las dos | ⬜ | nada |

## Lo que la otra conversación dio por hecho y NO existe todavía

- **La IA (Qwen)**: está diseñada (`puente-qwen/worker.js`) pero no instalada. Falta
  la cuenta nueva de Alibaba (cierre hasta el 2026-11-20).
- **La página web, el tutorial y el curso**: no existen. Hay material de base en
  `notas/guia-herramientas-suscriptores.md` y las explicaciones para suscriptores de
  `CLAUDE.md`.

## ⚠️ Lo que hay que decirle a Néstor antes de construir

1. **Dos instrucciones de la IA contradicen lo que se le dijo a la otra IA** («nunca
   da veredictos ni sugiere»): el Prompt 3 pide una «puntuación de convicción del 1
   al 10» y el Prompt 4 un veredicto «APROBADO / RECHAZADO». Se dejaron así a
   propósito para MEDIRLOS mientras las apps no sean públicas
   (`notas/qwen-conversacion.md`). Antes de abrir al público hay que decidir si se
   quedan, porque son justo lo que un regulador leería como recomendación.
2. **La medición diaria de Qwen** (analiza todos los pares por su cuenta, a la vista)
   choca con «jamás hace análisis por sí sola». Es un experimento, rotulado como
   tal, pero conviene decirlo igual de claro en la página web.
3. **Los números de la otra conversación son de blogs, no verificados**: retención 3×
   con watchlist, eToro 2×, −41 % desinstalaciones, conversión 30-50 %. Sirven para
   orientarse; **no se publican en la página web como hechos**.
4. **Su dato de conversión no aplica tal cual al pago anticipado**: el 30-50 % es de
   pruebas GRATIS con tarjeta guardada que se cobra al final. Pagar por adelantado
   con 2 semanas de regalo es otra cosa (un descuento en el primer pago). La idea
   sigue siendo buena; lo que no se puede es prometer ese porcentaje.
5. **Planes por app cambian el candado**: hoy UN solo `venceEl` abre las dos apps
   (comparten la colección `users`). Planes separados piden un vencimiento por app
   (`venceEl_swing`, `venceEl_intradia`), las reglas de Firestore, el robot de
   vencimientos y la pestaña Miembros. Y el cobro automático cada mes solo existe
   con tarjeta (Mercado Pago); Venezuela sigue siendo manual.
6. **El muro de la comunidad es el de más riesgo**: una publicación con «compra
   EUR/USD aquí» es una señal en tu app aunque la escriba otro. Hace falta decidir
   quién modera y qué se permite antes de construirlo; por eso va el último.
7. **Avisos de spread**: el puente de MT5 publica cada 15 min y solo con el PC
   encendido, así que «subió un 50 % en 5 minutos» no se puede; sí «está muy por
   encima de lo normal en la última lectura».

## Precios: lo que propuso la otra conversación (SIN decidir)

| plan | mes | año |
|---|---:|---:|
| Intradía | 19,99 USD | 159 USD |
| Swing | 24,99 USD | 199 USD |
| Combo | 34,99 USD (o 39) | 299 USD (o 349) |

Más «paga 1 mes, recibe 6 semanas». Antes estaba escrito 15 USD/mes con 1 mes gratis
(2026-09) y una opinión externa de 10-20 USD hoy y 30-40 con más historial
(2026-09-15). Sigue pendiente el precio por región (Venezuela, Argentina). **Lo
decide Néstor.**

## Orden acordado con Néstor (2026-11-16)

**Primero, en este orden: 1 → 2 → 4 → 5 → 6 → 9 → 10.** Después, una por una:
**3, 7 y 8**, que para él van casi juntas (planes, página web y curso).

La 11 (vista ancha) la pidió en el mismo mensaje; va junto a la 1, porque las dos
tocan cómo se ve la app al abrirla.

⚠️ La 6 depende de Qwen (cuenta nueva de Alibaba, desde el 2026-11-20) y la 9 de
que Néstor decida quién modera y qué se permite: si se llega a ellas antes, se
salta a la siguiente y se vuelve después.
