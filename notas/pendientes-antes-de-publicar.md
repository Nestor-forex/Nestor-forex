# Lo que dejamos para el final — NO SE PUBLICA SIN ESTO (2026-11-19)

Néstor lo pidió con estas palabras: *«haz una lista de todo lo que estamos
dejando de último para cuando terminemos lo que estamos haciendo me lo
recuerdes porque las apps no van a salir al público si no tienen esa caja
fuerte activada y tú no lo puedes olvidar»*.

⚠️ **CUÁNDO RECORDÁRSELO:** cada vez que termine una tarea grande y antes de
cualquier paso hacia publicar las apps o la web. Se le recuerda la lista
entera, no solo la caja fuerte.

---

## 1. ⚠️⚠️ LA CAJA FUERTE — OBLIGATORIA ANTES DE PUBLICAR

Decidió **opción C por ahora** (dejarlo como está mientras se construye), y
que **las apps NO salen al público sin la caja fuerte activada**. Cuando
vayamos a activarla, **recordarle las opciones A y B**:

| opción | qué protege | cuánto cuesta |
|---|---|---|
| **A · el curso** | Las lecciones y los videos pasan a un sitio cerrado de Firebase que solo abre quien está aprobado. El texto original queda en un repositorio PRIVADO de GitHub (gratis). Un no suscriptor no puede leer las lecciones aunque mire el código. | 1-2 días de trabajo, casi sin costo |
| **B · todo** | Lo de A, y además los datos de las apps (barrido, señales, historial, calendario, tasas, COT…) solo se leen con sesión de suscriptor aprobado. | varios días de trabajo en las dos apps y un pequeño costo mensual de lecturas en Firebase |

Lo que hay que volver a explicarle en ese momento: **el programa de una app
web siempre se puede ver** desde el navegador (pasa con cualquier app web);
lo que se protege es el CONTENIDO.

## 2. Qwen (la IA) — después del 2026-11-20

- ✅ **Cuenta nueva abierta el 2026-11-20** (la vieja se cerró ese día, con
  correo de confirmación): Cuenta **personal**, país Colombia, mismo correo y
  celular, tarjeta puesta, información fiscal **omitida** (el RUT sigue con la
  dirección vieja).
- ⏳ **Verificación de identidad enviada el 2026-11-20** con la licencia de
  conducir. Alibaba responde en máximo 3 días hábiles, por correo. Hasta que
  la aprueben no se activa Model Studio ni se crean llaves: la vez pasada, sin
  verificar, todo lo de pago daba 403.
- Después: Model Studio en Singapur, Budgets 5 USD al mes (nivel Account),
  mirar si existe Qwen4-Max (nombre y precio), y solo entonces las llaves.
- Dos llaves separadas: `QWEN_KEY` en GitHub (sonda) y otra en Cloudflare
  (puente). Nunca en el chat.
- Lanzar la sonda, elegir el modelo, montar el puente.
- **El botón «Explícamelo con Qwen» en CADA noticia** de los bancos
  centrales, y en el calendario, las tasas y el COT. Nunca compra/vende.
- Analizador con Qwen (fase 5), 5 consultas al día por suscripción.
- Medición de Qwen a la vista, con todos los pares.
- Todo lo que dijo Néstor está en `notas/qwen-conversacion.md`.

## 3. «IA integrada» en la web

Solo como vista previa interna. **La web no se publica con ese sello si Qwen
no está instalada y funcionando.**

## 4. Los módulos gratis del curso

Se discuten **de último**. Recordárselo.

## 5. El curso completo

✅ **Hecho (2026-11-21):** los 13 módulos (0 a 12, 39 lecciones), un video
por lección y por herramienta en CADA app (60 en Swing, 57 en Intradía), y
todos con la voz Studio-B que eligió Néstor. Si se añade una herramienta o una
lección nueva, lleva su video con voz.

Falta:
- El recorrido guiado dentro de la app la primera vez que alguien entra.

## 6. La página web de venta (landing) — va la última

- Cada característica de las DOS apps, descrita una por una, presentadas
  juntas.
- Tutorial con imágenes (base: `notas/guia-herramientas-suscriptores.md`).
- Las 16 explicaciones para suscriptores de `CLAUDE.md`.
- Aviso de riesgo, política de privacidad y condiciones de uso.
- ⚠️ Ningún número de acierto verificado, ninguna promesa de señales,
  nunca el nombre del bróker, cada número con su fecha.
- Precios y forma de pago **confirmados por Néstor**.

## 7. Cobros y suscripciones

- La pregunta a Mercado Pago (persona natural en Colombia cobrando a México,
  Argentina, Chile y Perú) y las otras dos de `CLAUDE.md`.
- Que el robot de vencimientos también ABRA cuando haya un pago confirmado.
- Venezuela, siempre manual (Binance / Pago Móvil).
- El servicio de seguimiento hacia adelante (3 USD/mes) se cobra a mano.

## 8. Cierres parciales al importar del bróker

Esperando un informe real de MT5 con un cierre parcial (camino 1).

## 9. Permisos de las fuentes de noticias

Los 5 correos de `notas/correos-permiso-noticias.md` los manda Néstor. Sin
respuesta escrita no se añade ninguna de esas fuentes.

## 10. Seguridad de las cuentas y derechos de autor

📌 **Néstor (2026-11-20): «esta configuración de seguridad vamos a dejarla
para último… en realidad quiero es blindar son la web y las apps».** O sea:
lo que de verdad le importa proteger es la caja fuerte del punto 1; el
blindaje de las cuentas va al final.

**Alibaba Cloud, pendiente** (Centro de cuentas → Configuración de seguridad;
la contraseña y el celular ya quedaron configurados el 2026-11-20):
- **TOTP**: activarlo con Google Authenticator o Microsoft Authenticator, y
  apuntar en papel la clave que muestre. Nunca mandar foto del QR.
- **Protección de la cuenta**: encender.
- **Protección de operaciones**: encender.
- **Estado de inicio de sesión**: bajar de 48 horas a 2-4 horas.
- NO tocar: máscara de inicio de sesión (la IP de casa cambia y lo dejaría
  fuera), segundo factor universal (pide llave física), vinculación de
  terceros.

Y lo demás:

`notas/seguridad-y-proteccion.md`: segundo factor en GitHub, Cloudflare,
Firebase, Gmail y la cuenta nueva de Qwen; topes de presupuesto; registro de
derechos de autor.

## 11. Fechas que vencen solas

- **La llave de GitHub del puente de MT5 vence el 2027-11-17**: ese día el
  puente deja de publicar en silencio.
- El token del reloj de Cloudflare también caduca: lo canta `puntualidad.yml`
  en rojo.
