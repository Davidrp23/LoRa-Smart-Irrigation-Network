import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Clock, Droplets, Sprout, Layers, Cloud, Calendar,
  Sun, CloudRain, Plus, CheckCircle2, Pencil, Trash2, CloudLightning, Info, Gauge
} from 'lucide-react';
import {
  getTurnosRiego, createTurnoRiego, updateTurnoRiego, deleteTurnoRiego, getWeatherData
} from '../../services/dataService';
import type { Parcela } from '../../utils/mapUtils';

// Componente de Input de Hora 24h Interactivo
const TimeInput24h = ({ value, onChange, isInvalid }: { value: string, onChange: (v: string) => void, isInvalid: boolean }) => {
  const [h, m] = value.includes(':') ? value.split(':') : ['06', '00'];

  const handleHChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(-1);
    onChange(`${val}:${m}`);
    if (val.length === 2) {
      const parent = e.target.parentElement;
      if (parent) {
        const mInput = parent.querySelectorAll('input')[1];
        if (mInput) { mInput.focus(); mInput.select(); }
      }
    }
  };

  const handleMChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(-1);
    onChange(`${h}:${val}`);
  };

  const handleMKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && m === '') {
      e.preventDefault();
      const parent = e.currentTarget.parentElement;
      if (parent) {
        const hInput = parent.querySelectorAll('input')[0];
        if (hInput) { 
          hInput.focus();
          onChange(`${h.slice(0, -1)}:${m}`);
        }
      }
    }
  };

  const blurH = (e: React.FocusEvent<HTMLInputElement>) => { 
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(-1);
    if (val === '') val = '00'; else if (val.length === 1) val = '0' + val; 
    onChange(`${val}:${m}`); 
  };
  
  const blurM = (e: React.FocusEvent<HTMLInputElement>) => { 
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 2) val = val.slice(-1);
    if (val === '') val = '00'; else if (val.length === 1) val = '0' + val; 
    onChange(`${h}:${val}`); 
  };

  return (
    <div className={`flex items-center w-full rounded-xl border bg-background transition-all h-[48px] ${isInvalid ? 'border-red-500/50 ring-2 ring-red-500/20' : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'}`}>
      <input 
        type="text" value={h} onChange={handleHChange} onBlur={blurH} onFocus={e => e.currentTarget.select()} onClick={e => e.currentTarget.select()}
        className="w-1/2 h-full text-right bg-transparent border-none focus:ring-0 p-2 text-xl font-mono outline-none text-foreground placeholder:text-muted-foreground/30" placeholder="00"
      />
      <span className="text-xl font-mono font-bold text-foreground mb-[2px] opacity-50">:</span>
      <input 
        type="text" value={m} onChange={handleMChange} onKeyDown={handleMKeyDown} onBlur={blurM} onFocus={e => e.currentTarget.select()} onClick={e => e.currentTarget.select()}
        className="w-1/2 h-full text-left bg-transparent border-none focus:ring-0 p-2 text-xl font-mono outline-none text-foreground placeholder:text-muted-foreground/30" placeholder="00"
      />
    </div>
  );
};

// Formateador de minutos a Horas y Minutos
const formatDuration = (mins: number | null | undefined) => {
  if (!mins) return '--';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// Textos agronómicos personalizados por tipo de suelo
const getSoilRecommendation = (soilType?: string) => {
  if (!soilType) return 'Analizando capacidad de retención. El algoritmo ajusta automáticamente la duración según el déficit hídrico.';
  const lower = soilType.toLowerCase();
  if (lower.includes('arenos') || lower.includes('arena')) return `El sistema ha calculado una retención de agua media-baja debido al suelo ${soilType.toLowerCase()}. Se requieren riegos cortos pero frecuentes para evitar el drenaje profundo y el lavado de nutrientes.`;
  if (lower.includes('arcillos') || lower.includes('arcilla')) return `El sistema ha detectado una retención de agua alta y baja infiltración por el suelo ${soilType.toLowerCase()}. Se aplicarán riegos más lentos y espaciados para prevenir encharcamientos.`;
  if (lower.includes('franc')) return `El suelo ${soilType.toLowerCase()} presenta un equilibrio ideal. El sistema aplicará un régimen de riego moderado, optimizando la relación entre retención y oxigenación de raíces.`;
  if (lower.includes('limos') || lower.includes('limo')) return `Para el suelo ${soilType.toLowerCase()}, el sistema aplicará dosis medias. Retiene agua adecuadamente pero requiere pausas calculadas para evitar la compactación.`;
  
  return `El sistema ajusta dinámicamente las frecuencias y tiempos de riego basándose en las propiedades hídricas del suelo ${soilType.toLowerCase()}.`;
};

export default function IrrigationDecisionModal({
  isOpen,
  parcel,
  onClose
}: {
  isOpen: boolean;
  parcel: Parcela | null;
  onClose: () => void;
}) {
  const [turnos, setTurnos] = useState<any[]>([]);
  const [isLoadingTurnos, setIsLoadingTurnos] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newHora, setNewHora] = useState('06:00');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editHora, setEditHora] = useState('');
  
  // Weather State
  const [weatherData, setWeatherData] = useState<any>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);

  const fetchTurnos = async () => {
    if (!parcel) return;
    setIsLoadingTurnos(true);
    try {
      const data = await getTurnosRiego(parcel.id);
      setTurnos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingTurnos(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !parcel) return;

    const fetchWeather = async () => {
      setIsLoadingWeather(true);
      try {
        const lat = (parcel as any).latitudCentro || (parcel as any).lat || 37.2812;
        const lng = (parcel as any).longitudCentro || (parcel as any).lng || -6.0348;
        const tz = parcel.zonaHoraria || 'Europe/Madrid';
        const data = await getWeatherData(lat, lng, tz);
        setWeatherData(data);
      } catch (error) {
        console.error("Error al obtener clima:", error);
      } finally {
        setIsLoadingWeather(false);
      }
    };

    fetchWeather();
    fetchTurnos();
  }, [isOpen, parcel]);

  const handleAdd = async () => {
    if (!parcel) return;
    const isNewHoraFormatValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(newHora);
    const isNewHoraDuplicate = turnos.some(t => t.horaConfigurada === newHora);
    if (!isNewHoraFormatValid || isNewHoraDuplicate) return;

    try {
      await createTurnoRiego(parcel.id, newHora);
      setIsAdding(false);
      setNewHora('06:00');
      fetchTurnos();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdate = async (id: number) => {
    const isEditHoraFormatValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(editHora);
    const isEditHoraDuplicate = turnos.some(t => t.id !== id && t.horaConfigurada === editHora);
    if (!isEditHoraFormatValid || isEditHoraDuplicate) return;

    try {
      await updateTurnoRiego(id, editHora);
      setEditingId(null);
      fetchTurnos();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTurnoRiego(id);
      fetchTurnos();
    } catch (e) {
      console.error(e);
    }
  };

  // Procesamiento de datos del clima
  const daily = weatherData?.daily;
  const forecast = daily ? daily.time.map((timeStr: string, i: number) => {
    const d = new Date(timeStr);
    const today = new Date();
    let dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });
    
    if (d.toDateString() === today.toDateString()) {
      dayName = 'Hoy';
    } else {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (d.toDateString() === tomorrow.toDateString()) {
        dayName = 'Mañ';
      }
    }

    const rain = daily.precipitation_sum[i];
    let Icon = Sun;
    if (rain > 10) Icon = CloudLightning;
    else if (rain > 0) Icon = CloudRain;
    else if (daily.temperature_2m_max[i] < 20) Icon = Cloud;

    return {
      day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      tempMax: Math.round(daily.temperature_2m_max[i]),
      tempMin: Math.round(daily.temperature_2m_min[i]),
      rain: rain,
      et0: daily.et0_fao_evapotranspiration[i],
      icon: Icon,
    };
  }) : [];

  const totalRain7d = daily ? daily.precipitation_sum.reduce((a:number,b:number)=>a+b, 0).toFixed(1) : 0;
  const totalEt0 = daily ? daily.et0_fao_evapotranspiration.reduce((a:number,b:number)=>a+b, 0).toFixed(1) : 0;

  const rainToday = daily ? daily.precipitation_sum[0].toFixed(1) : 0;
  const et0Today = daily ? daily.et0_fao_evapotranspiration[0].toFixed(1) : 0;

  // Validaciones UI
  const isNewHoraFormatValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(newHora);
  const isNewHoraDuplicate = turnos.some(t => t.horaConfigurada === newHora);
  const canAddNew = isNewHoraFormatValid && !isNewHoraDuplicate;

  const isEditHoraFormatValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(editHora);
  const isEditHoraDuplicate = turnos.some(t => t.id !== editingId && t.horaConfigurada === editHora);
  const canEdit = isEditHoraFormatValid && !isEditHoraDuplicate;

  // Extraemos estado general en base al turno de riego activo/reciente
  const activeTurno = turnos.length > 0 ? (turnos.find(t => t.estadoRiego === 'Programado') || turnos[0]) : null;
  const bannerState = activeTurno?.estadoRiego || parcel?.proximoRiego || 'Sin programar';

  return (
    <AnimatePresence>
      {isOpen && parcel && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 md:p-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-6xl overflow-hidden rounded-[2rem] bg-card shadow-2xl flex flex-col max-h-[95vh] border border-border"
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-border p-6 md:px-8 bg-muted/20">
              <h3 className="text-2xl font-bold text-card-foreground flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><Droplets size={24}/></div>
                Gestión Inteligente de Riego: <span className="text-muted-foreground ml-1">{parcel.nombre}</span>
              </h3>
              <button onClick={onClose} className="rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-muted transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* Contenido Principal */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* IZQUIERDA: Contexto y Meteorología (2 Columnas) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                  
                  {/* Banner de Estado General */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[1.5rem] p-8 text-white shadow-xl shadow-blue-900/20 flex flex-col sm:flex-row justify-between items-start sm:items-center relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none"><Droplets size={200} /></div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 opacity-90 mb-2">
                        <Clock size={18} />
                        <span className="text-sm font-bold uppercase tracking-widest">Estado del Riego</span>
                      </div>
                      <div className="text-4xl font-extrabold">{bannerState}</div>
                      {activeTurno?.tiempoRiegoMin > 0 && (
                        <div className="text-sm font-medium mt-1.5 opacity-90">Tiempo de riego: <strong>{formatDuration(activeTurno.tiempoRiegoMin)}</strong></div>
                      )}
                      <div className="mt-3 inline-flex items-center bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-xl text-sm font-medium border border-white/10 shadow-sm">
                        <Droplets size={16} className="mr-2" /> Basado en Algoritmo de Balance Hídrico
                      </div>
                    </div>
                    <div className="text-left sm:text-right mt-6 sm:mt-0 relative z-10">
                      <div className="text-sm font-semibold opacity-90 uppercase tracking-wider mb-1">Humedad Suelo</div>
                      <div className="text-5xl font-extrabold flex items-baseline justify-start sm:justify-end gap-1">
                        {parcel.humedad || '--'}<span className="text-2xl">%</span>
                      </div>
                      <div className="text-sm font-medium opacity-80 mt-1">Objetivo: {(parcel as any).humedadObjetivo || '--'}%</div>
                    </div>
                  </div>

                  {/* Contexto Agronómico */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-muted/30 border border-border rounded-[1.5rem] p-6">
                      <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-5">
                        <Sprout size={16} /> Contexto Agronómico
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0"><Sprout size={20} /></div>
                          <div><div className="text-[10px] text-muted-foreground font-bold uppercase">Cultivo</div><div className="font-bold text-sm text-foreground leading-tight">{parcel.cultivo || '--'}</div></div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0"><Layers size={20} /></div>
                          <div><div className="text-[10px] text-muted-foreground font-bold uppercase">Suelo</div><div className="font-bold text-sm text-foreground leading-tight">{parcel.tipoSuelo || '--'}</div></div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"><Droplets size={20} /></div>
                          <div><div className="text-[10px] text-muted-foreground font-bold uppercase">Método Riego</div><div className="font-bold text-sm text-foreground leading-tight">{(parcel as any).tipoRiego || '--'}</div></div>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0"><Gauge size={20} /></div>
                          <div><div className="text-[10px] text-muted-foreground font-bold uppercase">Caudal Sist.</div><div className="font-bold text-sm text-foreground leading-tight">{(parcel as any).caudalRiegoLh ? `${(parcel as any).caudalRiegoLh} L/h` : '--'}</div></div>
                        </div>
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100 dark:border-amber-800/30 text-amber-800 dark:text-amber-300 leading-relaxed">
                        <div className="flex justify-between items-center mb-2.5">
                          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] opacity-80">
                            <Info size={14} /> Recomendación de Riego
                          </div>
                          <div className="font-bold opacity-90 text-[10px] uppercase shrink-0 bg-amber-200/60 dark:bg-amber-900/40 px-2 py-1 rounded-md">
                            Dosis máx: {(parcel as any).laminaMaximaRiego ? `${(parcel as any).laminaMaximaRiego} mm` : 'Auto'}
                          </div>
                        </div>
                        <p className="text-xs">{getSoilRecommendation(parcel.tipoSuelo)}</p>
                      </div>
                    </div>

                    <div className="bg-muted/30 border border-border rounded-[1.5rem] p-6 flex flex-col justify-between">
                      <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
                        <Cloud size={16} /> Balance Hídrico
                      </h4>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30">
                          <div className="text-[10px] font-bold text-blue-600/80 dark:text-blue-400/80 mb-1 uppercase tracking-wider">Lluvia (Hoy)</div>
                          <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 leading-none">{rainToday} <span className="text-xs font-bold opacity-70">mm</span></div>
                          <div className="text-[10px] font-medium text-muted-foreground mt-2 pt-1.5 border-t border-blue-100 dark:border-blue-800/50">Semana: <strong>{totalRain7d} mm</strong></div>
                        </div>
                        <div className="flex-1 bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-800/30">
                          <div className="text-[10px] font-bold text-orange-600/80 dark:text-orange-400/80 mb-1 uppercase tracking-wider">Evapotransp. (Hoy)</div>
                          <div className="text-2xl font-extrabold text-orange-500 leading-none">{et0Today} <span className="text-xs font-bold opacity-70">mm</span></div>
                          <div className="text-[10px] font-medium text-muted-foreground mt-2 pt-1.5 border-t border-orange-100 dark:border-orange-800/50">Semana: <strong>{totalEt0} mm</strong></div>
                        </div>
                      </div>
                      {Number(totalRain7d) > 15 ? (
                        <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-200 dark:border-blue-800/50 text-xs text-blue-800 dark:text-blue-300 font-medium">
                          <span className="font-bold">Aviso:</span> Lluvia significativa prevista. El riego se pausará automáticamente si la humedad es óptima.
                        </div>
                      ) : Number(totalEt0) > 30 ? (
                        <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-xl border border-orange-200 dark:border-orange-800/50 text-xs text-orange-800 dark:text-orange-300 font-medium">
                          <span className="font-bold">Aviso:</span> Alta evapotranspiración. El algoritmo repondrá el agua perdida en los próximos turnos.
                        </div>
                      ) : (
                         <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-xl border border-green-200 dark:border-green-800/50 text-xs text-green-800 dark:text-green-300 font-medium">
                          Condiciones estables. Riego operando en régimen de mantenimiento estándar.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Previsión Semanal Strip */}
                  <div className="bg-muted/10 border border-border rounded-[1.5rem] p-6 mt-2">
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-5">
                      <Calendar size={16} /> Pronóstico a 7 Días (Open-Meteo)
                    </h4>
                    {isLoadingWeather ? (
                      <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                        {forecast.map((day: any, i: number) => (
                          <div key={i} className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${day.rain > 0 ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 shadow-sm' : 'bg-background border-border shadow-sm'}`}>
                            <span className="text-xs font-extrabold text-muted-foreground mb-2">{day.day}</span>
                            <day.icon size={32} className={`mb-3 ${day.rain > 0 ? 'text-blue-500' : 'text-amber-400'}`} />
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-base font-bold text-foreground">{day.tempMax}°</span>
                                <span className="text-xs font-semibold text-muted-foreground">{day.tempMin}°</span>
                            </div>
                            {day.rain > 0 ? (
                                <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300 mt-2 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded-lg w-full text-center">
                                  {day.rain} mm
                                </div>
                            ) : (
                                <div className="text-[10px] font-semibold text-muted-foreground/60 mt-2 bg-muted/50 px-2 py-1 rounded-lg w-full text-center">
                                  Sin lluvia
                                </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* DERECHA: Horarios de Riego */}
                <div className="lg:col-span-1 bg-muted/10 border border-border rounded-[1.5rem] p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Clock size={16} /> Horarios Base
                    </h4>
                    {!isAdding && (
                      <button onClick={() => setIsAdding(true)} className="text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                        <Plus size={14} /> Añadir
                      </button>
                    )}
                  </div>

                  <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30 text-xs text-blue-800 dark:text-blue-300 leading-relaxed mb-6">
                    <p className="mb-2">
                      Añade tus horas preferidas de riego. El sistema inteligente de FLoRa se encargará del resto:
                    </p>
                    <ul className="list-disc pl-4 space-y-1.5 marker:text-blue-500 dark:marker:text-blue-600">
                      <li>
                        <strong className="font-semibold">Ajuste dinámico:</strong> Modifica la duración o cancela el turno si la tierra no lo necesita.
                      </li>
                      <li>
                        <strong className="font-semibold">Máxima precisión:</strong> Toma la decisión final 1h antes usando el pronóstico más reciente.
                      </li>
                      <li>
                        <strong className="font-semibold">Protección anti-fallos:</strong> Ignora la programación si las motas llevan más de 24h desconectadas para no regar con datos obsoletos.
                      </li>
                    </ul>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                    <AnimatePresence>
                      {isAdding && (
                        <motion.div initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} className="bg-card border border-border p-4 rounded-xl shadow-sm mb-3">
                          <label className="text-xs font-bold text-muted-foreground mb-2 block">Nueva Hora (24h)</label>
                          <div className="flex gap-2">
                            <TimeInput24h value={newHora} onChange={setNewHora} isInvalid={!isNewHoraFormatValid || isNewHoraDuplicate} />
                            <button onClick={() => setIsAdding(false)} className="p-3 border border-border text-muted-foreground hover:bg-muted rounded-xl transition-colors"><X size={20} /></button>
                            <button onClick={handleAdd} disabled={!canAddNew} className="p-3 bg-primary text-primary-foreground shadow-md hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50"><CheckCircle2 size={20} /></button>
                          </div>
                          {isNewHoraDuplicate && <p className="text-[10px] font-bold text-red-500 mt-2">Hora ya programada</p>}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {isLoadingTurnos ? (
                      <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
                    ) : turnos.length === 0 && !isAdding ? (
                      <div className="text-center p-8 border-2 border-dashed border-border rounded-2xl text-muted-foreground text-sm font-medium">
                        No hay horarios programados.
                      </div>
                    ) : (
                      turnos.map(turno => (
                        <div key={turno.id} className="bg-background border border-border p-4 rounded-2xl flex items-center justify-between transition-colors shadow-sm hover:shadow-md">
                          {editingId === turno.id ? (
                            <div className="flex-1 flex gap-2">
                              <div className="flex-1"><TimeInput24h value={editHora} onChange={setEditHora} isInvalid={!isEditHoraFormatValid || isEditHoraDuplicate} /></div>
                              <button onClick={() => setEditingId(null)} className="p-2 border border-border rounded-xl text-muted-foreground"><X size={18} /></button>
                              <button onClick={() => handleUpdate(turno.id)} disabled={!canEdit} className="p-2 bg-green-600 text-white rounded-xl disabled:opacity-50"><CheckCircle2 size={18} /></button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-4">
                                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-2 rounded-xl font-mono text-xl font-bold tracking-tight">{turno.horaConfigurada}</div>
                                <div>
                                  <div className="text-sm font-bold text-foreground">{turno.estadoRiego}</div>
                                  <div className="text-xs text-muted-foreground font-medium mt-0.5">{turno.tiempoRiegoMin ? `Tiempo estimado: ${formatDuration(turno.tiempoRiegoMin)}` : 'Esperando evaluación...'}</div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-1">
                                <button onClick={() => { setEditingId(turno.id); setEditHora(turno.horaConfigurada); }} className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil size={16} /></button>
                                <button onClick={() => handleDelete(turno.id)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                              </div>
                            </>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}