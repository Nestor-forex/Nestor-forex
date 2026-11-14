# El puente de Qwen

Dos piezas, y cada una lleva **su propia llave de Qwen**:

| pieza | dónde corre | para qué | la llave va en |
|---|---|---|---|
| **la sonda** (`app/scripts/sonda-qwen.mjs`) | GitHub Actions, a mano | elegir el modelo midiendo los tres | secreto de GitHub `QWEN_KEY` |
| **el puente** (`puente-qwen/worker.js`) | Cloudflare | atender a los suscriptores desde la app | secreto de Cloudflare `QWEN_KEY` |

**Por qué dos llaves y no una:** si una se escapa o se pone a gastar por un
fallo, se borra esa sola en Alibaba y la otra sigue funcionando. Y en Model
Studio se puede poner **un tope de gasto por llave** (Budgets → API Key level).

⚠️ **Ninguna llave se pega en un chat, en un correo ni en un archivo del
repositorio.** Los dos repositorios son públicos. La llave se copia de Alibaba
y se pega directamente en GitHub o en Cloudflare, y nada más.

---

## A · La llave de la sonda (en GitHub)

### 1. Crear la llave en Alibaba

1. Entra en la consola de **Model Studio** (región **Singapur**).
2. En el menú, entra en **API Key** (o la tarjeta «API Key» de la portada).
3. Pulsa **Create API Key** (crear).
4. Si pide un nombre o descripción, pon **`sonda-github`**. Si pide elegir un
   espacio de trabajo, deja el que viene («default workspace»).
5. Pulsa el botón de **copiar** que sale al lado de la llave. **No la escribas
   en ningún sitio más.**

### 2. Guardarla en GitHub

1. Abre el repositorio **Nestor-forex** en GitHub.
2. Arriba, pulsa **Settings** (el engranaje).
3. En el menú de la izquierda: **Secrets and variables** → **Actions**.
4. Pulsa el botón verde **New repository secret**.
5. En **Name** escribe exactamente: `QWEN_KEY`
6. En **Secret** pega la llave (Ctrl + V).
7. Pulsa **Add secret**.

Es lo mismo que se hizo con `TWELVEDATA_KEY`. GitHub la guarda cifrada y no la
enseña nunca más: ni a ti, ni en los registros.

### 3. Lanzar la sonda

1. En el repositorio, arriba: **Actions**.
2. A la izquierda: **Sonda de Qwen (tres modelos)**.
3. A la derecha: **Run workflow** → **Run workflow**.
4. Tarda unos minutos. Gasta del orden de **50 centavos** (lleva un tope de 2
   dólares dentro, y por encima está el de 10 dólares al mes de Model Studio).

Si sale en rojo en el paso «1 · La dirección de Alibaba»: un **401** es que la
llave quedó mal pegada; un **403** puede ser que falte activar el modelo.

---

## B · El puente en Cloudflare (cuando la app lo use)

Esto **todavía no hace falta**: el puente se monta cuando la app tenga el botón
«Explícamelo con Qwen». Queda escrito para entonces.

1. Cloudflare → **Workers & Pages** → **Create** → **Create Worker** →
   nombre **`nf-qwen`** → **Deploy**.
2. **Edit code** → borra lo que haya → pega **entero** `puente-qwen/worker.js`
   → **Deploy**.
3. **El contador de consultas** (las 5 al día): **Storage & Databases** →
   **KV** → **Create** → nombre **`nf-qwen-cuentas`**. Luego, en el Worker:
   **Settings** → **Bindings** → **Add** → **KV namespace** → nombre de la
   variable **`CUENTAS`** (exacto, en mayúsculas) → elige `nf-qwen-cuentas`.
4. **La llave:** crea en Alibaba **otra** llave, con el nombre
   **`puente-cloudflare`**. En el Worker: **Settings** → **Variables and
   Secrets** → **Add** → tipo **Secret** → nombre **`QWEN_KEY`** → pega la
   llave → **Deploy**.
5. Comprobar: abre la dirección del Worker (`…workers.dev`) en el navegador.
   Tiene que contestar `{"ok":true,"version":"…"}`. Si contesta otra cosa,
   mándame captura.

⚠️ **Igual que el reloj:** el Worker vive pegado en Cloudflare. Si
`worker.js` cambia en el repositorio, **no cambia allí solo**: hay que volver a
pegarlo.

### Lo que el puente hace solo

- Solo atiende a quien tiene sesión en la app **y** está **aprobado**.
- **5 consultas al día** por persona (el administrador, 50), contadas en la hora
  de Colombia. Si Qwen falla, la consulta se devuelve.
- Un techo de **400 consultas al día para toda la cuenta**, por si algo se pone
  a repetir.
- Solo deja llamarlo desde la app publicada (`nestor-forex.github.io`).
- Las instrucciones de Qwen salen del puente, nunca del teléfono: nadie puede
  quitarle a Qwen la regla de no decir «compra» ni «vende».
