import { useT } from '../lib/i18n'

// EL CLIMA DEL PAR: los mismos números, legibles de un vistazo.
//
// La idea viene de Visual Trader, una plataforma italiana de análisis de bolsa
// que Néstor encontró. No copiamos su método —es otro mercado y otros datos—,
// copiamos cómo lo ENSEÑA: un parte del tiempo al lado de cada instrumento.
// Alguien que no sabe qué es un ADX entiende «hoy hay tormenta aquí» sin que
// nadie se lo explique.
//
// ⚠️ NO ES UN INDICADOR NUEVO. No hay ni un cálculo aquí que no estuviera ya
// en pantalla: se leen la tendencia, la diferencia de fuerza, el RSI y el ATR
// que la tabla ya muestra, y se resumen en un dibujo. Si el clima dijera algo
// que los números no dicen, sería una opinión disfrazada de dato.
//
// Se dibuja en SVG y no con emoji: los emoji cambian de aspecto en cada
// sistema —y en algunos ni existen— así que el sol de un teléfono podría no
// parecerse en nada al de otro. Además el SVG toma los colores del tema, y
// lleva `dir="ltr"` fijo por lo mismo que el gráfico de la señal: en árabe la
// página se voltea y las figuras salían al revés.

// De los números a un estado del tiempo. El orden de las preguntas importa:
// primero si hay tendencia, luego si es fuerte, y la tormenta manda sobre todo
// lo demás porque volatilidad alta es lo único que puede arruinar una
// operación bien elegida.
export function climaDe({ tend, dif, rsi, atr }) {
  // ATR alto = el precio da bandazos. Se opere lo que se opere, el stop se va
  // a poner a prueba.
  if (atr >= 1.2) return 'tormenta'
  const fuerza = Math.abs(dif)
  const estirado = rsi >= 70 || rsi <= 30
  if (tend === 'Rango') return fuerza >= 1 ? 'nublado' : 'niebla'
  // Con tendencia clara y fuerza detrás, pero el RSI ya estirado, el
  // movimiento se hizo: no es sol pleno.
  if (fuerza >= 1.5 && !estirado) return 'sol'
  if (fuerza >= 0.5) return 'solNubes'
  return 'nublado'
}

const COLORES = {
  sol: 'var(--green)',
  solNubes: 'var(--green)',
  nublado: 'var(--text-muted)',
  niebla: 'var(--text-muted)',
  tormenta: 'var(--amber)',
}

function Dibujo({ clima }) {
  const c = COLORES[clima]
  const nube = (
    <path
      d="M7 20 a4 4 0 0 1 0.6 -7.9 a5.5 5.5 0 0 1 10.5 -1.2 a3.8 3.8 0 0 1 -0.6 9.1 z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  )
  const rayos = [0, 45, 90, 135, 180, 225, 270, 315].map((g) => (
    <line
      key={g}
      x1="12"
      y1="3.2"
      x2="12"
      y2="5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      transform={`rotate(${g} 12 12)`}
    />
  ))

  return (
    <svg
      dir="ltr"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      style={{ color: c, flexShrink: 0, display: 'block' }}
      aria-hidden="true"
      focusable="false"
    >
      {clima === 'sol' && (
        <>
          {rayos}
          <circle cx="12" cy="12" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        </>
      )}
      {clima === 'solNubes' && (
        <>
          {/* El sol arriba a la derecha y la nube desplazada abajo: en la
              primera versión la nube lo tapaba casi entero y a 24 px se
              confundía con "Nublado", que es justo lo contrario que quiere
              decir. Se vio en pantalla, no compilando. */}
          <circle cx="16.8" cy="6.6" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="16.8" y1="0.9" x2="16.8" y2="2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="21.5" y1="6.6" x2="22.9" y2="6.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="20.6" y1="2.8" x2="21.6" y2="1.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <g transform="translate(-2.4 2.6) scale(0.92)">{nube}</g>
        </>
      )}
      {clima === 'nublado' && nube}
      {clima === 'niebla' && (
        <>
          {[9, 13, 17].map((y) => (
            <line
              key={y}
              x1="3"
              y1={y}
              x2="21"
              y2={y}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              opacity={y === 13 ? 1 : 0.55}
            />
          ))}
        </>
      )}
      {clima === 'tormenta' && (
        <>
          {nube}
          <path
            d="M12.5 20 l-2.6 0 l1.8 -3.4 l-2.4 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(2.5 1.5)"
          />
        </>
      )}
    </svg>
  )
}

// El dibujo con su texto al lado. El texto NO es decorativo: un icono solo es
// un acertijo hasta que alguien te lo explica, y aquí no hay leyenda.
export default function ClimaMercado({ par }) {
  const t = useT()
  const clima = climaDe(par)
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: COLORES[clima] }}
      title={t(`clima.${clima}Ayuda`)}
    >
      <Dibujo clima={clima} />
      <span style={{ fontSize: 11.5, fontWeight: 600 }}>{t(`clima.${clima}`)}</span>
    </span>
  )
}
