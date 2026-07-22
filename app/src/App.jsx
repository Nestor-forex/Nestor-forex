import { useState } from 'react'
import Splash from './components/Splash'
import Auth from './components/Auth'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import BarridoTab from './components/BarridoTab'
import TableroCompleto from './components/TableroCompleto'
import DiarioTab from './components/DiarioTab'
import CalculadoraTab from './components/CalculadoraTab'
import MiembrosTab from './components/MiembrosTab'
import { usuariosFake, tradesFake } from './lib/fakeData'
import { useLocalStorage } from './lib/useLocalStorage'

const NOMBRE_APP = 'NESTOR FOREX'
const PIN_ADMIN_DEMO = '2468'

export default function App() {
  const [session, setSession] = useLocalStorage('nf_session', null)
  const [usuarios, setUsuarios] = useLocalStorage('nf_users', usuariosFake)
  const [trades, setTrades] = useLocalStorage('nf_trades', tradesFake)

  const [screen, setScreen] = useState(session ? 'app' : 'splash')
  const [tab, setTab] = useState('barrido')
  const [msg, setMsg] = useState('')

  const esAdmin = session === '__admin__'

  const registrar = (nombre, email, clave) => {
    const correo = (email || '').trim().toLowerCase()
    if (!nombre || !correo || !clave) return setMsg('Completa nombre, correo y clave.')
    if (usuarios.some((u) => u.email === correo)) return setMsg('Ese correo ya tiene una solicitud.')
    setUsuarios([...usuarios, { nombre: nombre.trim(), email: correo, clave, estado: 'pendiente' }])
    setMsg('Solicitud enviada. Podrás entrar cuando Néstor la apruebe.')
  }

  const ingresar = (email, clave) => {
    const correo = (email || '').trim().toLowerCase()
    const u = usuarios.find((x) => x.email === correo && x.clave === clave)
    if (!u) return setMsg('Correo o clave incorrectos, o aún no estás inscrito.')
    if (u.estado !== 'aprobado') return setMsg('Tu solicitud sigue pendiente de aprobación.')
    setSession(u.email)
    setMsg('')
    setScreen('app')
    setTab('barrido')
  }

  const entrarAdmin = (pin) => {
    if ((pin || '') !== PIN_ADMIN_DEMO) return setMsg('PIN incorrecto.')
    setSession('__admin__')
    setMsg('')
    setScreen('app')
    setTab('admin')
  }

  const salir = () => {
    setSession(null)
    setScreen('splash')
    setTab('barrido')
  }

  const guardarTrade = (t) => setTrades([...trades, t])
  const borrarTrade = (index) => setTrades(trades.filter((_, i) => i !== index))

  const aprobarUsuario = (email) => setUsuarios(usuarios.map((u) => (u.email === email ? { ...u, estado: 'aprobado' } : u)))
  const retirarUsuario = (email, nombre) => {
    if (confirm(`¿Retirar a ${nombre}?`)) setUsuarios(usuarios.filter((u) => u.email !== email))
  }

  return (
    <div className="app-frame">
      <div className="app-screen">
        {screen === 'splash' && <Splash nombreApp={NOMBRE_APP} onEntrar={() => { setScreen('auth'); setMsg('') }} />}

        {screen === 'auth' && <Auth nombreApp={NOMBRE_APP} msg={msg} onRegistrar={registrar} onIngresar={ingresar} onEntrarAdmin={entrarAdmin} />}

        {screen === 'app' && tab !== 'tablero' && (
          <>
            <Header nombreApp={NOMBRE_APP} saludo={esAdmin ? 'Administrador' : session || ''} onSalir={salir} />
            <main style={{ flex: 1, padding: '18px 18px 96px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {tab === 'barrido' && <BarridoTab onVerTablero={() => setTab('tablero')} />}
              {tab === 'diario' && <DiarioTab trades={trades} onGuardar={guardarTrade} onBorrar={borrarTrade} />}
              {tab === 'calc' && <CalculadoraTab />}
              {tab === 'admin' && esAdmin && <MiembrosTab usuarios={usuarios} onAprobar={aprobarUsuario} onRetirar={retirarUsuario} />}
            </main>
            <BottomNav tab={tab} onTab={setTab} esAdmin={esAdmin} />
          </>
        )}

        {screen === 'app' && tab === 'tablero' && <TableroCompleto onVolver={() => setTab('barrido')} />}
      </div>
    </div>
  )
}
