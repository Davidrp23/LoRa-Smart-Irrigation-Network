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
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 transition-colors duration-500 dark:bg-slate-950">
      
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