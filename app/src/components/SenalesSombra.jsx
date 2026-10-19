import { useIdioma } from '../lib/i18n'
import TarjetaPlegable from './TarjetaPlegable'
import { useTasas } from '../lib/useTasas'
import { carryDeSenal } from '../lib/carrySenal'
import { hayAlgoQueEnsenar, senalesDelUltimoDia } from '../lib/senalesSombra'
import { monedasDe } from '../lib/pairs'
// ⚠️ La MISMA función con la que el resumen parte «comprar la caída» en dos.
// Se importa en vez de repetir la condición: si la lista marcara distinto del
// porcentaje, la misma señal saldría de dos maneras en la misma pestaña.
import { esVaraVieja } from '../lib/historialCalc'
import { fmtFecha } from '../lib/format'

// LAS SEÑALES DEL DÍA DE LAS REGLAS QUE CORREN EN PRUEBAS.
//
// Néstor, el 2026-10-13: «si la reversión también gana quiero ver sus
// movimientos y resultados diarios en las apps como quiero ver lo de
// bollinger», y «también quiero ver lo del carry a favor del diferencial y en
// contra».
//
// Hasta hoy el Historial enseñaba de estas reglas solo su PORCENTAJE. Esto
// enseña las señales: qué par, hacia dónde, con qué stop y con qué objetivo.
//
// ⚠️⚠️ LA DECISIÓN QUE SOSTIENE TODA LA TARJETA: ESTO NO SON PROPUESTAS.
//
// Durante meses la decisión fue la contraria —`unir()` deja las filas de
// sombra fuera de la lista principal con un motivo escrito: «se leerían como
// recomendaciones»— y era la correcta mientras nadie las pidiera. Néstor las
// pide, y es su app. Lo que NO se puede es enseñarlas como las de la app.
//
// Por eso:
//   · van en su propia tarjeta, PLEGADA, en el Historial y no en el Barrido;
//   · el aviso va ANTES de cualquier número, igual que en las tasas, en el COT
//     y en la actividad — aquí lo caro no es leer mal un dato, es creer que
//     esta lista es lo que la app propone;
//   · cada regla lleva su etiqueta ámbar, la misma de los porcentajes;
//   · y NO se dice «hoy» en ninguna parte: se enseña la fecha de cada grupo,
//     porque el vigía corre de lunes a viernes y el reloj de GitHub ya se comió
//     días enteros.
//
// ⚠️ Y NO SE PINTA NINGÚN NÚMERO EN VERDE NI EN ROJO. Un stop no es malo ni un
// objetivo bueno: son los dos lados de la misma operación. El color aquí
// afirmaría algo que el dato no dice — la regla de siempre, antes de pintar
// algo de color preguntarse qué afirma ese color. (`SetupDetalle` sí los
// colorea, y es la decisión contraria a propósito: allí son los niveles de una
// señal que la app SÍ propone, y el color dice qué significa en plata.)
export default function SenalesSombra({ senales }) {
  const { t, locale } = useIdioma()
  const datos = useTasas()
  const tasas = datos?.tasas

  const grupos = senalesDelUltimoDia(senales)

  // Si NINGUNA regla ha señalado nunca, la tarjeta entera sobra: sería un
  // marco vacío repetido cuatro veces. Mismo criterio que la correlación y el
  // calendario. ⚠️ Lo que sí se enseña, una vez que hay algo, es la regla
  // concreta que todavía no ha señalado — ver `senalesSombra.js`.
  if (!hayAlgoQueEnsenar(grupos)) return null

  const total = grupos.reduce((n, g) => n + g.senales.length, 0)

  return (
    <TarjetaPlegable
      titulo={t('sombraSenales.titulo')}
      desc={t('sombraSenales.desc')}
      paraQue={t('sombraSenales.paraQue')}
      avance={t('sombraSenales.avance', { n: total })}
    >
      {/* ⚠️ ANTES DE NINGÚN NÚMERO. */}
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--amber)' }}>
        {t('sombraSenales.aviso')}
      </p>

      {grupos.map((g) => (
        <Grupo key={g.tipo} g={g} t={t} locale={locale} tasas={tasas} />
      ))}

      <p style={{ ...TEXTO, margin: 0 }}>{t('sombraSenales.pieCarry')}</p>
    </TarjetaPlegable>
  )
}

function Grupo({ g, t, locale, tasas }) {
  const nombre = ETIQUETA[g.tipo] ? t(ETIQUETA[g.tipo]) : g.tipo

  return (
    <div style={BLOQUE}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <Etiqueta>{nombre}</Etiqueta>
        {/* La fecha del grupo, nunca «hoy». `fmtFecha` la pone en el idioma de
            quien mira. */}
        {g.fecha && (
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{fmtFecha(g.fecha, locale)}</span>
        )}
      </div>

      {/* Una regla sin señales SIGUE SALIENDO, con su frase. Esconderla
          dejaría en pantalla solo lo que parece estar pasando algo. */}
      {!g.senales.length ? (
        <p style={{ ...TEXTO, margin: 0 }}>{t('sombraSenales.sinSenales')}</p>
      ) : (
        g.senales.map((s) => (
          <Senal key={`${s.id}@${s.vistoEl}`} s={s} t={t} tasas={tasas} />
        ))
      )}
    </div>
  )
}

function Senal({ s, t, tasas }) {
  const carry = carryDeSenal(s, tasas, monedasDe)
  // ⚠️ UNA SEÑAL CON LA VARA VIEJA TIENE QUE DECIRLO.
  //
  // «Comprar la caída» se anotó dos meses con la geometría de la app en vez de
  // con la que se usó para APROBARLA (arreglado el 2026-10-13). Esas señales
  // no se esconden —ocurrieron de verdad— pero enseñarlas sin marcarlas sería
  // peor: un R/B de 1:5,72 al lado de los de 1:1 se lee como si la regla
  // tuviera dos geometrías, y el número no cuenta para su historial.
  //
  // 📌 La primera versión marcaba cualquier regla de vara simétrica sin el
  // campo `vara`, y SALIÓ MIRANDO LA CAPTURA: ponía el aviso sobre las
  // reversiones, que siempre se anotaron bien (su R/B es 1:1 en el historial).
  // El campo se empezó a escribir para todas el mismo día, así que su ausencia
  // no distingue nada por sí sola — solo la caída estuvo mal.
  const varaVieja = esVaraVieja(s)

  return (
    <div className="card" style={{ padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        {/* ⚠️ `ltr` fijo: el código de par y BUY/SELL son jerga invariante, no
            idioma. Sin esto, en árabe «EUR/USD BUY» se dibuja al revés. */}
        <span className="mono" dir="ltr" style={{ fontSize: 13.5, fontWeight: 700 }}>
          {s.par} {t('lado.' + s.lado)}
        </span>
        {/* El carry solo sale si se sabe. `null` es «no se sabe» y entonces no
            se pinta nada — nunca «neutro» por descarte, que sería un hueco de
            datos leído como un hecho. */}
        {carry && (
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {t('sombraSenales.carry.' + carry)}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {/* ⚠️ Los rótulos se REUSAN de `setup.*`, que ya existen en los 13
            idiomas y son los que usa la pantalla de detalle. Inventar cuatro
            claves nuevas para lo mismo las dejaría separarse en silencio el
            día que alguien tradujera una y no la otra. */}
        <Nivel t={t} clave="setup.entrada" v={s.precio} />
        <Nivel t={t} clave="setup.stopLoss" v={s.sl} />
        <Nivel t={t} clave="setup.takeProfit" v={s.tp} />
        <Nivel t={t} clave="setup.rb" v={s.rr} rb />
      </div>

      {varaVieja && (
        <p style={{ margin: 0, fontSize: 11, lineHeight: 1.45, color: 'var(--amber)' }}>
          {t('sombraSenales.varaVieja')}
        </p>
      )}
    </div>
  )
}

function Nivel({ t, clave, v, rb }) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  // Los precios con 5 cifras y la relación riesgo/beneficio con 2, que es como
  // se leen en el resto de la app.
  const texto = rb ? `1 : ${v.toFixed(2)}` : String(Number(v.toFixed(5)))

  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{t(clave)}</div>
      {/* `ltr` fijo: es un número suelto, no una frase traducida. */}
      <div className="mono" dir="ltr" style={{ fontSize: 12.5, fontWeight: 600 }}>
        {texto}
      </div>
    </div>
  )
}

function Etiqueta({ children }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: '.06em',
        padding: '1px 5px',
        borderRadius: 3,
        color: 'var(--amber)',
        border: '1px solid var(--amber)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}

// Las etiquetas se REUSAN de las que ya existen en el Historial, para que la
// misma regla no tenga dos nombres distintos en la misma pantalla.
const ETIQUETA = {
  reversion: 'historial.esReversion',
  caida: 'historial.esCaida',
  lss: 'historial.esRuptura',
  bollinger: 'historial.esBollinger',
}

const BLOQUE = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  paddingTop: 12,
  borderTop: '1px solid rgba(255,255,255,.10)',
}

const TEXTO = { fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }
