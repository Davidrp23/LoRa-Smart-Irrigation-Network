import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Router as RouterIcon, 
  Cpu, 
  Plus, 
  MapPin, 
  Signal, 
  Search, 
  Settings, 
  X, 
  Save, 
  Wifi, 
  Globe, 
  Lock,
  Activity,
  Clock,
  CheckCircle2,
  QrCode, 
  Link as LinkIcon,
  BarChart2,
  Unlink,
  ChevronLeft,
  ChevronRight,
  Radio,
  AlertTriangle,
  Info
} from 'lucide-react';
import ConfirmarDesvincularModal from './ConfirmarDesvincularModal';
import ConnectionHistoryModal from './ConnectionHistoryModal';
import Select from '../ui/Select';
import { createDevice, updateDevice, deleteDevice, getMediciones, getRouterReportes } from '../../services/dataService';

const CHANNEL_FREQUENCIES: Record<number, string> = {
  0: '868.1 MHz',
  1: '868.3 MHz',
  2: '868.5 MHz',
  3: '869.525 MHz'
};

// Tipos basados en schema.prisma + campos de UI solicitados
interface DispositivoBase {
  id: number;
  codigoVinculacion: string;
  modelo: string;
  fechaUltimaConexion: string;
  parcelaId?: number | null; // Usamos ID para la lógica
  nombre?: string | null; // Ahora común para ambos (Routers y Motas)
  canal?: number; // 0-3 (Opcional porque puede ser null)
  frecuencia?: number; // Opcional (Solo Motas) - En minutos
  estado: 'online' | 'offline' | 'alerta';
  historialConsumo: { value: number; date: string }[]; // % consumido por hora (últimas 24h)
  latitud?: number | null;
  longitud?: number | null;
}

interface Router extends DispositivoBase {
  tipo: 'router';
  ssid: string | null; // Puede ser null desde el backend
  esPublico: boolean;
  bateria: number | null; // Puede ir con placa solar
  paquetesEnviados: number;
  paquetesRecibidos: number;
  erroresTx: number;
  erroresRx: number;
  erroresCrc: number;
}

interface Mota extends DispositivoBase {
  tipo: 'mota';
  bateriaUltima: number;
  routerId: number;
  rssi: number | null; // Señal puede ser null
  snr: number | null;
  erroresRx: number; // Pérdidas
}

type Dispositivo = Router | Mota;

// Eliminamos dispositivosIniciales

// Componente de Batería con Relleno Proporcional
const BatteryLevel = ({ level, size = 18, className }: { level: number; size?: number; className?: string }) => {
  const safeLevel = Math.max(0, Math.min(100, level));
  // El ancho máximo interno es aprox 14px (dentro de un icono de 24px con stroke 2)
  const fillWidth = (safeLevel / 100) * 14;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="16" height="10" x="2" y="7" rx="2" ry="2" />
      <line x1="22" x2="22" y1="11" y2="13" />
      {safeLevel > 0 && (
        <rect x="3" y="8" width={fillWidth} height="8" rx="1" fill="currentColor" stroke="none" />
      )}
    </svg>
  );
};

// Componente de Gráfico de Barras Simple (Historial de Consumo)
const BatteryHistoryChart = ({ data, onClick }: { data: { value: number; date: string }[], onClick?: () => void }) => {
  const hasData = data && data.length > 0;
  
  // Configuración de paginación para evitar barras cortadas
  const ITEMS_PER_PAGE = 12;
  const [startIndex, setStartIndex] = useState(Math.max(0, data.length - ITEMS_PER_PAGE));

  const displayData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const maxVal = Math.max(...displayData.map(d => d.value), 1);
  const [hovered, setHovered] = useState<{ val: number, date: string, i: number } | null>(null);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStartIndex(prev => Math.max(0, prev - ITEMS_PER_PAGE));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStartIndex(prev => Math.min(data.length - ITEMS_PER_PAGE, prev + ITEMS_PER_PAGE));
  };

  const canPrev = startIndex > 0;
  const canNext = startIndex + ITEMS_PER_PAGE < data.length;
  
  if (!hasData) {
    return (
      <div className="mt-4 pt-6 pb-2 border-t border-border flex flex-col items-center justify-center text-muted-foreground select-none">
         <BarChart2 size={24} className="mb-1 opacity-100" />
         <span className="text-[10px] font-bold uppercase tracking-wider">Sin datos disponibles</span>
      </div>
    );
  }

  return (
    <div 
      className="mt-4 pt-3 border-t border-border cursor-pointer group/chart"
      onClick={onClick}
      onMouseLeave={() => setHovered(null)}
    >
      <div className="flex justify-between items-center mb-2 h-5">
        {hovered !== null ? (
           <span className="text-xs font-bold text-foreground">
             {hovered.val}% <span className="text-[10px] font-normal text-muted-foreground ml-1">
               {new Date(hovered.date).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
             </span>
           </span>
        ) : (
           <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Historial Batería</span>
        )}
        
        <div className="flex items-center gap-2">
           {/* Controles de Paginación */}
           {(canPrev || canNext) && (
             <div className="flex items-center bg-secondary border border-border/50 rounded-md shadow-sm" onClick={(e) => e.stopPropagation()}>
               <button 
                 onClick={handlePrev} 
                 disabled={!canPrev}
                 className="p-1 hover:bg-background text-foreground disabled:opacity-30 rounded-l-md transition-colors"
               >
                 <ChevronLeft size={12} />
               </button>
               <div className="w-[1px] h-3 bg-border"></div>
               <button 
                 onClick={handleNext} 
                 disabled={!canNext}
                 className="p-1 hover:bg-background text-foreground disabled:opacity-30 rounded-r-md transition-colors"
               >
                 <ChevronRight size={12} />
               </button>
             </div>
           )}

           <span className={`text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 transition-opacity ${hovered !== null ? 'opacity-0' : 'opacity-0 group-hover/chart:opacity-100'}`}>
             <BarChart2 size={10} />
           </span>
        </div>
      </div>
      <div className="flex items-end gap-[2px] h-10 w-full overflow-hidden">
        {displayData.map((item, i) => (
          <div 
            key={startIndex + i} 
            className="relative flex-1 h-full flex items-end"
            onMouseEnter={() => setHovered({ val: item.value, date: item.date, i: startIndex + i })}
          >
            <div 
              className={`w-full rounded-sm transition-colors ${hovered?.i === startIndex + i ? 'bg-green-500 dark:bg-green-400' : 'bg-green-600/40 dark:bg-green-500/40'}`}
              style={{ height: `${(item.value / maxVal) * 100}%`, minHeight: item.value > 0 ? '2px' : '0' }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente de Gráfico Detallado para el Modal (con paginación)
const DetailedHistoryChart = ({ data }: { data: { label: string, value: number, date: string }[] }) => {
  const ITEMS_PER_PAGE = 24;
  const [startIndex, setStartIndex] = useState(Math.max(0, data.length - ITEMS_PER_PAGE));

  useEffect(() => {
    setStartIndex(Math.max(0, data.length - ITEMS_PER_PAGE));
  }, [data]);

  const displayData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  const handlePrev = () => setStartIndex(prev => Math.max(0, prev - ITEMS_PER_PAGE));
  const handleNext = () => setStartIndex(prev => Math.min(data.length - ITEMS_PER_PAGE, prev + ITEMS_PER_PAGE));

  const canPrev = startIndex > 0;
  const canNext = startIndex + ITEMS_PER_PAGE < data.length;

  return (
    <div className="w-full">
       <div className="flex justify-end mb-2">
          {(canPrev || canNext) && (
             <div className="flex items-center bg-secondary rounded-md border border-border shadow-sm">
               <button onClick={handlePrev} disabled={!canPrev} className="p-1.5 hover:bg-background text-foreground disabled:opacity-30 rounded-l-md transition-colors"><ChevronLeft size={16} /></button>
               <div className="w-[1px] h-4 bg-border"></div>
               <button onClick={handleNext} disabled={!canNext} className="p-1.5 hover:bg-background text-foreground disabled:opacity-30 rounded-r-md transition-colors"><ChevronRight size={16} /></button>
             </div>
           )}
       </div>
       <div className="h-96 w-full flex items-end gap-2 px-4 pb-8">
          {displayData.map((d, i) => (
            <div key={startIndex + i} className="flex-1 flex flex-col justify-end group relative h-full">
              <div className="w-full bg-green-500/70 dark:bg-green-500/20 rounded-t-sm border-t-2 border-green-500 relative transition-all group-hover:bg-green-600 dark:group-hover:bg-green-500/40" style={{ height: `${d.value}%` }}>
                {/* Tooltip Mejorado: Valor + Fecha completa al hacer hover */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-md border border-border pointer-events-none flex flex-col items-center">
                  <span className="font-bold">{d.value}%</span>
                  <span className="text-[10px] opacity-80 font-normal">{d.label}</span>
                </div>
              </div>
              
              {/* Eje X: Mostrar solo 1 de cada 6 etiquetas para evitar solapamiento */}
              <div className="relative w-full h-6 mt-2">
                {(i % 6 === 0) && (
                  <span className="absolute left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground text-center whitespace-nowrap w-24">
                    {d.label.split(' ')[0]}<br/>{d.label.split(' ')[1]}
                  </span>
                )}
              </div>
            </div>
          ))}
       </div>
    </div>
  );
};

// Componente Estado Vacío para Dispositivos
const EmptyDeviceState = ({ onAction }: { onAction: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border-2 border-dashed border-border/60 bg-muted/20 mt-4">
    <div className="flex gap-4 mb-6">
      <div className="bg-purple-100 dark:bg-purple-900/20 p-5 rounded-full">
        <RouterIcon size={40} className="text-purple-600 dark:text-purple-400" />
      </div>
      <div className="bg-blue-100 dark:bg-blue-900/20 p-5 rounded-full">
        <Cpu size={40} className="text-blue-600 dark:text-blue-400" />
      </div>
    </div>
    <h3 className="text-2xl font-bold text-foreground mb-2">Tu red está vacía</h3>
    <p className="text-muted-foreground max-w-md mb-8">
      Vincula tus Gateways y Motas LoRaWAN para empezar a recibir telemetría en tiempo real y controlar tu sistema de riego.
    </p>
    <button onClick={onAction} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-lg shadow-green-600/20 hover:bg-primary/90 transition-all hover:scale-105">
      <Plus size={20} /> Vincular Primer Dispositivo
    </button>
  </div>
);

interface DispositivosViewProps {
  datosDispositivos: Dispositivo[];
  parcelasDisponibles: any[]; // Recibimos las parcelas para el selector
  onRefresh: () => void;
  onVerEnMapa?: (coords: { lat: number; lng: number }) => void;
}

export default function DispositivosView({ datosDispositivos, parcelasDisponibles, onRefresh, onVerEnMapa }: DispositivosViewProps) {
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>(datosDispositivos);
  const [busqueda, setBusqueda] = useState('');
  const [editingDevice, setEditingDevice] = useState<Dispositivo | null>(null); // Dispositivo que se está editando
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [newDeviceType, setNewDeviceType] = useState<'router' | 'mota'>('mota');
  const [bindingCode, setBindingCode] = useState('');
  const [selectedHistoryDevice, setSelectedHistoryDevice] = useState<Dispositivo | null>(null);
  const [viewingConnectionDevice, setViewingConnectionDevice] = useState<Dispositivo | null>(null); // Nuevo estado para modal de conexión
  const [historyRange, setHistoryRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [historyData, setHistoryData] = useState<{ label: string, value: number, date: string }[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false); // Sirve para ambos modales de historial

  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false); // Estado para el modal de desvinculación
  // State para filtros
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'mota' | 'router'>('todos');
  const [filtroParcela, setFiltroParcela] = useState<string>('todas');

  // Sincronizar props con estado local
  useEffect(() => {
    setDispositivos(datosDispositivos);
  }, [datosDispositivos]);

  // Efecto para notificaciones
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Helper para obtener nombre de parcela por ID
  const getNombreParcela = (id?: number | null) => {
    if (!id) return null;
    return parcelasDisponibles.find(p => p.id === id)?.nombre || 'Desconocida';
  };

  // Helper para obtener nombre de router por ID
  const getNombreRouter = (id?: number | null) => {
    if (!id) return 'Ninguno';
    const router = dispositivos.find(d => d.tipo === 'router' && d.id === id);
    return router?.nombre || `Router #${id}`;
  };

  // Filtrado
  const dispositivosFiltrados = dispositivos.filter(d => {
    // Filtro por búsqueda de texto
    const termino = busqueda.toLowerCase();
    const busquedaMatch = busqueda === '' ||
      (d.nombre || '').toLowerCase().includes(termino) ||
      (d.modelo || '').toLowerCase().includes(termino) ||
      d.codigoVinculacion.toLowerCase().includes(termino);

    // Filtro por tipo
    const tipoMatch = filtroTipo === 'todos' || d.tipo === filtroTipo;

    // Filtro por parcela
    const parcelaMatch = filtroParcela === 'todas' || 
                         (filtroParcela === 'sin_asignar' && !d.parcelaId) ||
                         (d.parcelaId && d.parcelaId.toString() === filtroParcela);

    return busquedaMatch && tipoMatch && parcelaMatch;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    
    try {
      await updateDevice(editingDevice.id, editingDevice, editingDevice.tipo);
      setNotification({ type: 'success', message: 'Dispositivo actualizado correctamente' });
      setEditingDevice(null);
      onRefresh();
    } catch (error) {
      console.error(error);
      setNotification({ type: 'error', message: 'Error al actualizar el dispositivo' });
    }
  };

  const handleConfirmUnlink = async () => { 
    if (editingDevice) {
      try {
        await deleteDevice(editingDevice.id, editingDevice.tipo);
        setNotification({ type: 'success', message: 'Dispositivo desvinculado correctamente' });
        setEditingDevice(null);
        setIsUnlinkModalOpen(false);
        onRefresh();
      } catch (error) {
        setNotification({ type: 'error', message: 'No se pudo desvincular el dispositivo' });
      }
    }
  };

  const handleBindingCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (val.length > 12) val = val.slice(0, 12);
    const parts = val.match(/.{1,4}/g);
    if (parts) { setBindingCode(parts.join('-')); } else { setBindingCode(val); }
  };

  const handleLinkDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bindingCode.length < 14) return; // 12 chars + 2 guiones

    // Preparamos el objeto temporal para enviar al backend
    // Nota: El ID lo asignará la base de datos, aquí solo mandamos datos
    const newDevice: Dispositivo = newDeviceType === 'router' ? {
      id: 0, // Temporal
      tipo: 'router',
      codigoVinculacion: bindingCode,
      modelo: 'Gateway Genérico',
      ssid: `LoRa-Gateway-New`,
      esPublico: false,
      bateria: 100,
      fechaUltimaConexion: new Date().toISOString(),
      parcelaId: null,
      canal: 0,
      estado: 'online',
      paquetesEnviados: 0,
      paquetesRecibidos: 0,
      erroresTx: 0,
      erroresRx: 0,
      erroresCrc: 0,
      historialConsumo: []
    } : {
      id: 0, // Temporal
      tipo: 'mota',
      codigoVinculacion: bindingCode,
      nombre: 'Nuevo Sensor',
      modelo: 'Heltec V3',
      bateriaUltima: 100,
      fechaUltimaConexion: new Date().toISOString(),
      parcelaId: null,
      canal: 0,
      routerId: 101, // Default mock
      rssi: null,
      snr: null,
      erroresRx: 0,
      frecuencia: 15,
      estado: 'online',
      historialConsumo: []
    };

    try {
      await createDevice(newDevice, newDeviceType);
      setNotification({ type: 'success', message: 'Dispositivo vinculado exitosamente' });
      setIsLinkModalOpen(false);
      setBindingCode('');
      onRefresh();
    } catch (error) {
      setNotification({ type: 'error', message: 'Error al vincular. Verifica el código.' });
    }
  };

  // Efecto para cargar historial real cuando se abre el modal o cambia el rango
  useEffect(() => {
    if (!selectedHistoryDevice) return;

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const end = new Date();
        const start = new Date();

        if (historyRange === '24h') start.setHours(start.getHours() - 24);
        else if (historyRange === '7d') start.setDate(start.getDate() - 7);
        else if (historyRange === '30d') start.setDate(start.getDate() - 30);

        let formattedData: { label: string, value: number, date: string }[] = [];

        if (selectedHistoryDevice.tipo === 'mota') {
          const mediciones = await getMediciones(selectedHistoryDevice.id, start, end);
          formattedData = mediciones.map((m: any) => ({
            label: new Date(m.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            value: m.bateria,
            date: m.fecha
          }));

        } else if (selectedHistoryDevice.tipo === 'router') {
          const reportes = await getRouterReportes(selectedHistoryDevice.id, start, end);
          formattedData = reportes
            .filter((r: any) => r.bateria !== null && r.bateria !== undefined)
            .map((r: any) => ({
              label: new Date(r.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
              value: r.bateria,
              date: r.fecha
            }));
        }
        setHistoryData(formattedData);
      } catch (error) {
        console.error("Error cargando historial:", error);
        setNotification({ type: 'error', message: (error as Error).message || 'No se pudo cargar el historial' });
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedHistoryDevice, historyRange]);

  const getBateriaColor = (nivel: number | null | undefined) => {
    if (nivel === null || nivel === undefined) return 'text-muted-foreground'; // Gris si es null
    if (nivel > 50) return 'text-green-500';
    if (nivel > 20) return 'text-amber-500';
    return 'text-destructive';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
      {/* Header y Barra de Herramientas */}
      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Hardware de Red</h2>
          <p className="text-muted-foreground text-sm">Gestiona tus routers LoRaWAN y motas.</p>
        </div>
        
        <div className="flex w-full sm:w-auto gap-3">
          <button 
            onClick={() => setIsLinkModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-green-600/10 hover:bg-primary/90 transition-all"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Vincular Dispositivo</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros (Solo visible si hay dispositivos) */}
      {dispositivos.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, código o parcela..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="flora-input pl-10"
          />
        </div>
        <div className="w-full sm:w-48">
        <Select
          value={filtroTipo}
          onChange={(val) => setFiltroTipo(val as any)}
          options={[
            { value: 'todos', label: 'Todos los Tipos' },
            { value: 'mota', label: 'Mota / Sensor' },
            { value: 'router', label: 'Router / Gateway' }
          ]}
        />
        </div>
        <div className="w-full sm:w-48">
        <Select
          value={filtroParcela}
          onChange={(val) => setFiltroParcela(val)}
          options={[
            { value: 'todas', label: 'Todas las Parcelas' },
            { value: 'sin_asignar', label: 'Sin Asignar' },
            ...parcelasDisponibles.map(p => ({ value: p.id.toString(), label: p.nombre }))
          ]}
        />
        </div>
        </div>
      )}

      {/* Grid de Dispositivos */}
      {dispositivos.length === 0 ? (
        <EmptyDeviceState onAction={() => setIsLinkModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 pb-10">
          {dispositivosFiltrados.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center p-12 text-muted-foreground opacity-60">
              <Search size={48} className="mb-4" />
              <p className="font-medium">No se encontraron dispositivos con esos filtros</p>
            </div>
          ) : (
            dispositivosFiltrados.map((disp) => (
          <motion.div 
            layout
            key={`${disp.tipo}-${disp.id}`} 
            className="flora-card group p-5 overflow-visible"
          >
            {/* Cabecera de la Tarjeta */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={disp.tipo === 'router' ? 'device-icon-router' : 'device-icon-mota'}>
                  {disp.tipo === 'router' ? <RouterIcon size={24} /> : <Cpu size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`font-bold leading-tight ${!disp.nombre ? 'text-amber-600 dark:text-amber-500 italic' : 'text-foreground'}`}>
                      {disp.nombre || 'Sin Nombre'}
                    </h4>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                      #{disp.tipo === 'router' ? 'R' : 'M'}{disp.id}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 font-medium">{disp.modelo || 'Modelo Genérico'}</p>
                  <div className="group/status relative flex items-center gap-1.5 mt-1 cursor-help">
                    <span className={`flex h-2 w-2 rounded-full ${
                      disp.estado === 'online' ? 'bg-green-500' : disp.estado === 'alerta' ? 'bg-destructive' : 'bg-muted'
                    }`} />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{disp.estado}</span>
                    
                    {/* Tooltip Explicativo de Estado */}
                    <div className="absolute top-full left-0 mt-2 hidden w-72 rounded-xl bg-card p-4 text-sm text-card-foreground shadow-2xl border border-border z-[100] group-hover/status:block animate-in fade-in zoom-in-95 duration-200">
                      <div className="font-bold mb-2 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${disp.estado === 'online' ? 'bg-green-500' : 'bg-muted'}`}></div>
                        {disp.estado === 'online' ? 'Dispositivo Operativo' : 'Sin Conexión Reciente'}
                      </div>
                      <p className="leading-relaxed opacity-90 text-xs text-muted-foreground">
                        Debido al ahorro de energía (Deep Sleep), se considera <strong>Online</strong> si ha reportado datos en las últimas 24h.
                      </p>
                      <div className="mt-3 pt-2 border-t border-border/50 text-[10px] opacity-70 font-mono text-muted-foreground">
                        Última conexión: {disp.fechaUltimaConexion ? new Date(disp.fechaUltimaConexion).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setEditingDevice(disp)}
                className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Settings size={18} />
              </button>
            </div>

            {/* Detalles Técnicos */}
            <div className="space-y-3 mb-5">
              {/* Fila de Parcela */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1.5"><MapPin size={14}/> Parcela</span>
                {disp.parcelaId ? (
                  <span className="font-medium text-foreground text-right truncate max-w-[140px]">
                    {getNombreParcela(disp.parcelaId) || 'Desconocida'}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/50">
                    <AlertTriangle size={10} /> SIN ASIGNAR
                  </span>
                )}
              </div>

              {/* Fila de GPS */}
              <div className="flex items-center justify-between text-xs">
                <div className="group/gps-label relative flex items-center gap-1.5 text-muted-foreground cursor-help">
                  <Globe size={14}/> <span className="border-b border-dotted border-muted-foreground/50">GPS</span>
                  {/* Tooltip GPS */}
                  <div className="absolute top-full left-0 mt-2 hidden w-64 rounded-xl bg-card p-3 text-xs text-card-foreground shadow-xl border border-border z-[100] group-hover/gps-label:block animate-in fade-in zoom-in-95 duration-200">
                    <div className="font-bold mb-1 text-foreground">Posicionamiento Eficiente</div>
                    <p className="opacity-90 leading-relaxed">
                      Para maximizar la autonomía, las coordenadas solo se envían al conectarse a la red. 
                      Si cambia el dispositivo de lugar, solicite una actualización física (reinicio) para registrar la nueva ubicación.
                    </p>
                  </div>
                </div>
                {disp.latitud && disp.longitud ? (
                  <button onClick={() => onVerEnMapa && onVerEnMapa({ lat: disp.latitud!, lng: disp.longitud! })} className="text-right group/gps">
                    <span className="font-mono font-bold text-foreground block group-hover/gps:text-blue-600">
                      {disp.latitud.toFixed(4)}, {disp.longitud.toFixed(4)}
                    </span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-md border border-destructive/20">
                    <X size={10} /> SIN SEÑAL
                  </span>
                )}
              </div>
              
              {disp.tipo === 'router' && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Wifi size={14}/> Red (SSID)</span>
                  {disp.ssid ? (
                    <span className="font-medium text-foreground flex items-center gap-1">
                      {disp.esPublico ? <Globe size={12} className="text-blue-500"/> : <Lock size={12} className="text-amber-500"/>}
                      {disp.ssid}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md">SIN RED</span>
                  )}
                </div>
              )}

              {disp.tipo === 'mota' && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <RouterIcon size={14}/> Conectado a
                    </span>
                    <span className="font-medium text-foreground text-right truncate max-w-[140px]">
                      {getNombreRouter(disp.routerId)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5"><Clock size={14}/> Frecuencia</span>
                    <span className="font-medium text-foreground">{disp.frecuencia || '--'} min</span>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between text-xs">
                <div className="group/channel-label relative flex items-center gap-1.5 text-muted-foreground cursor-help">
                  <Radio size={14}/> <span className="border-b border-dotted border-muted-foreground/50">Canal</span>
                  {/* Tooltip Canal */}
                  <div className="absolute top-full left-0 mt-2 hidden w-72 rounded-xl bg-card p-3 text-xs text-card-foreground shadow-xl border border-border z-[100] group-hover/channel-label:block animate-in fade-in zoom-in-95 duration-200">
                    <div className="font-bold mb-1 text-foreground">Frecuencia LoRaWAN</div>
                    <p className="opacity-90 leading-relaxed mb-2">
                      Canal de comunicación físico. Se recomienda usar canales distintos en redes cercanas para evitar colisiones.
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded border border-amber-100 dark:border-amber-800/30 text-amber-700 dark:text-amber-400">
                      <strong>¡Precaución!</strong> Las motas no cambian de canal remotamente. Si cambia el canal del Router, deberá reiniciar físicamente todas las motas para que reconecten.
                    </div>
                  </div>
                </div>

                <span className="font-medium text-foreground">
                  {disp.tipo === 'router' 
                    ? `CH ${disp.canal ?? '-'} (${CHANNEL_FREQUENCIES[disp.canal ?? -1] || 'Unknown'})` 
                    : `CH ${disp.canal ?? '-'}`
                  }
                </span>
              </div>
            </div>

            {/* Footer / Métricas */}
            <div className="mt-auto pt-4 border-t border-border grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Batería</span>
                <div className={`flex items-center gap-1.5 text-sm font-bold ${
                  getBateriaColor(disp.tipo === 'router' ? disp.bateria : disp.bateriaUltima)
                }`}>
                  <BatteryLevel level={disp.tipo === 'router' ? (disp.bateria || 0) : (disp.bateriaUltima || 0)} size={16} /> 
                  {disp.tipo === 'router' ? (disp.bateria !== null && disp.bateria !== undefined ? `${disp.bateria}%` : '--%') : (disp.bateriaUltima !== null && disp.bateriaUltima !== undefined ? `${disp.bateriaUltima}%` : '--%')}
                </div>
              </div>
              
              <div 
                className="flex flex-col gap-1 items-end cursor-pointer hover:bg-muted/50 p-1 -mr-1 rounded-lg transition-colors"
                onClick={() => setViewingConnectionDevice(disp)}
              >
                <span className="text-[10px] font-bold text-muted-foreground uppercase">
                  {disp.tipo === 'router' ? 'Tráfico' : 'Señal'}
                </span>
                <div className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  {disp.tipo === 'router' ? (
                    (disp.paquetesEnviados > 0 || disp.paquetesRecibidos > 0) ? (
                      <><Activity size={16} className="text-blue-500"/> {disp.paquetesEnviados}</>
                    ) : (
                      <span className="text-xs font-normal text-muted-foreground italic">--</span>
                    )
                  ) : (
                    (disp.rssi !== null && disp.rssi !== undefined) ? (
                      <><Signal size={16} className={disp.rssi > -100 ? "text-blue-500" : "text-amber-500"}/> {disp.rssi} dBm</>
                    ) : (
                      <span className="text-xs font-normal text-muted-foreground italic">--</span>
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Gráfico de Consumo */}
            <BatteryHistoryChart 
              data={disp.historialConsumo} 
              onClick={() => setSelectedHistoryDevice(disp)}
            />
          </motion.div>
            ))
          )}
        </div>
      )}

      {/* Modal de Edición */}
      <AnimatePresence>
        {editingDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md rounded-3xl bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-6">
                <h3 className="text-xl font-bold text-foreground">Configurar Dispositivo</h3>
                <button onClick={() => setEditingDevice(null)} className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-accent">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-5">
                {/* Aviso de Configuración Diferida */}
                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 flex gap-3">
                  <Info className="text-blue-600 dark:text-blue-400 shrink-0" size={20} />
                  <div>
                    <h4 className="font-bold text-blue-700 dark:text-blue-300 text-sm mb-1">Aplicación Diferida de Cambios</h4>
                    <p className="text-xs text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                      Para garantizar una autonomía de varios meses, el dispositivo permanece en reposo la mayor parte del tiempo. Las configuraciones se transmitirán y aplicarán automáticamente durante la <strong>próxima conexión</strong> programada.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Nombre del Dispositivo
                  </label>
                  <input 
                    type="text" 
                    value={editingDevice.nombre || ''}
                    onChange={(e) => setEditingDevice(prev => {
                      if (!prev) return null;
                      return { ...prev, nombre: e.target.value };
                    })}
                    className="flora-input py-3"
                  />
                </div>

                {editingDevice.tipo === 'router' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">SSID de Red</label>
                      <input 
                        type="text" 
                        value={editingDevice.ssid || ''} // <--- CORRECCIÓN: Evita el valor null
                        onChange={(e) => setEditingDevice(prev => prev && prev.tipo === 'router' ? { ...prev, ssid: e.target.value } : prev)}
                        className="flora-input py-3"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm">Red Pública</span>
                        <span className="text-xs text-muted-foreground">Permitir conexión de vecinos</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setEditingDevice(prev => prev && prev.tipo === 'router' ? { ...prev, esPublico: !prev.esPublico } : prev)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${editingDevice.esPublico ? 'bg-primary' : 'bg-secondary'}`}
                      >
                        <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-primary-foreground transition-transform ${editingDevice.esPublico ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <Select 
                    label="Asignar a Parcela"
                    value={editingDevice.parcelaId?.toString() || ''}
                    onChange={(val) => setEditingDevice(prev => prev ? { ...prev, parcelaId: val ? parseInt(val) : null } : null)}
                    options={[
                      { value: '', label: 'Sin Asignar (En almacén)' },
                      ...parcelasDisponibles.map(p => ({ value: p.id.toString(), label: p.nombre }))
                    ]}
                  />
                </div>

                {editingDevice.tipo === 'router' ? (
                  <div>
                    <Select 
                      label="Canal de Operación"
                      value={editingDevice.canal?.toString() || '0'}
                      onChange={(val) => setEditingDevice(prev => prev ? { ...prev, canal: parseInt(val) } : null)}
                      options={[
                        { value: '0', label: 'Canal 0 (868.1 MHz)' },
                        { value: '1', label: 'Canal 1 (868.3 MHz)' },
                        { value: '2', label: 'Canal 2 (868.5 MHz)' },
                        { value: '3', label: 'Canal 3 (869.525 MHz)' }
                      ]}
                    />
                  </div>
                ) : (
                  <div>
                    <Select 
                      label="Frecuencia de Actualización"
                      value={editingDevice.frecuencia?.toString() || '15'}
                      onChange={(val) => setEditingDevice(prev => prev ? { ...prev, frecuencia: parseInt(val) } : null)}
                      options={[
                        { value: '5', label: '5 min (Alto Consumo)' },
                        { value: '15', label: '15 min (Estándar)' },
                        { value: '30', label: '30 min (Ahorro)' },
                        { value: '60', label: '1 hora (Eco)' },
                        { value: '360', label: '6 horas (Extremo)' }
                      ]}
                    />
                  </div>
                )}

                <div className="pt-4 mt-4 border-t border-border space-y-3">
                  <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-md shadow-green-500/10 transition-all">
                    <Save size={18} /> Guardar Cambios
                  </button>
                  <button 
                      type="button"
                      onClick={() => setIsUnlinkModalOpen(true)} // Abrir el modal de confirmación
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-200 border border-amber-400 dark:bg-amber-900/10 dark:border-amber-900/50 px-4 py-3 text-sm font-bold text-amber-700 dark:text-amber-500 hover:bg-amber-300 dark:hover:bg-amber-900/20 transition-all"
                  >
                      <Unlink size={18} /> Desvincular de la cuenta
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Vinculación (Nuevo Dispositivo) */}
      <AnimatePresence>
        {isLinkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-6">
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <QrCode className="text-muted-foreground"/> Vincular Dispositivo
                </h3>
                <button onClick={() => setIsLinkModalOpen(false)} className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-accent">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleLinkDevice} className="p-6 space-y-6">
                {/* Selector de Tipo */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewDeviceType('mota')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${newDeviceType === 'mota' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-border hover:border-muted-foreground text-muted-foreground'}`}
                  >
                    <Cpu size={32} className="mb-2" />
                    <span className="font-bold text-sm">Mota / Sensor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDeviceType('router')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${newDeviceType === 'router' ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' : 'border-border hover:border-muted-foreground text-muted-foreground'}`}
                  >
                    <RouterIcon size={32} className="mb-2" />
                    <span className="font-bold text-sm">Router / Gateway</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Código de Vinculación</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={bindingCode}
                      onChange={handleBindingCodeChange}
                      placeholder="AAAA-BBBB-CCCC"
                      className="flora-input border-2 py-3 text-center font-mono text-lg font-bold tracking-widest uppercase placeholder:text-muted-foreground/50"
                      maxLength={14}
                    />
                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${bindingCode.length === 14 ? 'text-green-500' : 'text-muted-foreground'}`}>
                      <CheckCircle2 size={20} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground text-center">Introduce el ID de 12 caracteres impreso en el dispositivo.</p>
                </div>


                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={bindingCode.length < 14}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 dark:bg-blue-700 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 dark:hover:bg-blue-600 shadow-md shadow-blue-500/10 dark:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LinkIcon size={18} /> Vincular Dispositivo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Historial Detallado */}
      <AnimatePresence>
        {selectedHistoryDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-6">
                <div>
                  <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Activity className="text-blue-500"/> Historial de Consumo
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedHistoryDevice.tipo === 'mota' ? selectedHistoryDevice.nombre : selectedHistoryDevice.modelo}
                  </p>
                </div>
                <button onClick={() => setSelectedHistoryDevice(null)} className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-accent">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                {/* Selector de Rango */}
                <div className="flex justify-center mb-8">
                  <div className="flex bg-muted p-1 rounded-xl">
                    {(['24h', '7d', '30d'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setHistoryRange(r)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                          historyRange === r 
                            ? 'bg-background text-blue-600 shadow-sm' 
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {r === '24h' ? 'Últimas 24h' : r === '7d' ? '7 Días' : '30 Días'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gráfica Grande */}
                {isLoadingHistory ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <DetailedHistoryChart data={historyData} />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Detalles de Conexión */}
      <AnimatePresence>
        {viewingConnectionDevice && (
          <ConnectionHistoryModal
            device={viewingConnectionDevice} 
            onClose={() => setViewingConnectionDevice(null)}
          />
        )}
      </AnimatePresence>

      <ConfirmarDesvincularModal
        isOpen={isUnlinkModalOpen}
        onClose={() => setIsUnlinkModalOpen(false)}
        onConfirm={handleConfirmUnlink}
        dispositivo={editingDevice}
      />

      {/* SISTEMA DE NOTIFICACIONES FLOTANTES (TOASTS) */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-[1100] flex items-center gap-4 rounded-2xl border p-5 shadow-2xl backdrop-blur-xl ${
              notification.type === 'success' 
                ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
            }`}
          >
            <div className={`rounded-full p-2 ${notification.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {notification.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
            </div>
            <div>
              <h4 className="font-bold text-base">{notification.type === 'success' ? 'Operación Exitosa' : 'Error'}</h4>
              <p className="text-sm opacity-90">{notification.message}</p>
            </div>
            <button onClick={() => setNotification(null)} className="ml-2 rounded-full p-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
