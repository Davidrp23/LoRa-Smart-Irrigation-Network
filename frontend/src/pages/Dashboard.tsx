import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

import ParcelasView from '../components/views/ParcelasView';
import DispositivosView from '../components/views/DispositivosView';
import AjustesView from '../components/views/AjustesView';

const usuarioActual = {
  nombre: 'David',
  foto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  email: 'david@flora.com'
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [menuActivo, setMenuActivo] = useState<'parcelas' | 'dispositivos' | 'ajustes'>('parcelas');

  const handleLogout = () => {
    navigate('/login');
  };

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
          usuario={usuarioActual} 
        />

        {/* 3. El contenido principal irá aquí */}
        <div className="flex-1 p-8">
          <AnimatePresence mode="wait">
            {menuActivo === 'parcelas' && <ParcelasView key="p" />}
            {menuActivo === 'dispositivos' && <DispositivosView key="d" />}
            {menuActivo === 'ajustes' && <AjustesView key="a" />}
          </AnimatePresence>
        </div>
        
      </main>
    </div>
  );
}