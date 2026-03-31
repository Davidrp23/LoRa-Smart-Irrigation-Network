import { useState, useEffect } from 'react';
import { Sprout, Cpu, Settings, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  menuActivo: string;
  setMenuActivo: (menu: 'parcelas' | 'dispositivos' | 'ajustes') => void;
  handleLogout: () => void;
}

export default function Sidebar({ menuActivo, setMenuActivo, handleLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const body = document.body;
    if (isCollapsed) {
      body.classList.add('sidebar-collapsed');
      body.classList.remove('sidebar-expanded');
    } else {
      body.classList.add('sidebar-expanded');
      body.classList.remove('sidebar-collapsed');
    }

    return () => {
      body.classList.remove('sidebar-collapsed', 'sidebar-expanded');
    };
  }, [isCollapsed]);

  return (
    <aside className={`relative z-20 flex flex-col border-r border-border bg-card py-6 shadow-xl transition-all duration-300 ${isCollapsed ? 'w-20 items-center' : 'w-20 items-center md:w-64 md:items-start md:px-6'}`}>
      
      {/* Botón de colapsar (Solo visible en escritorio) */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm hover:text-foreground md:flex"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className={`mb-10 flex w-full items-center ${isCollapsed ? 'justify-center' : 'justify-center md:justify-start'}`}>
        <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-gradient-to-br from-green-100 to-green-200 p-4 shadow-sm backdrop-blur-md transition-all hover:shadow-md dark:border-primary/30 dark:from-primary/10 dark:to-primary/5">
          <img src="/media/FLoRa_logo.png" alt="FLoRa" className={`object-contain drop-shadow-sm transition-all ${isCollapsed ? 'h-8 w-8' : 'h-10 w-10'}`} />
          {!isCollapsed && <span className="hidden text-2xl font-extrabold tracking-tight text-primary md:block">FLoRa</span>}
        </div>
      </div>

      <nav className="flex w-full flex-col gap-2">
        <button onClick={() => setMenuActivo('parcelas')} className={`flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all ${isCollapsed ? '' : 'md:justify-start'} ${menuActivo === 'parcelas' ? 'bg-primary/15 backdrop-blur-md dark:bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
          <Sprout size={22} />
          {!isCollapsed && <span className="hidden font-medium md:block">Mis Parcelas</span>}
        </button>
        
        <button onClick={() => setMenuActivo('dispositivos')} className={`flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all ${isCollapsed ? '' : 'md:justify-start'} ${menuActivo === 'dispositivos' ? 'bg-primary/15 backdrop-blur-md dark:bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
          <Cpu size={22} />
          {!isCollapsed && <span className="hidden font-medium md:block">Dispositivos</span>}
        </button>

        <button onClick={() => setMenuActivo('ajustes')} className={`flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all ${isCollapsed ? '' : 'md:justify-start'} ${menuActivo === 'ajustes' ? 'bg-primary/15 backdrop-blur-md dark:bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
          <Settings size={22} />
          {!isCollapsed && <span className="hidden font-medium md:block">Configuración</span>}
        </button>
      </nav>

      <div className="mt-auto w-full">
        <button onClick={handleLogout} className="flex w-full items-center justify-center gap-3 rounded-xl p-3 text-red-700 dark:text-destructive transition-all hover:bg-red-300 dark:hover:bg-red-900/30 ${isCollapsed ? '' : 'md:justify-start'}">
          <LogOut size={22} />
          {!isCollapsed && <span className="hidden font-medium md:block">Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
}