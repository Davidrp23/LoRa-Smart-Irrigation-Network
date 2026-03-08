import PrivateRoute from './components/auth/PrivateRoute'; // <--- Importa el guardián
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard'; // <-- Importamos nuestro nuevo super dashboard

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Todas las rutas dentro de este bloque estarán protegidas */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Si tuvieras más rutas privadas, irían aquí */}
        </Route>
        
      </Routes>
    </BrowserRouter>
  );
}