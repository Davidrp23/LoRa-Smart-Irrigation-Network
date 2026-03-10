import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Signal, Radio, BarChart3, Wifi } from 'lucide-react';
import { getMediciones, getRouterReportes } from '../../services/dataService';

// Tipos duplicados de DispositivosView para que el componente sea autocontenido
interface DispositivoBase { id: number; tipo: 'router' | 'mota'; canal?: number | null; nombre?: string | null; modelo?: string | null; }
interface Router extends DispositivoBase { tipo: 'router'; paquetesEnviados: number; paquetesRecibidos: number; erroresTx: number; erroresRx: number; erroresCrc: number; }
interface Mota extends DispositivoBase { tipo: 'mota'; rssi: number | null; snr: number | null; erroresRx: number; }
type Dispositivo = Router | Mota;

type ChartSeries = {
  name: string;
  color: string;
  data: { date: string; value: number }[];
};

// Componente de Gráfico Multi-Línea para comparar métricas
const MultiLineChart = ({ series, title }: { series: ChartSeries[], title: string }) => {
  if (!series.some(s => s.data.length > 0)) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground bg-muted/30 rounded-xl border">
        <BarChart3 size={32} className="mb-2 opacity-50" />
        <span className="font-bold">No hay datos históricos para</span>
        <span className="text-sm">"{title}" en este período.</span>
      </div>
    );
  }

  const allValues = series.flatMap(s => s.data.map(d => d.value));
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue === 0 ? 1 : maxValue - minValue;

  return (
    <div className="p-4 border rounded-xl bg-muted/20">
      <h4 className="font-bold text-sm text-foreground mb-4">{title}</h4>
      <div className="h-64 w-full relative">
        <svg width="100%" height="100%" viewBox="0 0 500 200" preserveAspectRatio="none">
          {/* Eje Y y líneas de guía */}
          {[0, 0.25, 0.5, 0.75, 1].map(tick => {
            const y = 190 - (tick * 180);
            const value = minValue + (tick * valueRange);
            return (
              <g key={tick}>
                <line x1="30" y1={y} x2="500" y2={y} className="stroke-border" strokeWidth="1" />
                <text x="25" y={y + 4} textAnchor="end" className="text-[10px] fill-muted-foreground">{value.toFixed(1)}</text>
              </g>
            );
          })}

          {/* Paths de las series */}
          {series.map(s => {
            if (s.data.length === 0) return null;
            const pathD = "M " + s.data.map((d, i) => {
              const x = 30 + (i / (s.data.length - 1 || 1)) * 470;
              const y = 190 - ((d.value - minValue) / valueRange) * 180;
              return `${x},${y}`;
            }).join(" L ");
            return <path key={s.name} d={pathD} fill="none" stroke={s.color} strokeWidth="2" />;
          })}
        </svg>
      </div>
      {/* Leyenda */}
      <div className="flex justify-center gap-4 mt-2">
        {series.map(s => (
          <div key={s.name} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
            <span className="font-medium text-muted-foreground">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Contenido del modal original, ahora un sub-componente
const CurrentStats = ({ device }: { device: Dispositivo }) => {
  const isRouter = device.tipo === 'router';
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/50">
        <span className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Radio size={16} /> Canal LoRaWAN</span>
        <span className="text-lg font-bold text-foreground">CH {device.canal ?? '-'}</span>
      </div>

      {isRouter ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl border border-border/50">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Enviados</div>
            <div className="text-xl font-mono font-bold text-foreground">{device.paquetesEnviados}</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl border border-border/50">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Recibidos</div>
            <div className="text-xl font-mono font-bold text-foreground">{device.paquetesRecibidos}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-200 dark:border-red-900/30">
            <div className="text-[10px] font-bold text-red-600/70 dark:text-red-400/70 uppercase tracking-wider mb-1">Err. TX/RX</div>
            <div className="text-lg font-mono font-bold text-red-700 dark:text-red-400">{device.erroresTx} / {device.erroresRx}</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-200 dark:border-amber-900/30">
            <div className="text-[10px] font-bold text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wider mb-1">Err. CRC</div>
            <div className="text-lg font-mono font-bold text-amber-700 dark:text-amber-400">{device.erroresCrc}</div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Intensidad (RSSI)</span>
            <span className={`font-mono font-bold ${(device.rssi || -999) > -100 ? 'text-green-600' : 'text-amber-600'}`}>{device.rssi ?? '--'} dBm</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Calidad (SNR)</span>
            <span className="font-mono font-bold text-foreground">{device.snr ?? '--'} dB</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Paquetes Perdidos</span>
            <span className="font-mono font-bold text-red-500">{device.erroresRx}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const calculateDeltas = (data: any[], key: string) => {
  if (!data || data.length < 2) return [];
  const deltas = [];
  for (let i = 1; i < data.length; i++) {
    const current = data[i][key] ?? 0;
    const prev = data[i - 1][key] ?? 0;
    const delta = current >= prev ? current - prev : current; // Handle counter reset
    deltas.push({ date: data[i].fecha, value: delta });
  }
  return deltas;
};

export default function ConnectionHistoryModal({ device, onClose }: { device: Dispositivo, onClose: () => void }) {
  const [tab, setTab] = useState<'stats' | 'history'>('stats');
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [chartData, setChartData] = useState<ChartSeries[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'history' || !device) return;

    const fetchHistory = async () => {
      setIsLoading(true);
      const end = new Date();
      const start = new Date();
      if (range === '24h') start.setHours(start.getHours() - 24);
      else if (range === '7d') start.setDate(start.getDate() - 7);
      else if (range === '30d') start.setDate(start.getDate() - 30);

      try {
        if (device.tipo === 'mota') {
          const data = await getMediciones(device.id, start, end);
          setChartData([
            { name: 'RSSI', color: '#22c55e', data: data.map((d: any) => ({ date: d.fecha, value: d.rssi })).filter((d: { value: number | null }) => d.value !== null) },
            { name: 'SNR', color: '#3b82f6', data: data.map((d: any) => ({ date: d.fecha, value: d.snr })).filter((d: { value: number | null }) => d.value !== null) },
            { name: 'Pérdidas', color: '#ef4444', data: calculateDeltas(data, 'erroresRxMota') }
          ]);
        } else if (device.tipo === 'router') {
          const data = await getRouterReportes(device.id, start, end);
          setChartData([
            { name: 'Enviados', color: '#3b82f6', data: calculateDeltas(data, 'paquetesEnviados') },
            { name: 'Recibidos', color: '#14b8a6', data: calculateDeltas(data, 'paquetesRecibidos') },
            { name: 'Err. TX/RX', color: '#ef4444', data: calculateDeltas(data, 'erroresTx').map((d, i) => ({ ...d, value: d.value + calculateDeltas(data, 'erroresRx')[i]?.value || 0 })) },
            { name: 'Err. CRC', color: '#f97316', data: calculateDeltas(data, 'erroresCrc') }
          ]);
        }
      } catch (error) {
        console.error("Error fetching history:", error);
        setChartData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [tab, range, device]);

  const isRouter = device.tipo === 'router';
  const title = isRouter ? 'Análisis de Tráfico' : 'Calidad de Señal';
  const Icon = isRouter ? Wifi : Signal;

  const motaCharts = [
    { title: "Calidad de Señal", series: chartData.filter(s => s.name === 'RSSI' || s.name === 'SNR') },
    { title: "Pérdida de Paquetes", series: chartData.filter(s => s.name === 'Pérdidas') }
  ];
  const routerCharts = [
    { title: "Tráfico de Paquetes", series: chartData.filter(s => s.name === 'Enviados' || s.name === 'Recibidos') },
    { title: "Conteo de Errores", series: chartData.filter(s => s.name === 'Err. TX/RX' || s.name === 'Err. CRC') }
  ];
  const chartsToDisplay = isRouter ? routerCharts : motaCharts;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-3xl overflow-hidden rounded-3xl bg-card shadow-2xl border border-border"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-5">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Icon className="text-blue-500" size={20} /> {title}
            </h3>
            <p className="text-sm text-muted-foreground">{device.nombre || device.modelo}</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Pestañas */}
            <div className="flex bg-muted p-1 rounded-xl">
              <button onClick={() => setTab('stats')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${tab === 'stats' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                Estado Actual
              </button>
              <button onClick={() => setTab('history')} className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${tab === 'history' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                Historial
              </button>
            </div>
            <button onClick={onClose} className="rounded-full bg-muted p-1.5 text-muted-foreground hover:bg-accent transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        {tab === 'stats' ? (
          <CurrentStats device={device} />
        ) : (
          <div className="p-5 space-y-6">
            {/* Selector de Rango */}
            <div className="flex justify-center">
              <div className="flex bg-muted p-1 rounded-xl">
                {(['24h', '7d', '30d'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${range === r ? 'bg-background text-blue-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {r === '24h' ? 'Últimas 24h' : r === '7d' ? '7 Días' : '30 Días'}
                  </button>
                ))}
              </div>
            </div>

            {/* Gráficas */}
            {isLoading ? (
              <div className="h-72 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {chartsToDisplay.map(chart => (
                  <MultiLineChart key={chart.title} title={chart.title} series={chart.series} />
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}