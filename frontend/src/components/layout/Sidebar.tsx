import { Sprout, Cpu, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  menuActivo: string;
  setMenuActivo: (menu: 'parcelas' | 'dispositivos' | 'ajustes') => void;
  handleLogout: () => void;
}

export default function Sidebar({ menuActivo, setMenuActivo, handleLogout }: SidebarProps) {
  return (
    <aside className="z-20 flex w-20 flex-col items-center border-r border-slate-200 bg-white py-6 shadow-xl transition-colors duration-500 dark:border-white/5 dark:bg-slate-900 md:w-64 md:items-start md:px-6">
      <div className="mb-10 flex w-full items-center justify-center gap-3 md:justify-start">
        <img src="/media/FLoRa_logo.png" alt="FLoRa" className="h-10 w-10 object-contain" />
        <span className="hidden text-2xl font-extrabold text-slate-900 dark:text-white md:block">FLoRa</span>
      </div>

      <nav className="flex w-full flex-col gap-2">
        <button onClick={() => setMenuActivo('parcelas')} className={`flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all md:justify-start ${menuActivo === 'parcelas' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`}>
          <Sprout size={22} />
          <span className="hidden font-medium md:block">Mis Parcelas</span>
        </button>
        
        <button onClick={() => setMenuActivo('dispositivos')} className={`flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all md:justify-start ${menuActivo === 'dispositivos' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`}>
          <Cpu size={22} />
          <span className="hidden font-medium md:block">Dispositivos</span>
        </button>

        <button onClick={() => setMenuActivo('ajustes')} className={`flex w-full items-center justify-center gap-3 rounded-xl p-3 transition-all md:justify-start ${menuActivo === 'ajustes' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5'}`}>
          <Settings size={22} />
          <span className="hidden font-medium md:block">Configuración</span>
        </button>
      </nav>

      <div className="mt-auto w-full">
        <button onClick={handleLogout} className="flex w-full items-center justify-center gap-3 rounded-xl p-3 text-red-500 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 md:justify-start">
          <LogOut size={22} />
          <span className="hidden font-medium md:block">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}