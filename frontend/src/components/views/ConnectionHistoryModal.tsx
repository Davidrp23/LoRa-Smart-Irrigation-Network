import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, BarChart3, ChevronLeft, ChevronRight, Rss, Wifi, X } from 'lucide-react';
import { getMediciones, getRouterReportes } from '../../services/dataService';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale';

registerLocale('es', es);

// Tipos (copiados de DispositivosView para evitar dependencias circulares o exportaciones complejas)
interface DispositivoBase { id: number; tipo: 'router' | 'mota'; nombre?: string | null; }
interface Router extends DispositivoBase { tipo: 'router'; }
interface Mota extends DispositivoBase { tipo: 'mota'; }
type Dispositivo = Router | Mota;

interface LineConfig {
  key: string;
  name: string;
  color: string;
}

interface MultiLineChartProps {
  data: (Record<string, any> & { label: string })[];
  lines: LineConfig[];
  title: string;
  unit: string;
}

const MultiLineChart = ({ data, lines, title, unit }: MultiLineChartProps) => {
  const ITEMS_PER_PAGE = 48;
  const [startIndex, setStartIndex] = useState(Math.max(0, data.length - ITEMS_PER_PAGE));
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    setStartIndex(Math.max(0, data.length - ITEMS_PER_PAGE));
  }, [data]);

  const displayData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  const handlePrev = () => setStartIndex(prev => Math.max(0, prev - ITEMS_PER_PAGE));
  const handleNext = () => setStartIndex(prev => Math.min(data.length - ITEMS_PER_PAGE, prev + ITEMS_PER_PAGE));
  const canPrev = startIndex > 0;
  const canNext = startIndex + ITEMS_PER_PAGE < data.length;

  const allValues = displayData.flatMap(d => lines.map(l => d[l.key] as number).filter(v => v !== null && v !== undefined));
  const yMax = allValues.length > 0 ? Math.max(...allValues) : 0;
  const yMin = allValues.length > 0 ? Math.min(...allValues) : 0;

  const getPath = (lineKey: string) => {
    const points = displayData.map((d, i) => {
      const value = d[lineKey];
      if (value === null || value === undefined) return null;
      const x = (i / Math.max(1, displayData.length - 1)) * 100;
      const y = 100 - ((value - yMin) / Math.max(1, yMax - yMin)) * 100;
      return { x, y };
    }).filter(p => p !== null) as {x: number, y: number}[];

    if (points.length === 0) return "";
    return points.map((p, i) => (i === 0 ? 'M' : 'L') + ` ${p.x} ${p.y}`).join(' ');
  };

  return (
    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4">
      <h4 className="font-bold text-sm text-slate-700 dark:text-zinc-300">{title}</h4>
      <div className="relative h-48 w-full mt-4" onMouseLeave={() => setHoveredIndex(null)}>
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="overflow-visible">
          {/* Grid lines, paths, etc. */}
          {lines.map(line => (
            <path key={line.key} d={getPath(line.key)} stroke={line.color} strokeWidth="0.5" fill="none" />
          ))}

          {/* Interaction layer */}
          {displayData.map((_, i) => (
            <rect key={i} x={(i / Math.max(1, displayData.length - 1)) * 100 - (100 / Math.max(1, displayData.length -1) / 2)} y="0" width={100 / Math.max(1, displayData.length - 1)} height="100" fill="transparent" onMouseEnter={() => setHoveredIndex(i)} />
          ))}

          {hoveredIndex !== null && (
             <line x1={(hoveredIndex / Math.max(1, displayData.length - 1)) * 100} y1="0" x2={(hoveredIndex / Math.max(1, displayData.length - 1)) * 100} y2="100" strokeDasharray="2 2" className="stroke-slate-400 dark:stroke-zinc-600" strokeWidth="0.3" />
          )}
        </svg>
        
        <AnimatePresence>
        {hoveredIndex !== null && displayData[hoveredIndex] && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: 1,
              scale: 1,
              left: `${(hoveredIndex / Math.max(1, displayData.length - 1)) * 100}%`,
              x: hoveredIndex > (displayData.length - 1) / 2 ? 'calc(-100% - 1rem)' : '1rem',
            }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              // Aplicamos una animación de muelle por defecto (a 'left') para el seguimiento suave.
              stiffness: 500,
              damping: 35,
              // Forzamos que el cambio de lado (eje 'x') sea instantáneo para evitar el "vuelo"
              // al cruzar el centro de la gráfica.
              x: { type: 'tween', duration: 0 }
            }}
            className="absolute top-0 pointer-events-none z-10 p-2.5 rounded-lg shadow-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/50 min-w-[120px]"
          >
            <p className="text-xs font-bold text-slate-600 dark:text-zinc-300 mb-2">{displayData[hoveredIndex].label}</p>
            {lines.map(line => {
              const value = displayData[hoveredIndex][line.key];
              return (
                <div key={line.key} className="flex justify-between items-center text-xs gap-4">
                  <span className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-zinc-400">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: line.color }} />
                    {line.name}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-zinc-100">
                    {value !== null && value !== undefined ? `${value} ${unit}` : 'N/A'}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
        </AnimatePresence>
      </div>
       <div className="flex justify-between items-center mt-2">
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
            Min: {yMin.toFixed(1)} {unit} / Max: {yMax.toFixed(1)} {unit}
          </p>
          {(canPrev || canNext) && (
            <div className="flex items-center bg-slate-200/50 dark:bg-zinc-800/50 rounded-md border border-slate-300/70 dark:border-zinc-700/50 shadow-sm">
              <button onClick={handlePrev} disabled={!canPrev} className="p-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"><ChevronLeft size={12} /></button>
              <div className="w-[1px] h-3 bg-slate-300 dark:bg-zinc-700"></div>
              <button onClick={handleNext} disabled={!canNext} className="p-1 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"><ChevronRight size={12} /></button>
            </div>
          )}
       </div>
    </div>
  );
};

interface ConnectionHistoryModalProps {
  device: Dispositivo;
  onClose: () => void;
  onError: (message: string) => void;
}

export default function ConnectionHistoryModal({ device, onClose, onError }: ConnectionHistoryModalProps) {
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'custom'>('24h');
  const [customStartDate, setCustomStartDate] = useState<Date>(() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; });
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchHistory = async (range: typeof timeRange, customStart?: Date, customEnd?: Date) => {
    setIsLoadingHistory(true);
    try {
      let start: Date, end: Date;
      if (range === 'custom' && customStart && customEnd) {
        start = customStart;
        end = customEnd;
      } else {
        end = new Date();
        start = new Date();
        if (range === '24h') start.setHours(start.getHours() - 24);
        else if (range === '7d') start.setDate(start.getDate() - 7);
        else if (range === '30d') start.setDate(start.getDate() - 30);
      }

      let rawData;
      if (device.tipo === 'mota') {
        rawData = await getMediciones(device.id, start, end);
      } else {
        rawData = await getRouterReportes(device.id, start, end);
      }
      setHistoryData(rawData);
    } catch (error) {
      console.error("Error cargando historial de conexión:", error);
      onError((error as Error).message || 'No se pudo cargar el historial');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (timeRange !== 'custom') {
      fetchHistory(timeRange);
    }
  }, [timeRange, device]);

  useEffect(() => {
    setTimeRange('24h');
  }, [device]);

  const formattedData = historyData.map(d => ({
    ...d,
    label: new Date(d.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
  }));

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }} 
        animate={{ opacity: 1, scale: 1, y: 0 }} 
        exit={{ opacity: 0, scale: 0.95, y: 20 }} 
        className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white dark:bg-zinc-950 shadow-2xl border border-slate-200 dark:border-white/10"
      >
        <div className="flex items-center justify-between p-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-zinc-100 flex items-center gap-3">
              {device.tipo === 'mota' ? <Rss className="text-emerald-500"/> : <Wifi className="text-emerald-500"/>}
              {device.tipo === 'mota' ? 'Historial de Señal' : 'Historial de Tráfico'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400">
              {device.nombre || (device.tipo === 'mota' ? 'Sensor sin nombre' : 'Router genérico')}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto">
          <div className="flex flex-col items-center justify-center mb-8 gap-4">
            <div className="relative flex bg-gray-100 dark:bg-zinc-800/50 p-1 rounded-full w-max overflow-x-auto">
              {(['24h', '7d', '30d', 'custom'] as const).map((r) => (
                <button key={r} onClick={() => setTimeRange(r)} className={`relative px-5 py-1.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap z-10 ${timeRange !== r ? 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200' : 'text-gray-900 dark:text-white'}`}>
                  {r === '24h' ? '24 Horas' : r === '7d' ? '7 Días' : r === '30d' ? '30 Días' : 'Personalizado'}
                  {timeRange === r && <motion.div layoutId="active-pill-connection" className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-sm rounded-full -z-10" />}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {timeRange === 'custom' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-end justify-center gap-4 overflow-hidden">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase mb-1 block">Desde</label>
                    <DatePicker selected={customStartDate} onChange={(date: Date | null) => { if (date) setCustomStartDate(date) }} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd/MM/yyyy HH:mm" locale="es" className="flora-input !h-9 !py-1.5 !text-xs w-full cursor-pointer" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase mb-1 block">Hasta</label>
                    <DatePicker selected={customEndDate} onChange={(date: Date | null) => { if (date) setCustomEndDate(date) }} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd/MM/yyyy HH:mm" locale="es" className="flora-input !h-9 !py-1.5 !text-xs w-full cursor-pointer" />
                  </div>
                  <button onClick={() => fetchHistory('custom', customStartDate, customEndDate)} className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 px-5 rounded-lg text-xs font-bold shadow-sm transition-colors">Aplicar</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isLoadingHistory ? (
            <div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
          ) : historyData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {device.tipo === 'mota' && (
                <>
                  <MultiLineChart 
                    data={formattedData}
                    lines={[{ key: 'rssi', name: 'RSSI', color: '#3b82f6' }]}
                    title="Potencia de Señal Recibida"
                    unit="dBm"
                  />
                  <MultiLineChart 
                    data={formattedData}
                    lines={[{ key: 'snr', name: 'SNR', color: '#10b981' }]}
                    title="Relación Señal/Ruido"
                    unit="dB"
                  />
                   <MultiLineChart 
                    data={formattedData}
                    lines={[{ key: 'erroresRxMota', name: 'Errores', color: '#ef4444' }]}
                    title="Errores de Recepción (Mota)"
                    unit=""
                  />
                </>
              )}
              {device.tipo === 'router' && (
                <>
                  <MultiLineChart 
                    data={formattedData}
                    lines={[
                      { key: 'paquetesEnviados', name: 'Enviados', color: '#3b82f6' },
                      { key: 'paquetesRecibidos', name: 'Recibidos', color: '#10b981' }
                    ]}
                    title="Volumen de Paquetes"
                    unit=""
                  />
                  <MultiLineChart 
                    data={formattedData}
                    lines={[
                      { key: 'erroresTx', name: 'Errores TX', color: '#f97316' },
                      { key: 'erroresRx', name: 'Errores RX', color: '#ef4444' },
                      { key: 'erroresCrc', name: 'Errores CRC', color: '#a855f7' }
                    ]}
                    title="Errores de Comunicación"
                    unit=""
                  />
                </>
              )}
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center text-center text-slate-500 dark:text-zinc-500 bg-slate-100/50 dark:bg-zinc-900/50 rounded-xl">
              <Activity size={48} className="mb-4 opacity-40" />
              <span className="font-bold text-lg text-slate-700 dark:text-zinc-300">No hay datos de conexión</span>
              <span className="text-sm max-w-xs mt-1">No se han registrado reportes para este dispositivo en el período seleccionado.</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}