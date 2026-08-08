# Datos del vigía — Nestor Forex Swing

Esta rama **no tiene código**. Solo guarda lo que el vigía va anotando, para
que el historial del código no quede sepultado bajo un commit diario.

- `historial/senales.jsonl` — una línea por cada señal detectada, con los
  niveles que la app dio en ese momento. Es la prueba de si la app acierta.
- `historial/corridas.jsonl` — una línea por cada revisión, haya encontrado
  algo o no. Sirve para medir si el vigía corre cuando debe.
- `estado/vigia.json` — qué señales están activas ahora mismo. Es contra esto
  que se compara para decidir qué es NUEVO y merece un aviso al celular.

Lo escribe `app/scripts/vigia.mjs` desde `.github/workflows/vigia.yml`, en la
rama `main`. No se edita a mano.

La app lee estos archivos directamente desde aquí por https, sin base de datos
ni servidor: el repositorio es público.
