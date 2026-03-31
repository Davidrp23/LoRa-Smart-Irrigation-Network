import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMediciones, getParcelaHistorico } from '../../services/dataService';
import type { Parcela, Dispositivo } from '../../utils/mapUtils';

import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { es } from 'date-fns/locale'; // Para tenerlo en español

// Registramos el idioma español
registerLocale('es', es);

export type HistoryItem = { type: 'parcela', data: Parcela } | { type: 'mota', data: Dispositivo };

// Componente de Gráfico de Humedad Detallado con Navegación
const DetailedHumidityChart = ({ data }: { data: { label: string, value: number }[] }) => {
  const ITEMS_PER_PAGE = 48;
  const [startIndex, setStartIndex] = useState(Math.max(0, data.length - ITEMS_PER_PAGE));
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);

  useEffect(() => {
    setStartIndex(Math.max(0, data.length - ITEMS_PER_PAGE));
  }, [data]);

  const displayData = data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  const handlePrev = () => setStartIndex(prev => Math.max(0, prev - ITEMS_PER_PAGE));
  const handleNext = () => setStartIndex(prev => Math.min(data.length - ITEMS_PER_PAGE, prev + ITEMS_PER_PAGE));

  const canPrev = startIndex > 0;
  const canNext = startIndex + ITEMS_PER_PAGE < data.length;
  const stepX = Math.max(1, Math.floor(displayData.length / 6));

  // 1. Calculamos los puntos FUERA del SVG para poder usarlos en el HTML flotante
  const points = displayData.map((d, i) => {
    const x = 30 + (i * (540 / Math.max(displayData.length - 1, 1)));
    const y = 300 - 30 - ((d.value / 100) * 240);
    return { x, y, ...d };
  });

  const pathD = points.map((p, i, a) => {
    if (i === 0) return `M ${p.x},${p.y}`;
    const prev = a[i - 1];
    const cp1x = prev.x + (p.x - prev.x) * 0.5;
    return `C ${cp1x},${prev.y} ${cp1x},${p.y} ${p.x},${p.y}`;
  }).join(' ');

  const areaD = points.length > 0 ? `${pathD} L ${points[points.length-1].x},270 L ${points[0].x},270 Z` : '';
  const segmentWidth = 540 / Math.max(displayData.length - 1, 1);

  return (
    <div className="w-full">
       <div className="flex justify-end mb-2">
         {(canPrev || canNext) && (
           <div className="flex items-center bg-slate-200/50 dark:bg-zinc-800/50 rounded-md border border-slate-300/70 dark:border-zinc-700/50 shadow-sm">
             <button onClick={handlePrev} disabled={!canPrev} className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"><ChevronLeft size={16} /></button>
             <div className="w-[1px] h-4 bg-slate-300 dark:bg-zinc-700"></div>
             <button onClick={handleNext} disabled={!canNext} className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"><ChevronRight size={16} /></button>
           </div>
         )}
       </div>
       <div className="h-96 w-full">
          <div className="relative h-full w-full select-none">
            {/* Gráfica SVG */}
            <svg width="100%" height="100%" viewBox="0 0 600 300" className="overflow-visible font-sans" preserveAspectRatio="none">
              {[0, 25, 50, 75, 100].map(v => {
                const y = 300 - 30 - ((v / 100) * 240);
                return (
                  <g key={v}>
                    <line x1="30" y1={y} x2="600" y2={y} className="stroke-gray-200/40 dark:stroke-white/5" strokeWidth="1" />
                    <text x="25" y={y + 3} textAnchor="end" className="text-[11px] fill-gray-400 dark:fill-zinc-500 font-medium">{v}</text>
                  </g>
                )
              })}

              {points.length > 0 && (
                <>
                  <defs>
                    <linearGradient id="chart-gradient-humidity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
                    </linearGradient>
                  </defs>
                  <path d={areaD} fill="url(#chart-gradient-humidity)" />
                  <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 4px 6px rgba(16, 185, 129, 0.2))' }} />
                  
                  {points.map((p, i) => (
                    <g key={i} onMouseEnter={() => setHoveredChartIndex(i)} onMouseLeave={() => setHoveredChartIndex(null)} className="cursor-pointer">
                      <rect x={p.x - segmentWidth/2} y={0} width={segmentWidth} height={300} fill="transparent" />
                      
                      {hoveredChartIndex === i && (
                        <line x1={p.x} y1={0} x2={p.x} y2={270} strokeDasharray="4 4" stroke="#10b981" strokeWidth="1" />
                      )}

                      {hoveredChartIndex === i && (
                        <>
                          <circle cx={p.x} cy={p.y} r="8" fill="#10b981" fillOpacity="0.2" />
                          <circle cx={p.x} cy={p.y} r="4" fill="#10b981" className="stroke-white dark:stroke-zinc-950" strokeWidth="2" />
                        </>
                      )}
                      
                      {(hoveredChartIndex === i || (i % stepX === 0 && hoveredChartIndex === null)) && (
                        <text x={p.x} y={290} textAnchor="middle" className={`text-[11px] transition-all ${hoveredChartIndex === i ? 'fill-gray-600 dark:fill-zinc-300 font-bold' : 'fill-gray-400 dark:fill-zinc-500 font-medium'}`}>
                          {p.label.split(',')[0]}
                        </text>
                      )}
                    </g>
                  ))}
                </>
              )}
            </svg>

            {/* 2. TOOLTIP HTML FLOTANTE (Inmune a la deformación del SVG) */}
            {/* 2. TOOLTIP HTML FLOTANTE (Arreglado el posicionamiento y tamaño) */}
            <AnimatePresence>
              {hoveredChartIndex !== null && points[hoveredChartIndex] && (
                <motion.div 
                  // Le decimos a framer-motion que lo mantenga siempre centrado (-50%) y arriba (-100%)
                  initial={{ opacity: 0, scale: 0.9, x: "-50%", y: "-100%" }}
                  animate={{ opacity: 1, scale: 1, x: "-50%", y: "-100%" }}
                  exit={{ opacity: 0, scale: 0.9, x: "-50%", y: "-100%" }}
                  transition={{ duration: 0.1 }}
                  className="absolute pointer-events-none z-50 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 shadow-lg dark:shadow-xl border border-slate-200 dark:border-zinc-700/50 rounded-lg px-4 py-2.5 min-w-[85px]"
                  style={{
                    // Posicionamiento X e Y anclado al punto
                    left: `${(points[hoveredChartIndex].x / 600) * 100}%`,
                    // El -14px le da el margen perfecto para que no toque el círculo verde
                    top: `calc(${(points[hoveredChartIndex].y / 300) * 100}% - 14px)`,
                  }}
                >
                  {/* Texto más grande */}
                  <span className="font-bold text-[17px] text-emerald-600 dark:text-emerald-500 leading-none">
                    {points[hoveredChartIndex].value}%
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mt-1.5 leading-none whitespace-nowrap">
                    {points[hoveredChartIndex].label}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
       </div>
    </div>
  );
};

interface HumidityHistoryModalProps {
  item: HistoryItem | null;
  onClose: () => void;
  onError: (message: string) => void;
}

export default function HumidityHistoryModal({ item, onClose, onError }: HumidityHistoryModalProps) {
  const [chartData, setChartData] = useState<{label: string, value: number}[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'custom'>('24h');
  
  // Cambiamos el estado a objetos Date
  const [customStartDate, setCustomStartDate] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d;
  });
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());

  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistoryData = async (range: string, startStr?: string, endStr?: string) => {
    if (!item) return;
    setIsLoadingHistory(true);
    try {
      let start = new Date();
      let end = new Date();
      
      if (range === '24h') start.setHours(start.getHours() - 24);
      else if (range === '7d') start.setDate(start.getDate() - 7);
      else if (range === '30d') start.setDate(start.getDate() - 30);
      else if (range === 'custom' && startStr && endStr) {
        start = new Date(startStr);
        end = new Date(endStr);
      }

      let rawData;
      if (item.type === 'mota') {
        rawData = await getMediciones(item.data.id, start, end);
      } else {
        rawData = await getParcelaHistorico(item.data.id, start, end);
      }

      const formattedData = rawData.map((d: any) => ({
        label: new Date(d.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
        value: Math.round(d.humedad || d.humedadMedia)
      }));

      setChartData(formattedData);
    } catch (error) {
      console.error("Error cargando historial:", error);
      onError((error as Error).message || 'No se pudo cargar el historial');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (item && timeRange !== 'custom') loadHistoryData(timeRange);
  }, [timeRange, item]);

  useEffect(() => {
    if (item) setTimeRange('24h');
    else setChartData([]);
  }, [item]);

  return (
    <AnimatePresence>
      {item && (
        <div className="history-modal-container fixed top-0 bottom-0 right-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 md:p-6">
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="w-full max-w-7xl overflow-hidden rounded-3xl bg-white dark:bg-zinc-950 shadow-2xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center justify-between p-6">
              <div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-zinc-100 flex items-center gap-3">
                  <BarChart3 className="text-emerald-500"/> 
                  {item.type === 'parcela' ? 'Historial de Humedad (Media)' : 'Historial de Humedad'}
                </h3>
                <div className="flex items-center gap-2 mt-1.5">
                  <p className="text-sm text-slate-500 dark:text-zinc-400">
                  {item.type === 'parcela' ? (item.data as Parcela).nombre : (item.data as Dispositivo).nombre || 'Sensor sin nombre'}
                  </p>
                  {item.type === 'parcela' && <span className="text-[10px] bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">Media de sensores</span>}
                </div>
              </div>
              <button onClick={onClose} className="rounded-full p-2 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-8">
              <div className="flex flex-col items-center justify-center mb-8 gap-4">
                <div className="relative flex bg-gray-100 dark:bg-zinc-800/50 p-1 rounded-full w-max overflow-x-auto">
                  {(['24h', '7d', '30d', 'custom'] as const).map((r) => (
                    <button key={r} onClick={() => setTimeRange(r)} className={`relative px-5 py-1.5 rounded-full text-sm font-semibold transition-colors whitespace-nowrap z-10 ${timeRange !== r ? 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200' : 'text-gray-900 dark:text-white'}`}>
                      {r === '24h' ? '24 Horas' : r === '7d' ? '7 Días' : r === '30d' ? '30 Días' : 'Personalizado'}
                      {timeRange === r && <motion.div layoutId="active-pill-humidity" className="absolute inset-0 bg-white dark:bg-zinc-700 shadow-sm rounded-full -z-10" />}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {timeRange === 'custom' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex flex-wrap items-end justify-center gap-4 overflow-hidden">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase mb-1 block">Desde</label>
                        <DatePicker
                          selected={customStartDate}
                          onChange={(date: Date | null) => { if (date) setCustomStartDate(date) }}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="dd/MM/yyyy HH:mm"
                          locale="es"
                          className="flora-input !h-9 !py-1.5 !text-xs w-full cursor-pointer"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-500 uppercase mb-1 block">Hasta</label>
                        <DatePicker
                          selected={customEndDate}
                          // ¡Aquí estaba el fallo! Ahora ya estamos leyendo setCustomEndDate
                          onChange={(date: Date | null) => { if (date) setCustomEndDate(date) }}
                          showTimeSelect
                          timeFormat="HH:mm"
                          timeIntervals={15}
                          dateFormat="dd/MM/yyyy HH:mm"
                          locale="es"
                          className="flora-input !h-9 !py-1.5 !text-xs w-full cursor-pointer"
                        />
                      </div>
                      {/* Fíjate que al botón le pasamos .toISOString() para que el fetch reciba el formato que espera */}
                      <button onClick={() => loadHistoryData('custom', customStartDate.toISOString(), customEndDate.toISOString())} className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 px-5 rounded-lg text-xs font-bold shadow-sm transition-colors">
                        Aplicar
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {isLoadingHistory ? (
                <div className="h-96 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>
              ) : chartData.length > 0 ? (
                <DetailedHumidityChart data={chartData} />
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-center text-slate-500 dark:text-zinc-500 bg-slate-100/50 dark:bg-zinc-900/50 rounded-xl">
                  <BarChart3 size={48} className="mb-4 opacity-40" />
                  <span className="font-bold text-lg text-slate-700 dark:text-zinc-300">No hay datos históricos</span>
                  <span className="text-sm max-w-xs mt-1">No se han registrado mediciones para {item?.type === 'parcela' ? 'esta parcela' : 'este sensor'} en el período seleccionado.</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}