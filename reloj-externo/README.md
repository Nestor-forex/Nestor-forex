# El reloj de fuera — cómo se pone (paso por paso)

Néstor: esto son **dos cosas** que hay que crear, una en GitHub y otra en
Cloudflare. Nada de lo que vas a hacer toca el código de las apps, y nada se
puede romper por intentarlo: si algo sale mal, todo sigue como está hoy.

Tiempo: unos 15 minutos. No hay que saber programar — se copia y se pega.

---

## ¿Para qué es esto?

El reloj de GitHub **no dispara a su hora**. Medido el 2026-10-06 sobre 30
días: de 162 corridas con hora fija en las dos apps, **cero llegaron a
tiempo**. El retraso típico es de 3 a 7 horas, y a los programas que deberían
mirar cada hora les falta el 70-80 % de las horas.

Eso no hace que la app diga nada falso — el barrido sigue bien calculado y bien
rotulado — pero sí que llegue **tarde**, y para un producto que promete un
barrido de la mañana, tarde es una promesa incumplida.

Lo que sí funciona, también medido: el botón **«Run workflow»** de GitHub
arranca en **7 a 10 segundos**, siempre. Así que la salida es que alguien de
fuera pulse ese botón a su hora. Ese «alguien» es un programita en Cloudflare,
que es gratis y sí tiene un reloj puntual.

⚠️ **Los relojes de GitHub se quedan puestos.** Si Cloudflare un día falla,
volvemos a lo de hoy, no a cero. Es un suelo.

---

## PARTE 1 — La llave de GitHub (unos 7 minutos)

El programita necesita permiso para pulsar el botón. Eso es una «llave»
(*token*).

⚠️⚠️ **La llave NO me la pegues en el chat, ni a mí ni a ninguna otra IA.** Los
dos repositorios son públicos y los chats quedan guardados. Solo se pega en el
sitio de Cloudflare que te digo en la Parte 2.

1. Entra a **github.com** y asegúrate de estar con tu cuenta.
2. Arriba a la derecha, haz clic en **tu foto de perfil** (el círculo).
3. En el menú que baja, clic en **Settings** (Configuración).
4. Baja hasta el final de la lista de la izquierda y clic en
   **Developer settings** (Configuración de desarrollador).
5. En la izquierda, clic en **Personal access tokens** y después en
   **Fine-grained tokens**.
6. Botón **Generate new token** (arriba a la derecha). Puede pedirte tu
   contraseña.
7. Ahora rellena:
   - **Token name**: escribe `reloj-externo-nestor-forex`
   - **Expiration**: elige **1 year** (o lo máximo que te deje).
     ⚠️ **Apunta en tu celular la fecha en que caduca.** Ese día el reloj deja
     de pulsar, y lo hace **en silencio**. (La herramienta de puntualidad lo
     cantaría, pero mejor no esperar a eso.)
   - **Description**: `Pulsa los workflows de las dos apps a su hora`
   - **Resource owner**: tu cuenta (`Nestor-forex`).
8. En **Repository access**, marca **Only select repositories** y en el
   desplegable **selecciona los DOS**:
   - `Nestor-forex/Nestor-forex`
   - `Nestor-forex/Nestor-forex-intradia`
9. Baja a **Permissions** → **Repository permissions**. Busca en la lista la
   fila que dice **Actions** y en su desplegable de la derecha elige
   **Read and write**.
   - Verás que **Metadata** se marca solo como *Read-only*. Eso es normal y
     tiene que quedarse así.
   - **No toques nada más.** Ninguna otra fila.
10. Baja hasta el final y clic en **Generate token**.
11. GitHub te enseña la llave **una sola vez**: un texto largo que empieza por
    `github_pat_`. Clic en el icono de copiar.
    **Déjala en el portapapeles y pasa directo a la Parte 2.** Si se te pierde,
    no pasa nada: se vuelve al paso 6 y se genera otra.

### ¿Qué puede y qué NO puede hacer esa llave?

| | |
|---|---|
| ✅ puede | pulsar, relanzar, cancelar y **apagar** workflows de esos dos repositorios |
| ❌ **no** puede | subir código, tocar `main`, leer un secreto, entrar a tu correo, al bróker ni a tu dinero |

O sea que el peor caso, si algún día se filtrara, es que alguien gaste créditos
de Twelve Data o apague el vigía. Malo, acotado, y **se ve enseguida**.

---

## PARTE 2 — El programita en Cloudflare (unos 8 minutos)

1. Entra a **dash.cloudflare.com**. Si no tienes cuenta, clic en **Sign up** y
   créala con tu correo (es gratis y no pide tarjeta).
2. En el menú de la izquierda busca **Workers & Pages** (o **Compute**, según
   cómo te lo enseñe ese día) y entra.
3. Botón azul **Create application**, arriba a la derecha (no se llama solo
   «Create»). Luego, si te salen pestañas, la de **Workers** —no «Pages»— y la
   tarjeta **Hello World**.
4. ⚠️ **Cloudflare lo crea y lo publica solo, con un nombre al azar** del tipo
   `solitary-bush-6d45`. No te va a preguntar cómo quieres llamarlo.
   - **Déjalo con ese nombre.** Es solo una etiqueta y funciona igual;
     renombrarlo obligaría a borrarlo y rehacerlo todo para nada.
   - **Apunta la dirección** que te da, que lleva ese nombre dentro:
     `<el-nombre-al-azar>.<tu-cuenta>.workers.dev`. Sirve para comprobar más
     adelante.
5. Clic en **`</> Edit code`**, arriba a la derecha. Se abre un editor con un
   ejemplo dentro.
6. **Borra TODO lo que hay en ese editor** (clic dentro, `Ctrl+A`, `Supr`).
7. Abre el archivo `reloj-externo/worker.js` de este repositorio, **cópialo
   entero** y **pégalo** en el editor de Cloudflare.
   - Para abrirlo: en GitHub, carpeta `reloj-externo`, archivo `worker.js`,
     botón **Copy raw file** (el icono de dos hojitas).
   - Si el portapapeles te da problemas entre ventanas —como ya nos pasó con
     las reglas de Firebase—, **dímelo y buscamos otra forma**. No pierdas
     media hora peleando con eso.
8. Clic en **Deploy** (arriba a la derecha).

### Ahora la llave, como secreto

9. Vuelve a la pantalla del Worker: clic en su nombre, arriba, al lado de
   «Workers & Pages».
10. Pestaña **Settings** — es la última de la fila de arriba, a la derecha de
    «Access».
11. Baja hasta **Runtime variables and secrets** y clic en **Add variable**.
12. Se abre un cuadro que dice **Add environment variable**. ⚠️ Aquí **no hay
    ningún menú «Type»**: lo que hay es un **interruptor `Secret`** a la derecha
    de la casilla *Value*. Hazlo en este orden:
    - **Select environment**: deja **Production** marcado ✓ y **Previews**
      apagado.
    - **Key**: escribe exactamente `NF_ACTIONS_TOKEN` (en mayúsculas, con los
      guiones bajos, sin espacios).
    - ⚠️ **AHORA activa el interruptor `Secret`**, ANTES de pegar nada. Así la
      llave sale tapada con puntitos y no queda a la vista en la pantalla — lo
      que importa si alguien mira por encima del hombro o si estás mandando
      fotos de la pantalla. Y, sobre todo, un secreto se guarda cifrado y **ni
      tú ni nadie lo puede volver a leer**; como texto normal quedaría a la
      vista para siempre.
    - **Value**: ahora sí, pega la llave de la Parte 1 (la que empieza por
      `github_pat_`).
    - **No toques `+ Add`**: ése es para añadir una segunda variable, y solo
      hace falta una.
13. Clic en **Add variable and deploy**.

    ✅ Tiene que quedar una fila así, y las tres columnas importan:

    ```
    Type     Name                Value
    Secret   NF_ACTIONS_TOKEN    Value encrypted
    ```

    Si en *Type* pone «Text» en vez de «Secret», o si en *Value* se lee la
    llave en vez de «Value encrypted», bórrala con la papelera y repite el
    paso 12 activando el interruptor.

### Y el reloj

14. Seguimos en **Settings**. En la **columna de la derecha** hay una lista de
    secciones; clic en **Trigger events**.
15. En **Cron triggers**, clic en **+ Add**.
16. ⚠️⚠️ **EL CUADRO TIENE DOS PESTAÑAS, Y LA QUE SALE POR DEFECTO ES LA
    EQUIVOCADA.**

    ```
    [ Schedule ]  [ Cron expression ]
                         ↑ ésta
    ```

    - **`Schedule`** es un constructor simplificado que solo acepta un número y
      construye **«cada N minutos»**. Si escribes 20 ahí, el reloj dispararía
      **cada N minutos**, y lo que hace falta es otra cosa.
    - Clic en **`Cron expression`**.

17. ⚠️ **Al cambiar de pestaña, Cloudflare arrastra lo anterior** y escribe
    algo como `*/20 * * * *`, que significa «cada 20 minutos». Hay que
    borrarlo entero.

    Clic dentro de la casilla, **`Ctrl+A`** para seleccionar todo, y escribe
    encima **cinco asteriscos separados por espacios**:

    ```
    * * * * *
    ```

    **Un solo horario, no hace falta más**: el programita ya sabe por dentro
    qué le toca a cada hora **y en qué minuto**.

    ⚠️⚠️ **CAMBIÓ EL 2026-10-07, y antes aquí decía `20 * * * *`.** El motivo
    es un fallo real: con todo en el minuto 20, cuatro programas se pulsaban en
    el mismo segundo y las dos apps se peleaban por el límite de 8 consultas
    por minuto de Twelve Data — **35 consultas en 5 segundos**. El vigía de
    Swing, que es el que escribe el historial, murió con un `HTTP 429` tres
    días seguidos de intentarlo. Ahora cada programa tiene su propio minuto, y
    para eso el reloj tiene que despertarse cada minuto.

    📌 **No es derroche.** En 56 de los 60 minutos no hace absolutamente nada:
    se despierta, mira que no le toca y se vuelve a dormir sin pedirle nada a
    GitHub. Son 1.440 despertares al día de los 100.000 que da el plan
    gratuito.

18. ⚠️ **ANTES de darle a Add, lee la lista azul** de *Estimated upcoming
    events*. Tiene que quedar **una por MINUTO**, seguidas:

    ```
    Wed, 07 Oct 2026 02:20:00
    Wed, 07 Oct 2026 02:21:00
    Wed, 07 Oct 2026 02:22:00
    ```

    Si ves una por hora (`02:20` · `03:20` · `04:20`), te quedó el horario
    viejo y solo se pulsará lo del minuto 20.

19. Clic en **Add**.

20. Si abajo aparece una barra **«Unsaved changes»**, dale a **`Save`**.
    ⚠️ **Nunca a `Discard`**: podría tirar el horario que acabas de poner.

21. Comprueba que quedó guardado. En **Trigger events** tiene que leerse:

    ```
    Cron triggers
      Runs: Every minute     Next: <fecha> 02:21:00
    ```

    Si sigue diciendo **«No cron triggers»**, el Add no llegó a guardarse y hay
    que repetir desde el paso 15.

    Si dice **«At 20 minutes past the hour»**, te quedó el horario viejo: el
    reloj funcionará, pero solo pulsará lo del minuto 20 (el vigía de Swing,
    los calendarios, las tasas y el COT). Lo demás lo seguiría pulsando GitHub
    con sus horas de retraso, y la medición de puntualidad del día siguiente lo
    diría nombrando uno por uno.

**Listo.** A partir del siguiente minuto empieza a pulsar.

---

## ⚠️ SI YA TENÍAS EL RELOJ PUESTO: hay que volver a pegar el programita

El código del Worker **vive pegado en tu cuenta de Cloudflare**, no en el
repositorio. Así que cuando aquí se cambia `worker.js`, **Cloudflare no se
entera**. Cada vez que este archivo cambie hay que repetir dos pasos:

1. **Pegar el `worker.js` nuevo** (Workers & Pages → tu Worker → **Edit code**
   → `Ctrl+A` dentro del editor → pegar encima → **Deploy**).
2. **Cambiar el horario** a `* * * * *` como dice el paso 17.

📌 Cómo saber si tu Worker está al día: abre su dirección `.workers.dev` en
Chrome. Si la lista que sale **no** enseña un minuto delante de cada programa
(`:20`, `:23`, `:26`…), tienes la versión vieja pegada.

### 📌 Por qué el paso 16 es el que más importa

Con «cada 20 minutos», a las 6 de la mañana UTC el reloj pulsaría **tres
veces** los programas de Swing en esa hora. Los vigías tienen su guardián y se
saltarían solos, pero **el oro y el reporte no lo tienen**: el del oro cuesta
15 créditos de Twelve Data cada vez, o sea **45 en vez de 15**. No es una
catástrofe y es tonto pagarla.

---

## Cómo comprobar que funciona

**Al instante** — abre en Chrome la dirección `.workers.dev` que apuntaste en
el paso 4. Te enseña la hora y qué programas le tocarían en esta hora. Si eso
se ve, el programita está vivo.
⚠️ Esa página **no pulsa nada** y **no** dice si la llave sirve.

**En el siguiente minuto 20** — Cloudflare → tu Worker → pestaña **Logs** (o
**Observability** → **Logs**). Tienen que salir líneas con `✓` y el nombre de
cada programa:

| lo que diga el log | qué significa |
|---|---|
| `✓ Nestor-forex-intradia · vigia.yml` | funcionó |
| `✗ … HTTP 404` | a la llave le falta **Actions: Read and write**, o solo se le marcó UNO de los dos repositorios (pasos 8 y 9 de la Parte 1) |
| `FALTA EL SECRETO NF_ACTIONS_TOKEN` | el nombre del secreto quedó distinto (paso 12) |

⚠️ Cloudflare no dispara en el segundo exacto: lo medido es **unos 51 segundos
después** del minuto 20. Eso es normal — compáralo con el reloj de GitHub, que
llegaba entre 3 y 7 **horas** tarde.

**El mismo día** — GitHub → el repositorio → pestaña **Actions**. Las corridas
nuevas dirán que las lanzó alguien a mano (*manually triggered*, o sea
`workflow_dispatch`) en vez de *scheduled*. Eso es el reloj de fuera.

⚠️ **Y una corrida que termina sin hacer nada NO es un fallo: es el guardián de
la hora.** Si el cron de GitHub llega tarde a una hora que el reloj de fuera ya
cubrió, el vigía se salta solo y no gasta ni un crédito. **Que se salte es
buena señal**, significa que los dos relojes no se pisan.

📌 **Para distinguir un pulso de verdad de uno que se saltó, NO mires cuánto
tardó.** Las dos cosas tardan casi lo mismo (bajar el código e instalar se paga
igual: se midieron 38 s el que trabajó contra 31 s el que se saltó). Lo que
distingue es **quién escribió**: mira los commits de la rama `datos` y cuenta
que haya uno de «Vigía» por hora, no dos.

**A los pocos días, y es la prueba de verdad** — GitHub → `Nestor-forex` →
**Actions** → en la izquierda **«¿Llegan a su hora los programas?»** → botón
**Run workflow**. Mide los últimos 30 días de las DOS apps y dice, programa por
programa, si llega a su hora.

📌 **Hoy ese workflow sale en ROJO, y es correcto**: está diciendo la verdad —
los programas llegan tarde. **Se pone verde solo** cuando el reloj lleve unos
días funcionando, porque la medición mira 30 días hacia atrás y hace falta que
los días buenos pesen más que los malos. No hay que tocar nada para que cambie.

---

## Lo que hay que saber para el futuro

⚠️ **La llave caduca.** El día que caduque, el reloj deja de pulsar **sin
avisar**. Lo único que lo cantaría es el workflow de puntualidad poniéndose
rojo otra vez. Para renovarla: Parte 1 otra vez, y en Cloudflare pasos 11-13
con la llave nueva (se puede sobrescribir el mismo secreto).

⚠️ **Cloudflare no reintenta ni avisa.** Si una hora falla, falla y no manda
ningún correo. Por eso los relojes de GitHub se quedan puestos: son el suelo.

⚠️ **Si se renombra un workflow**, el pulso de ese programa da 404 y deja de
funcionar en silencio. Eso lo vigila
`app/scripts/prueba-reloj-externo.mjs`, que compara la lista del programita con
los `.yml` de verdad de los dos repositorios en cada push y en cada pull
request. **No es teórico**: al estrenar esa prueba cazó dos horas mal escritas
que yo mismo había puesto.

⚠️ **No metas nunca la llave dentro de `worker.js`.** Los dos repositorios son
públicos: sería el mismo agujero que tuvimos con la llave de Twelve Data.

---

## Si algo no cuadra

Los paneles de GitHub y de Cloudflare **cambian de nombre cada tanto**. Si un
botón no se llama como aquí, **manda una captura de pantalla** y te digo dónde
hacer clic. No adivines ni actives nada que no esté en esta lista.

📌 **Estos pasos se corrigieron el 2026-10-07 contra el panel de verdad**,
siguiendo a Néstor pantalla por pantalla mientras lo montaba. La primera
versión los tenía escritos de memoria y **tres estaban mal**: el botón se llama
«Create application» y no «Create», el secreto es un interruptor y no un menú
«Type», y el horario sale por defecto en una pestaña que construye «cada 20
minutos» en vez de «al minuto 20».

⚠️ **Si vuelven a cambiar, corrige este archivo en vez de explicarlo por chat.**
Un procedimiento que solo vive en una conversación se pierde; y el error del
horario —el único que costaba créditos— lo cazó Néstor preguntando «¿debo
colocar los asteriscos?», no una comprobación.
