import { useState, useEffect } from 'react';
import { Sun, Moon, RefreshCw} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  menuActivo: string;
  usuario: { nombre: string; foto: string; email: string };
  onRefresh: () => void;
  isRefreshing: boolean;
}

export default function Header({ menuActivo, usuario, onRefresh, isRefreshing }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [saludo, setSaludo] = useState('Hola');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  useEffect(() => {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) setSaludo('Buenos días');
    else if (hora >= 12 && hora < 20) setSaludo('Buenas tardes');
    else setSaludo('Buenas noches');
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 px-8 py-5 backdrop-blur-md transition-colors duration-500">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsPhotoModalOpen(true)} 
            className="cursor-pointer rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            title="Ver foto de perfil"
          >
            <img src={usuario.foto} alt="Perfil" className="h-12 w-12 rounded-full border-2 border-primary object-cover shadow-md" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">
              {saludo}, {usuario.nombre}
            </h1>
            <p className="text-sm text-muted-foreground">
              {menuActivo === 'parcelas' ? 'Resumen del estado de tus cultivos.' : menuActivo === 'dispositivos' ? 'Monitorización de hardware y señal.' : 'Ajustes de cuenta y preferencias de red.'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={onRefresh} 
            disabled={isRefreshing}
            className="rounded-full bg-secondary p-2.5 text-secondary-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
            title="Actualizar datos"
          >
            <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button onClick={toggleTheme} className="rounded-full bg-secondary p-2.5 text-secondary-foreground transition-colors hover:bg-muted">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {isPhotoModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsPhotoModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={usuario.foto} 
                alt="Perfil ampliado" 
                className="h-64 w-64 md:h-96 md:w-96 rounded-full border-4 border-primary object-cover shadow-2xl" 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}