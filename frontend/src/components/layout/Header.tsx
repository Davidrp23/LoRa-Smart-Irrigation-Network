import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  menuActivo: string;
  usuario: { nombre: string; foto: string; email: string };
}

export default function Header({ menuActivo, usuario }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [saludo, setSaludo] = useState('Hola');

  useEffect(() => {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) setSaludo('Buenos días');
    else if (hora >= 12 && hora < 20) setSaludo('Buenas tardes');
    else setSaludo('Buenas noches');
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/80 px-8 py-5 backdrop-blur-md transition-colors duration-500 dark:border-white/5 dark:bg-slate-900/80">
      <div className="flex items-center gap-4">
        <img src={usuario.foto} alt="Perfil" className="h-12 w-12 rounded-full border-2 border-green-500 object-cover shadow-md" />
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            {saludo}, {usuario.nombre}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {menuActivo === 'parcelas' ? 'Resumen del estado de tus cultivos.' : menuActivo === 'dispositivos' ? 'Monitorización de hardware y señal.' : 'Ajustes de cuenta y preferencias de red.'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button onClick={toggleTheme} className="rounded-full bg-slate-100 p-2.5 text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </header>
  );
}