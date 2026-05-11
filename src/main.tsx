import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Cambia este número de versión cada vez que subas cambios a producción y 
// necesites que todos los usuarios refresquen su caché y vuelvan a iniciar sesión.
const APP_VERSION = '1.0.0'

const currentVersion = localStorage.getItem('APP_VERSION')
if (currentVersion !== APP_VERSION) {
  // Limpiar toda la data, forzar cierre de sesión y purgar caché de SWR
  localStorage.clear()
  sessionStorage.clear()
  localStorage.setItem('APP_VERSION', APP_VERSION)
  // Recargar la página para obtener los nuevos scripts del servidor
  window.location.reload()
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
