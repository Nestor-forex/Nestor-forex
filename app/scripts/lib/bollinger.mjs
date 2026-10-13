// Las bandas de Bollinger viven ahora en `src/lib/bollinger.js`.
//
// ⚠️⚠️ POR QUÉ SE MOVIÓ, Y POR QUÉ ESTE ARCHIVO SE QUEDA COMO PUENTE.
//
// Al mandar la regla a la SOMBRA (2026-10-13) dejó de ser solo del banco de
// pruebas: `derivarVista` tiene que poder calcularla para que el vigía la anote
// y para que sus señales del día se vean en la app. Y `derivarVista` corre
// también en el NAVEGADOR, donde `scripts/` no existe.
//
// Lo que NO se podía hacer es tener dos copias de la matemática. Es el fallo
// que este proyecto lleva meses cerrando —el umbral de fuerza en nueve sitios,
// `ATR_REVERSION` en dos, la geometría de «comprar la caída»— y aquí costaría
// lo más caro: que lo que el vigía ANOTA y lo que el banco MIDIÓ se separaran
// sin que nada falle, y entonces el listón preregistrado estaría juzgando a
// otra regla.
//
// Mismo patrón que `perforaExtremo`, que vive en `marketCalc.js` y se reexporta
// aquí desde el 2026-09-07 por la misma razón.
export * from '../../src/lib/bollinger.js'
