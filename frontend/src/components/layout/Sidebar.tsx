import { Sprout, Cpu, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  menuActivo: string;
  setMenuActivo: (menu: 'parcelas' | 'dispositivos' | 'ajustes') => void;
  handleLogout: () => void;
}

export default function Sidebar({ menuActivo, setMenuActivo, handleLogout }: SidebarProps) {
  return (
    <aside className="z-20 flex w-20 flex-col items-center border-r border-border bg-card py-6 shadow-xl transition-colors duration-500 md:w-64 md:items-start md:px-6">
      <div className="mb-10 flex w-full items-center justify-center gap-3 md:justify-start">
        <img src="/media/FLoRa_logo.png" alt="FLoRa" className="h-10 w-10 object-contain" />
        <span className="hidden text-2xl font-extrabold text-card-foreground md:block">FLoRa</span>
      </div>

      <nav className="flex w-full flex-col gap-2">
        <button onClick={() => setMenuActivo('parcelas')} className={`flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all md:justify-start ${menuActivo === 'parcelas' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
          <Sprout size={22} />
          <span className="hidden font-medium md:block">Mis Parcelas</span>
        </button>
        
        <button onClick={() => setMenuActivo('dispositivos')} className={`flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all md:justify-start ${menuActivo === 'dispositivos' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
          <Cpu size={22} />
          <span className="hidden font-medium md:block">Dispositivos</span>
        </button>

        <button onClick={() => setMenuActivo('ajustes')} className={`flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all md:justify-start ${menuActivo === 'ajustes' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'}`}>
          <Settings size={22} />
          <span className="hidden font-medium md:block">Configuración</span>
        </button>
      </nav>

      <div className="mt-auto w-full">
        <button onClick={handleLogout} className="flex w-full items-center justify-center gap-3 rounded-xl p-3 text-destructive transition-all hover:bg-destructive/10 md:justify-start">
          <LogOut size={22} />
          <span className="hidden font-medium md:block">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}