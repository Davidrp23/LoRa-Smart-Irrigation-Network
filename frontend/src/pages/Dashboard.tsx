import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

import ParcelasView from '../components/views/ParcelasView';
import DispositivosView from '../components/views/DispositivosView';
import AjustesView from '../components/views/AjustesView';
import { getProfile } from '../services/authService';
import { getDashboardData } from '../services/dataService';

export default function Dashboard() {
  const navigate = useNavigate();
  const [menuActivo, setMenuActivo] = useState<'parcelas' | 'dispositivos' | 'ajustes'>('parcelas');

  // ESTADO PARA NAVEGACIÓN AL MAPA (Coordenadas objetivo)
  const [mapTarget, setMapTarget] = useState<{ lat: number; lng: number } | null>(null);

  // ESTADO DEL USUARIO: Empieza con datos vacíos o de carga
  const [usuario, setUsuario] = useState({
    nombre: 'Cargando...',
    foto: '../media/profile.png', // Foto genérica por defecto
    email: ''
  });

  // ESTADO DE DATOS DEL SISTEMA
  const [parcelas, setParcelas] = useState<any[]>([]);
  const [dispositivos, setDispositivos] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token'); // Limpiamos el token al salir
    navigate('/login');
  };

  // Función para cargar datos (La sacamos fuera del useEffect para poder reutilizarla)
  const cargarDatosUsuario = async () => {
    try {
      const datosReales = await getProfile();
      
      setUsuario({
        nombre: datosReales.nombre || 'Agricultor',
        email: datosReales.email,
        foto: datosReales.foto || '../media/profile.png'
      });
    } catch (error) {
      console.error("Sesión caducada o inválida");
      handleLogout();
    }
  };

  // Función para cargar datos del negocio (Parcelas y Dispositivos)
  const cargarDatosSistema = async () => {
    if (isRefreshing) return; // Evita múltiples recargas simultáneas
    setIsRefreshing(true);
    try {
      const { parcelas, dispositivos } = await getDashboardData();
      setParcelas(parcelas);
      setDispositivos(dispositivos);
    } catch (error) {
      console.error("Error cargando datos del sistema", error);
      // Aquí podrías añadir una notificación de error para el usuario
    } finally {
      setIsRefreshing(false);
    }
  };

  // EFECTO: Se ejecuta al entrar al Dashboard
  useEffect(() => {
    cargarDatosUsuario();
    cargarDatosSistema(); // <--- Cargamos todo al inicio
  }, []);

  return (
    <div className="relative flex h-screen w-full overflow-hidden bg-background transition-colors duration-500">
      
      {/* Fondo Decorativo Moderno */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Patrón de puntos sutil */}
        <div className="absolute inset-0 h-full w-full bg-[radial-gradient(#64748b_1.5px,transparent_1.5px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_60%,transparent_100%)] opacity-40"></div>
        
        {/* Manchas de color ambientales (Glows) */}
        <div className="absolute top-[-10%] right-[-5%] h-[500px] w-[500px] rounded-full bg-primary/30 blur-[100px] dark:bg-primary/10"></div>
        <div className="absolute bottom-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full bg-blue-500/30 blur-[100px] dark:bg-blue-500/10"></div>
      </div>

      {/* 1. Componente del Menú Lateral */}
      <Sidebar 
        menuActivo={menuActivo} 
        setMenuActivo={setMenuActivo} 
        handleLogout={handleLogout} 
      />

      <main className="relative z-10 flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        
        {/* 2. Componente de la Cabecera */}
        <Header 
          menuActivo={menuActivo} 
          usuario={usuario} 
          onRefresh={cargarDatosSistema}
          isRefreshing={isRefreshing}
        />

        {/* 3. El contenido principal irá aquí */}
        <div className="flex-1 p-8">
          <AnimatePresence mode="wait">
            {menuActivo === 'parcelas' && (
              <ParcelasView 
                key="p" 
                datosParcelas={parcelas} 
                onRefresh={cargarDatosSistema}
                mapTarget={mapTarget}
                onMapTargetCleared={() => setMapTarget(null)} // <--- NUEVA PROP: Limpiar estado
              />
            )}
            {menuActivo === 'dispositivos' && (
              <DispositivosView 
                key="d" 
                datosDispositivos={dispositivos} 
                parcelasDisponibles={parcelas}
                onRefresh={cargarDatosSistema}
                onVerEnMapa={(coords) => {
                  setMapTarget(coords);
                  setMenuActivo('parcelas');
                }}
              />
            )}
            {menuActivo === 'ajustes' && <AjustesView key="a" onProfileUpdate={cargarDatosUsuario} onRefresh={cargarDatosSistema} />}
          </AnimatePresence>
        </div>
        
      </main>
    </div>
  );
}