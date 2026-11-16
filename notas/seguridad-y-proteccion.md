# Seguridad de las cuentas y protección de las apps (2026-11-16)

Néstor lo pidió al cerrar la cuenta vieja de Alibaba Cloud: *«cuando tengamos la
otra cuenta quiero que la aseguremos y blindemos contra externos… estas apps son
para monetizarlas y, como están diseñadas y estructuradas, serán objeto de
copiado o de robo. También quiero protegerlas con derecho de autor si eso es
posible»*.

⚠️ **Nada de esto se ha hecho todavía.** Es la lista para cuando exista la cuenta
nueva, y lo investigado sobre derechos de autor.

## 1. Blindar la cuenta nueva de Alibaba Cloud

Las opciones las vio Néstor en su consola el 2026-11-16 (Centro de cuentas →
Configuración de seguridad). Qué hacer con cada una:

| opción de la consola | qué hacer | por qué |
|---|---|---|
| **TOTP** | ✅ **activar**, con una app de autenticación en el celular (Google Authenticator, Microsoft Authenticator o similar) | sin esto, quien tenga la contraseña entra |
| **Protección de la cuenta** | ✅ **activar** (pide el segundo factor al iniciar sesión y al cambiar datos) | el TOTP solo no sirve si no se exige |
| **Protección de operaciones** | ✅ **activar** | pide verificación para lo delicado: borrar recursos, crear llaves |
| **Estado de inicio de sesión** | ✅ **bajar de 48 horas a la mínima cómoda** (por ejemplo 2-4 h) | una sesión abierta dos días en un PC es una puerta abierta |
| **Segundo factor universal (U2F)** | opcional: solo si algún día compra una llave física (YubiKey o similar) | es lo más fuerte, pero cuesta dinero |
| **Máscara de inicio de sesión** (por IP) | ❌ **no activar** | la IP de una casa cambia sola; dejaría a Néstor fuera de su propia cuenta |
| **Vinculación de terceros** | ❌ dejar sin vincular | cada cuenta vinculada es otra puerta |

Y además, fuera de esa pantalla:

- **Contraseña larga y única**, que no se use en ningún otro sitio. Con un gestor de
  contraseñas.
- **Guardar los códigos de recuperación del TOTP** en papel o en el gestor, no en el
  celular solo: si se pierde el celular sin ellos, se pierde la cuenta.
- **Budgets con tope** (5 USD al mes para empezar): si alguien roba una llave, lo
  más que puede gastar es eso.
- **Las dos llaves de Qwen separadas** (una para la sonda en GitHub, otra para el
  puente en Cloudflare), y **nunca pegadas en ningún chat**.

⚠️ **Lo mismo vale para GitHub, Cloudflare, Firebase y Gmail**, que son las cuentas
que de verdad sostienen las apps: si alguien entra en GitHub puede cambiar el
código que se publica; si entra en Gmail, puede recuperar todas las demás. Las
cinco necesitan segundo factor. Pendiente revisarlo cuenta por cuenta con Néstor.

## 2. Derechos de autor: qué protege y qué NO

Investigado el 2026-11-16 con fuentes secundarias y normativa citada; **no es
consejo legal**. Antes de pagar nada, confirmar en las páginas oficiales
(derechodeautor.gov.co y sic.gov.co).

### Lo que sí existe en Colombia

| | qué protege | cuesta | ante quién |
|---|---|---|---|
| **Derecho de autor del software** | el **código** escrito (la expresión) | el registro es **gratuito y en línea** | Dirección Nacional de Derecho de Autor (DNDA) |
| **Marca** | el **nombre** («Nestor Forex», «Nestor Forex Swing»…) y el logo | del orden de **1,2-1,4 millones COP por clase**, según las tarifas que se publiquen cada año (ya salió la resolución de 2027) | Superintendencia de Industria y Comercio (SIC) |

- El derecho de autor **nace solo** al escribir el código; el registro en la DNDA no
  lo crea, sirve como **prueba de autoría y de fecha** ante un tercero. Hay un
  formulario específico de «soporte lógico» y un trámite para software ya publicado.
- **No hace falta registro mercantil** para ninguno de los dos.

### ⚠️ Lo que el derecho de autor NO protege

- **Las ideas, los métodos ni las estrategias.** La fuerza relativa, las reglas de
  entrada, cómo se calcula el stop: cualquiera puede escribir su propio código que
  haga lo mismo y no infringe nada. Se protege el texto del código, no lo que hace.
- **Lo que ya está a la vista.** Los dos repositorios son **públicos**: hoy
  cualquiera puede leer todo el código, las notas internas y los planes de negocio
  (incluida la memoria del proyecto). El derecho de autor permite reclamar si alguien
  lo copia, pero no impide que lo copie.

### Lo que de verdad es difícil de copiar

1. **El historial de señales** (rama `datos`): registra lo que la app dijo cada día
   con los precios de ese día. No se puede fabricar hacia atrás, y es lo que algún
   día dirá si una regla funciona. Hoy es público.
2. **La marca y la reputación** de enseñar los números aunque salgan malos.
3. **Las cuentas de los suscriptores** (Firebase), que no están en el repositorio.

### Pasar los repositorios a privados: posible, pero NO es un clic

Rompería cosas que hoy funcionan, sin dar un error visible:

- **Las dos apps leen sus datos de `raw.githubusercontent.com`** (barrido, historial,
  calendario, noticias, puente de MT5…). Con el repositorio privado, esas lecturas
  fallan y la app se queda sin datos.
- **GitHub Pages desde un repositorio privado pide un plan de pago** (GitHub Pro o
  superior), y aun así **la app publicada sigue siendo pública**.
- **El comparador de gemelos** clona la app hermana sin credenciales.
- **El código de la app que corre en el navegador se puede descargar igual**: eso no
  se puede esconder en ninguna web.

O sea que privatizar sirve para esconder **los guiones del vigía, las mediciones, las
notas internas y los planes**, no la app. Hacerlo bien pide mover los datos públicos
a otro sitio. Es un trabajo de varios pasos, con decisión de Néstor y su propio PR.

### Orden recomendado (pendiente de que Néstor decida)

1. **Segundo factor en las cinco cuentas** (gratis, hoy mismo).
2. **Registrar el software en la DNDA** (gratis): uno por app, cuando estén
   estables.
3. **Decidir si se privatizan los repositorios**, sabiendo lo que hay que mover.
4. **Registrar la marca en la SIC** (con costo) antes de empezar a promocionar.
