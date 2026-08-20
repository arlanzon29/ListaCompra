import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { casosDeUsoPorDefecto } from './infraestructura/contenedor'
import { AppProvider } from './presentacion/estado/AppProvider'
import { App } from './presentacion/App'
import './presentacion/estilos/tokens.css'

/**
 * Arranque. Aquí se decide qué implementación usa la aplicación —hoy la de
 * memoria— y se le entrega a la interfaz ya envuelta en casos de uso.
 */
const casos = casosDeUsoPorDefecto()

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Falta el elemento #root en index.html')

createRoot(raiz).render(
  <StrictMode>
    <AppProvider casos={casos}>
      <App />
    </AppProvider>
  </StrictMode>,
)
