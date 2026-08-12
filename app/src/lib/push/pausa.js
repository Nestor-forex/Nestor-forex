// ¿Están los avisos al celular en pausa?
//
// Vive aquí, y no dentro del vigía, porque lo necesitan los DOS lados: el
// script que manda los avisos (`scripts/lib/push-envio.mjs`) para no mandar
// nada, y la pantalla del interruptor (`components/AvisosCard.jsx`) para
// decírselo a quien lo active. Si el valor estuviera duplicado, un día
// quedarían en desacuerdo y la app prometería avisos que no llegan nunca.
//
// ────────────────────────────────────────────────────────────────────────
// EN PAUSA DESDE EL 2026-08-12. Decisión de Néstor, con motivo medido.
//
// El banco de pruebas (`scripts/backtest.mjs`) corrió las reglas sobre 219
// días reales. El filtro que decide qué despierta el celular —R/B ≥ 1.5—
// resultó ser el PEOR de todos los probados: 13 operaciones, 15% de acierto,
// −756 pips. Peor que no filtrar nada.
//
// Y el motivo se entiende, no es mala suerte: para que el R/B salga alto con
// la fórmula de hoy, el stop tiene que quedar muy pegado al precio, y un stop
// pegado lo tumba el ruido normal del mercado. El filtro no está eligiendo
// buenas operaciones: está eligiendo stops demasiado estrechos.
//
// El vigía sigue corriendo y sigue anotando el historial: esos datos son los
// que van a decir si el arreglo funciona. Lo único que se apaga es el aviso.
//
// Para reactivarlos: poner esto en false, y solo DESPUÉS de que el banco de
// pruebas dé resultado positivo con las reglas nuevas.
// ────────────────────────────────────────────────────────────────────────
export const AVISOS_PAUSADOS = true
