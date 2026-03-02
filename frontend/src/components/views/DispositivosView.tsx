import { useState } from 'react';
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
  Plug,
  BarChart2
} from 'lucide-react';

// Tipos basados en schema.prisma + campos de UI solicitados
interface DispositivoBase {
  id: number;
  codigoVinculacion: string;
  modelo: string;
  fechaUltimaConexion: string;
  parcela: string | null;
  frecuencia: string; // Campo solicitado extra
  estado: 'online' | 'offline' | 'alerta';
  historialConsumo: number[]; // % consumido por hora (últimas 24h)
}

interface Router extends DispositivoBase {
  tipo: 'router';
  ssid: string;
  esPublico: boolean;
  bateria: number | null; // Puede ir con placa solar
  paquetesEnviados: number;
}

interface Mota extends DispositivoBase {
  tipo: 'mota';
  nombre: string;
  bateriaUltima: number;
  routerId: number;
  rssi: number; // Señal
}

type Dispositivo = Router | Mota;

const dispositivosIniciales: Dispositivo[] = [
  { 
    id: 101, 
    tipo: 'router', 
    codigoVinculacion: 'GW-N-001',
    modelo: 'Gateway Pro V2', 
    ssid: 'LoRa-Norte', 
    esPublico: true, 
    bateria: 100, 
    fechaUltimaConexion: '2023-10-25T10:00:00Z',
    parcela: 'Sector Norte - Olivos',
    frecuencia: '15 min',
    estado: 'online',
    paquetesEnviados: 15420,
    historialConsumo: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] // AC Power
  },
  { 
    id: 102, 
    tipo: 'mota', 
    codigoVinculacion: 'SN-H-001',
    nombre: 'Sensor Humedad 1', 
    modelo: 'Heltec V3', 
    bateriaUltima: 85, 
    fechaUltimaConexion: '2023-10-25T10:05:00Z',
    parcela: 'Sector Norte - Olivos',
    routerId: 101,
    rssi: -85,
    frecuencia: '30 min',
    estado: 'online',
    historialConsumo: [1, 2, 1, 0, 1, 1, 2, 3, 1, 0, 1, 1, 2, 1, 1, 0, 1, 2, 1, 1, 0, 1, 2, 1]
  },
  { 
    id: 201, 
    tipo: 'router', 
    codigoVinculacion: 'GW-S-002',
    modelo: 'Gateway Lite', 
    ssid: 'LoRa-Sur', 
    esPublico: false, 
    bateria: 5, 
    fechaUltimaConexion: '2023-10-25T09:55:00Z',
    parcela: 'Sector Sur - Vides',
    frecuencia: '15 min',
    estado: 'online',
    paquetesEnviados: 8900,
    historialConsumo: [5, 4, 6, 5, 4, 5, 6, 5, 4, 5, 6, 5, 4, 5, 6, 5, 4, 5, 6, 5, 4, 5, 6, 5]
  },
  { 
    id: 202, 
    tipo: 'mota', 
    codigoVinculacion: 'SN-S-002',
    nombre: 'Sensor Superficie B', 
    modelo: 'Heltec V3', 
    bateriaUltima: 75, 
    fechaUltimaConexion: '2023-10-25T08:00:00Z',
    parcela: 'Sector Sur - Vides',
    routerId: 201,
    rssi: -95,
    frecuencia: '1 hora',
    estado: 'alerta',
    historialConsumo: [8, 7, 9, 8, 7, 8, 9, 8, 7, 8, 9, 8, 7, 8, 9, 8, 7, 8, 9, 8, 7, 8, 9, 8]
  },
  { 
    id: 301, 
    tipo: 'mota', 
    codigoVinculacion: 'SN-X-999',
    nombre: 'Mota Nueva (Sin Vincular)', 
    modelo: 'Heltec V2', 
    bateriaUltima: 50, 
    fechaUltimaConexion: '2023-10-24T18:00:00Z',
    parcela: null,
    routerId: 0,
    rssi: 0,
    frecuencia: '1 hora',
    estado: 'offline',
    historialConsumo: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
];

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
const BatteryHistoryChart = ({ data, onClick }: { data: number[], onClick?: () => void }) => {
  const maxVal = Math.max(...data, 1); // Evitar división por cero
  const [hovered, setHovered] = useState<{ val: number, i: number } | null>(null);
  
  return (
    <div 
      className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 cursor-pointer group/chart"
      onClick={onClick}
      onMouseLeave={() => setHovered(null)}
    >
      <div className="flex justify-between items-end mb-2 h-4">
        {hovered !== null ? (
           <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
             -{hovered.val}% <span className="text-[10px] font-normal text-slate-400 ml-1">({hovered.i}:00)</span>
           </span>
        ) : (
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Consumo (24h)</span>
        )}
        <span className={`text-[10px] text-blue-500 font-medium flex items-center gap-1 transition-opacity ${hovered !== null ? 'opacity-0' : 'opacity-0 group-hover/chart:opacity-100'}`}>
          <BarChart2 size={10} /> Ver detalle
        </span>
      </div>
      <div className="flex items-end gap-[2px] h-10 w-full">
        {data.map((value, i) => (
          <div 
            key={i} 
            className="relative flex-1 h-full flex items-end"
            onMouseEnter={() => setHovered({ val: value, i })}
          >
            <div 
              className={`w-full rounded-sm transition-colors ${hovered?.i === i ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-200 dark:bg-slate-700'}`}
              style={{ height: `${(value / maxVal) * 100}%`, minHeight: value > 0 ? '2px' : '0' }}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DispositivosView() {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>(dispositivosIniciales);
  const [busqueda, setBusqueda] = useState('');
  const [editingDevice, setEditingDevice] = useState<Dispositivo | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [newDeviceType, setNewDeviceType] = useState<'router' | 'mota'>('mota');
  const [bindingCode, setBindingCode] = useState('');
  const [newDeviceName, setNewDeviceName] = useState('');
  const [selectedHistoryDevice, setSelectedHistoryDevice] = useState<Dispositivo | null>(null);
  const [historyRange, setHistoryRange] = useState<'24h' | '7d' | '30d'>('24h');

  // Filtrado
  const dispositivosFiltrados = dispositivos.filter(d => {
    const termino = busqueda.toLowerCase();
    const nombre = d.tipo === 'mota' ? d.nombre : d.modelo;
    return nombre.toLowerCase().includes(termino) || 
           d.codigoVinculacion.toLowerCase().includes(termino) ||
           d.parcela?.toLowerCase().includes(termino);
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;
    
    setDispositivos(prev => prev.map(d => d.id === editingDevice.id ? editingDevice : d));
    setEditingDevice(null);
  };

  const handleBindingCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Eliminar caracteres no alfanuméricos y convertir a mayúsculas
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Limitar a 12 caracteres (3 bloques de 4)
    if (val.length > 12) val = val.slice(0, 12);
    
    // Insertar guiones cada 4 caracteres
    const parts = val.match(/.{1,4}/g);
    if (parts) {
      setBindingCode(parts.join('-'));
    } else {
      setBindingCode(val);
    }
  };

  const handleLinkDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (bindingCode.length < 14) return; // 12 chars + 2 guiones

    const newId = Math.max(0, ...dispositivos.map(d => d.id)) + 1;
    
    const newDevice: Dispositivo = newDeviceType === 'router' ? {
      id: newId,
      tipo: 'router',
      codigoVinculacion: bindingCode,
      modelo: newDeviceName || 'Nuevo Gateway',
      ssid: `LoRa-Gateway-${newId}`,
      esPublico: false,
      bateria: 100,
      fechaUltimaConexion: new Date().toISOString(),
      parcela: null,
      frecuencia: '15 min',
      estado: 'online',
      paquetesEnviados: 0,
      historialConsumo: Array(24).fill(0) // Añadido para corregir el error de tipo
    } : {
      id: newId,
      tipo: 'mota',
      codigoVinculacion: bindingCode,
      nombre: newDeviceName || 'Nuevo Sensor',
      modelo: 'Heltec V3',
      bateriaUltima: 100,
      fechaUltimaConexion: new Date().toISOString(),
      parcela: null,
      routerId: 101, // Default mock
      rssi: -70,
      frecuencia: '15 min',
      estado: 'online',
      historialConsumo: Array(24).fill(0)
    };

    setDispositivos(prev => [...prev, newDevice]);
    setIsLinkModalOpen(false);
    setBindingCode('');
    setNewDeviceName('');
  };

  // Generador de datos ficticios para el modal de historial
  const getDetailedHistoryData = (range: '24h' | '7d' | '30d') => {
    const count = range === '24h' ? 24 : range === '7d' ? 7 : 30;
    return Array.from({ length: count }, (_, i) => ({
      label: range === '24h' ? `${i}:00` : range === '7d' ? `Día ${i+1}` : `Día ${i+1}`,
      value: Math.floor(Math.random() * 15),
      date: new Date().toLocaleDateString()
    }));
  };

  const getBateriaColor = (nivel: number) => {
    if (nivel > 50) return 'text-green-500';
    if (nivel > 20) return 'text-amber-500';
    return 'text-red-500';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col h-full">
      {/* Header y Barra de Herramientas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Hardware de Red</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Gestiona tus routers LoRaWAN y motas.</p>
        </div>
        
        <div className="flex w-full sm:w-auto gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar dispositivo..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:bg-slate-800 dark:border-white/10 dark:text-white"
            />
          </div>
          <button 
            onClick={() => setIsLinkModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-600/20 hover:bg-green-700 transition-all"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Nuevo Dispositivo</span>
          </button>
        </div>
      </div>

      {/* Grid de Dispositivos */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 pb-10">
        {dispositivosFiltrados.map((disp) => (
          <motion.div 
            layout
            key={disp.id} 
            className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/5 dark:bg-slate-900 shadow-sm hover:shadow-md transition-all"
          >
            {/* Cabecera de la Tarjeta */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-inner ${
                  disp.tipo === 'router' 
                    ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' 
                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                }`}>
                  {disp.tipo === 'router' ? <RouterIcon size={24} /> : <Cpu size={24} />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-white leading-tight">
                    {disp.tipo === 'mota' ? disp.nombre : disp.modelo}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`flex h-2 w-2 rounded-full ${
                      disp.estado === 'online' ? 'bg-green-500' : disp.estado === 'alerta' ? 'bg-red-500' : 'bg-slate-300'
                    }`} />
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{disp.estado}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setEditingDevice(disp)}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings size={18} />
              </button>
            </div>

            {/* Detalles Técnicos */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5"><MapPin size={14}/> Ubicación</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-right truncate max-w-[140px]">
                  {disp.parcela || 'Sin asignar'}
                </span>
              </div>
              
              {disp.tipo === 'router' && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5"><Wifi size={14}/> Red (SSID)</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    {disp.esPublico ? <Globe size={12} className="text-blue-500"/> : <Lock size={12} className="text-amber-500"/>}
                    {disp.ssid}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5"><Clock size={14}/> Frecuencia</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{disp.frecuencia}</span>
              </div>
            </div>

            {/* Footer / Métricas */}
            <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Batería</span>
                <div className={`flex items-center gap-1.5 text-sm font-bold ${
                  disp.tipo === 'router' && !disp.bateria 
                    ? 'text-blue-500' 
                    : getBateriaColor(disp.tipo === 'router' ? (disp.bateria || 0) : disp.bateriaUltima)
                }`}>
                  {disp.tipo === 'router' && !disp.bateria ? (
                    <><Plug size={16} /> AC</>
                  ) : (
                    <><BatteryLevel level={disp.tipo === 'router' ? (disp.bateria || 0) : disp.bateriaUltima} size={16} /> {disp.tipo === 'router' ? `${disp.bateria}%` : `${disp.bateriaUltima}%`}</>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-1 items-end">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {disp.tipo === 'router' ? 'Tráfico' : 'Señal'}
                </span>
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-300">
                  {disp.tipo === 'router' ? (
                    <><Activity size={16} className="text-blue-500"/> {disp.paquetesEnviados}</>
                  ) : (
                    <><Signal size={16} className="text-blue-500"/> {disp.rssi} dBm</>
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
        ))}
      </div>

      {/* Modal de Edición */}
      <AnimatePresence>
        {editingDevice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-white/10">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Configurar Dispositivo</h3>
                <button onClick={() => setEditingDevice(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {editingDevice.tipo === 'mota' ? 'Nombre del Sensor' : 'Modelo / Identificador'}
                  </label>
                  <input 
                    type="text" 
                    value={editingDevice.tipo === 'mota' ? editingDevice.nombre : editingDevice.modelo}
                    onChange={(e) => setEditingDevice(prev => {
                      if (!prev) return null;
                      return prev.tipo === 'mota' 
                        ? { ...prev, nombre: e.target.value } 
                        : { ...prev, modelo: e.target.value };
                    })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-green-500 focus:outline-none dark:bg-slate-800 dark:border-white/10 dark:text-white"
                  />
                </div>

                {editingDevice.tipo === 'router' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">SSID de Red</label>
                      <input 
                        type="text" 
                        value={editingDevice.ssid}
                        onChange={(e) => setEditingDevice(prev => prev && prev.tipo === 'router' ? { ...prev, ssid: e.target.value } : prev)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-green-500 focus:outline-none dark:bg-slate-800 dark:border-white/10 dark:text-white"
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-white/5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-700 dark:text-white text-sm">Red Pública</span>
                        <span className="text-xs text-slate-500">Permitir conexión de vecinos</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setEditingDevice(prev => prev && prev.tipo === 'router' ? { ...prev, esPublico: !prev.esPublico } : prev)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${editingDevice.esPublico ? 'bg-green-500' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${editingDevice.esPublico ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Frecuencia de Actualización</label>
                  <select 
                    value={editingDevice.frecuencia}
                    onChange={(e) => setEditingDevice(prev => prev ? { ...prev, frecuencia: e.target.value } : null)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-green-500 focus:outline-none dark:bg-slate-800 dark:border-white/10 dark:text-white appearance-none"
                  >
                    <option>5 min (Alto Consumo)</option>
                    <option>15 min (Estándar)</option>
                    <option>30 min (Ahorro)</option>
                    <option>1 hora (Eco)</option>
                    <option>6 horas (Extremo)</option>
                  </select>
                </div>

                <div className="pt-4">
                  <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 shadow-lg shadow-green-500/30 transition-all">
                    <Save size={18} /> Guardar Cambios
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-white/10">
                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <QrCode className="text-slate-400"/> Vincular Dispositivo
                </h3>
                <button onClick={() => setIsLinkModalOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleLinkDevice} className="p-6 space-y-6">
                {/* Selector de Tipo */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewDeviceType('mota')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${newDeviceType === 'mota' ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20 text-slate-500'}`}
                  >
                    <Cpu size={32} className="mb-2" />
                    <span className="font-bold text-sm">Mota / Sensor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDeviceType('router')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${newDeviceType === 'router' ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400' : 'border-slate-200 hover:border-slate-300 dark:border-white/10 dark:hover:border-white/20 text-slate-500'}`}
                  >
                    <RouterIcon size={32} className="mb-2" />
                    <span className="font-bold text-sm">Router / Gateway</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Código de Vinculación</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={bindingCode}
                      onChange={handleBindingCodeChange}
                      placeholder="AAAA-BBBB-CCCC"
                      className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-lg font-bold tracking-widest text-slate-900 focus:border-blue-500 focus:outline-none dark:bg-slate-800 dark:border-white/10 dark:text-white uppercase placeholder:text-slate-300"
                      maxLength={14}
                    />
                    <div className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${bindingCode.length === 14 ? 'text-green-500' : 'text-slate-300'}`}>
                      <CheckCircle2 size={20} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 text-center">Introduce el ID de 12 caracteres impreso en el dispositivo.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre Identificativo (Opcional)</label>
                  <input 
                    type="text" 
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    placeholder={newDeviceType === 'mota' ? "Ej: Sensor Tomates" : "Ej: Gateway Principal"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:border-blue-500 focus:outline-none dark:bg-slate-800 dark:border-white/10 dark:text-white"
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={bindingCode.length < 14}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-white/10">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Activity className="text-blue-500"/> Historial de Consumo
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedHistoryDevice.tipo === 'mota' ? selectedHistoryDevice.nombre : selectedHistoryDevice.modelo}
                  </p>
                </div>
                <button onClick={() => setSelectedHistoryDevice(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                {/* Selector de Rango */}
                <div className="flex justify-center mb-8">
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    {(['24h', '7d', '30d'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setHistoryRange(r)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                          historyRange === r 
                            ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                      >
                        {r === '24h' ? 'Últimas 24h' : r === '7d' ? '7 Días' : '30 Días'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gráfica Grande */}
                <div className="h-64 w-full flex items-end gap-2 px-4">
                  {getDetailedHistoryData(historyRange).map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                      <div 
                        className="w-full bg-blue-500/20 dark:bg-blue-500/10 rounded-t-sm border-t-2 border-blue-500 relative transition-all group-hover:bg-blue-500/40"
                        style={{ height: `${Math.max(d.value * 5, 5)}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          -{d.value}%
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 text-center mt-2 truncate w-full block">
                        {d.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
