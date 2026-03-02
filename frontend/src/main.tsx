import ReactDOM from 'react-dom/client'
import App from './App.tsx'

// 1. IMPORTAMOS EL CSS DE LEAFLET AQUÍ DIRECTAMENTE
import 'leaflet/dist/leaflet.css' 
import './index.css'

import { ThemeProvider } from './context/ThemeContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  // 2. HEMOS QUITADO EL <React.StrictMode> PARA QUE EL MAPA NO EXPLOTE
  <ThemeProvider>
    <App />
  </ThemeProvider>
)