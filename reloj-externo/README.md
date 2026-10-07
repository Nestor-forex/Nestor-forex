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
3. Botón **Create** → pestaña **Workers** → **Start with Hello World!** (o
   «Hello World», el ejemplo más simple).
4. **Name**: escribe `reloj-nestor-forex`. Clic en **Deploy**.
   Te dirá que está publicado y te dará una dirección que acaba en
   `.workers.dev`. **Apúntala**, sirve para comprobar más adelante.
5. Clic en **Edit code** (o **Continuar con el código**). Se abre un editor con
   un ejemplo dentro.
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

9. Vuelve a la pantalla del Worker (si estás en el editor, clic en la flecha de
   atrás o en el nombre `reloj-nestor-forex`).
10. Pestaña **Settings** (Configuración).
11. Busca la sección **Variables and Secrets** (o **Variables y secretos**).
    Clic en **Add** (Añadir).
12. Rellena así:
    - **Type**: elige **Secret** (NO «Text»). Esto es importante: un secreto se
      guarda cifrado y **ni tú ni nadie lo puede volver a leer** desde el
      panel. Si eligieras «Text» quedaría a la vista.
    - **Variable name**: escribe exactamente `NF_ACTIONS_TOKEN`
      (en mayúsculas, con los guiones bajos, sin espacios).
    - **Value**: pega la llave de la Parte 1 (la que empieza por `github_pat_`).
13. Clic en **Deploy** / **Save**.

### Y el reloj

14. Seguimos en **Settings**. Busca la sección de **Trigger Events** /
    **Triggers** / **Cron Triggers** (el nombre cambia cada tanto).
15. Clic en **Add** → **Cron Trigger**.
16. En el campo del horario escribe exactamente:

    ```
    20 * * * *
    ```

    Eso significa «cada hora, al minuto 20». **Un solo horario, no hace falta
    más**: el programita ya sabe por dentro qué le toca a cada hora.
17. Clic en **Add** / **Deploy**.

**Listo.** A partir del siguiente minuto 20 empieza a pulsar.

---

## Cómo comprobar que funciona

**Al instante** — abre en Chrome la dirección `.workers.dev` que apuntaste en
el paso 4. Te enseña la hora y qué programas le tocarían en esta hora. Si eso
se ve, el programita está vivo.
⚠️ Esa página **no pulsa nada** y **no** dice si la llave sirve.

**En la siguiente hora en punto** — Cloudflare → tu Worker → pestaña **Logs**
(o **Observability** → **Logs**). Tienen que salir líneas con `✓` y el nombre
de cada programa. Si sale `✗ ... HTTP 404`, casi siempre es que a la llave le
falta el permiso **Actions: Read and write** (paso 9 de la Parte 1).

**El mismo día** — GitHub → el repositorio → pestaña **Actions**. Las corridas
nuevas dirán que las lanzó alguien a mano (*manually triggered*) en vez de
*scheduled*. Eso es el reloj de fuera.

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
