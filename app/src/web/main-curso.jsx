// La página web del curso (curso.html), para computador, portátil y tableta.
//
// ⚠️ Es la MISMA app de swing compilada con otra puerta de entrada: usa la
// misma cuenta, las mismas reglas de Firestore y las mismas lecciones
// (`lib/curso/es.js`). Nunca dos copias del curso.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { IdiomaProvider } from '../lib/i18n'
import RedDeSeguridad from '../components/RedDeSeguridad.jsx'
import CursoWeb from './CursoWeb.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RedDeSeguridad>
      <IdiomaProvider>
        <CursoWeb />
      </IdiomaProvider>
    </RedDeSeguridad>
  </StrictMode>,
)
