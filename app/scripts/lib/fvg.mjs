// El FVG vive en `src/lib/fvg.js`: lo usa el banco de pruebas Y el Analizador
// de la app, que corre en el navegador, donde `scripts/` no existe.
//
// ⚠️ Una sola copia de la matemática. Dos se separarían, y entonces lo que el
// Analizador enseña y lo que el banco midió serían cosas distintas con el
// mismo nombre. Mismo patrón que `bollinger.mjs` y `perforaExtremo`.
export * from '../../src/lib/fvg.js'
