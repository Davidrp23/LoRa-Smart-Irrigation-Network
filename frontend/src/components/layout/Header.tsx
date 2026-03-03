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
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/80 px-8 py-5 backdrop-blur-md transition-colors duration-500">
      <div className="flex items-center gap-4">
        <img src={usuario.foto} alt="Perfil" className="h-12 w-12 rounded-full border-2 border-primary object-cover shadow-md" />
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
        <button onClick={toggleTheme} className="rounded-full bg-secondary p-2.5 text-secondary-foreground transition-colors hover:bg-muted">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </header>
  );
}