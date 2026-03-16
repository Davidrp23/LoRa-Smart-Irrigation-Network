import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LayoutGrid, Globe, Plus, Sprout, CheckCircle2, AlertTriangle, Droplets, Clock, BarChart3, X, Wifi, MapPin, Layers, Pencil, Trash2, Signal, Router as RouterIcon, Cpu, ChevronLeft, ChevronRight, CloudRain, Sun, Cloud, Calendar, Radio, Search, Ruler, Info } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import RegistrarParcelaModal from './RegistrarParcelaModal';
import Select from '../ui/Select'; // Importamos el componente Select
import ConfirmarEliminarModal from './ConfirmarEliminarModal';
import { initParcelMap, type Parcela, type Dispositivo } from '../../utils/mapUtils';
import { createParcela, updateParcela, deleteParcela, getMediciones, getParcelaHistorico, getTurnosRiego, createTurnoRiego, updateTurnoRiego, deleteTurnoRiego } from '../../services/dataService';

type HistoryItem = { type: 'parcela', data: Parcela } | { type: 'mota', data: Dispositivo };

// Interfaz local para dispositivos con propiedades extra de UI (lat/lng para Leaflet)
interface DispositivoExtended extends Omit<Dispositivo, 'coordenadas' | 'bateria' | 'rssi' | 'canal'> {
  lat?: number | null;
  lng?: number | null;
  coordenadas?: number[] | null; // Relajamos el tipo estricto [number, number]
  bateria?: number | null;       // Fix: Aseguramos que bateria existe (mapeado desde bateriaUltima)
  rssi?: number | null;          // Fix: Aseguramos rssi
  canal?: number | null;         // Fix: Aseguramos canal
}

// Extendemos la interfaz Parcela localmente para incluir la lista completa
interface ParcelaExtended extends Parcela {
  dispositivosTodos: DispositivoExtended[];
}

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

// Componente Modal para Resumen de Dispositivos
const DeviceSummaryModal = ({ parcel }: { parcel: ParcelaExtended, onClose: () => void }) => {
  // Usamos dispositivosTodos para mostrar incluso los que no tienen GPS
  const routers = parcel.dispositivosTodos?.filter(d => d.tipo === 'router') || [];
  const motas = parcel.dispositivosTodos?.filter(d => d.tipo === 'mota') || [];

  const DeviceList = ({ title, devices, icon: Icon, colorClass }: any) => (
    <div className="mb-6 last:mb-0">
      <h4 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${colorClass}`}>
        <Icon size={16} /> {title} ({devices.length})
      </h4>
      {devices.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No hay dispositivos de este tipo.</p>
      ) : (
        <div className="grid gap-3">
          {devices.map((d: DispositivoExtended) => (
            <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border transition-colors hover:bg-muted">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${d.estado === 'online' ? 'bg-green-500' : d.estado === 'low-battery' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-card-foreground text-sm">{d.nombre || d.modelo || `Dispositivo #${d.id}`}</p>
                    {(!d.lat || !d.lng) && (
                      <span className="text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                        SIN GPS
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{d.ssid || `ID: ${d.id}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                {d.tipo === 'mota' && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Signal size={14} /> {d.rssi ?? '--'} dBm
                  </div>
                )}
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Radio size={14} /> CH {d.canal ?? '--'}
                </div>
                <div className={`flex items-center gap-1 ${d.bateria != null && d.bateria < 20 ? 'text-red-500' : 'text-green-600'}`}>
                  {d.bateria != null 
                    ? <><BatteryLevel level={d.bateria} size={14} /> {d.bateria}%</>
                    : <span className="text-muted-foreground">--%</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <DeviceList title="Routers / Gateways" devices={routers} icon={RouterIcon} colorClass="text-primary" />
      <div className="h-px bg-border my-6" />
      <DeviceList title="Motas / Sensores" devices={motas} icon={Cpu} colorClass="text-blue-600" />
    </div>
  );
};

// Componente de Input de Hora 24h Interactivo
const TimeInput24h = ({ value, onChange, isInvalid }: { value: string, onChange: (v: string) => void, isInvalid: boolean }) => {
  const [h, m] = value.includes(':') ? value.split(':') : ['06', '00'];

  const handleHChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    // Si se escribe una 3ª cifra (ej. el input tenía "06" y tecleas "1"), nos quedamos con la última ("1")
    if (val.length > 2) val = val.slice(-1);

    onChange(`${val}:${m}`);
    // Salto automático a los minutos al escribir 2 dígitos
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
    // Si pulsamos borrar estando vacíos los minutos, retroceder a horas y borrar la última cifra
    if (e.key === 'Backspace' && m === '') {
      e.preventDefault(); // Evitamos comportamiento por defecto del navegador
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

  // Autocompletar con ceros si el usuario se sale del input
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
    <div className={`flex items-center w-full rounded-xl border bg-background transition-all h-[42px] ${isInvalid ? 'border-red-500/50 ring-2 ring-red-500/20' : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20'}`}>
      <input 
        type="text" value={h} onChange={handleHChange} onBlur={blurH} onFocus={e => e.currentTarget.select()} onClick={e => e.currentTarget.select()}
        className="w-1/2 h-full text-right bg-transparent border-none focus:ring-0 p-2 text-lg font-mono outline-none text-foreground placeholder:text-muted-foreground/30" placeholder="00"
      />
      <span className="text-lg font-mono font-bold text-foreground mb-[2px] opacity-50">:</span>
      <input 
        type="text" value={m} onChange={handleMChange} onKeyDown={handleMKeyDown} onBlur={blurM} onFocus={e => e.currentTarget.select()} onClick={e => e.currentTarget.select()}
        className="w-1/2 h-full text-left bg-transparent border-none focus:ring-0 p-2 text-lg font-mono outline-none text-foreground placeholder:text-muted-foreground/30" placeholder="00"
      />
    </div>
  );
};

// Componente Modal para Decisión de Riego
const IrrigationDecisionModal = ({ parcel }: { parcel: Parcela }) => {
  const [turnos, setTurnos] = useState<any[]>([]);
  const [isLoadingTurnos, setIsLoadingTurnos] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newHora, setNewHora] = useState('06:00');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editHora, setEditHora] = useState('');

  const fetchTurnos = async () => {
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
    fetchTurnos();
  }, [parcel.id]);

  const handleAdd = async () => {
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

  // Datos meteorológicos simulados (Mock)
  const forecast = [
    { day: 'Hoy', temp: 28, rain: 0, icon: Sun, condition: 'Soleado' },
    { day: 'Mañana', temp: 26, rain: 0, icon: Sun, condition: 'Soleado' },
    { day: 'Mié', temp: 22, rain: 45, icon: CloudRain, condition: 'Lluvia' },
    { day: 'Jue', temp: 20, rain: 80, icon: CloudRain, condition: 'Tormenta' },
    { day: 'Vie', temp: 23, rain: 10, icon: Cloud, condition: 'Nublado' },
    { day: 'Sáb', temp: 25, rain: 0, icon: Sun, condition: 'Soleado' },
    { day: 'Dom', temp: 27, rain: 0, icon: Sun, condition: 'Soleado' },
  ];

  // Validaciones UI en tiempo real
  const isNewHoraFormatValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(newHora);
  const isNewHoraDuplicate = turnos.some(t => t.horaConfigurada === newHora);
  const canAddNew = isNewHoraFormatValid && !isNewHoraDuplicate;

  const isEditHoraFormatValid = /^([01]\d|2[0-3]):([0-5]\d)$/.test(editHora);
  const isEditHoraDuplicate = turnos.some(t => t.id !== editingId && t.horaConfigurada === editHora);
  const canEdit = isEditHoraFormatValid && !isEditHoraDuplicate;

  return (
    <div className="p-6 space-y-8 overflow-y-auto max-h-[80vh]">
       {/* Top Summary Card */}
       <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-500/20">
          <div className="flex justify-between items-start">
             <div>
                <div className="flex items-center gap-2 opacity-90 mb-1">
                   <Clock size={16} />
                   <span className="text-sm font-medium uppercase tracking-wide">Próximo Riego</span>
                </div>
                <div className="text-3xl font-bold">{parcel.proximoRiego}</div>
                <div className="mt-2 inline-flex items-center bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg text-sm font-medium">
                   <Droplets size={14} className="mr-1.5" /> 45 min programados
                </div>
             </div>
             <div className="text-right">
                <div className="text-sm opacity-80">Humedad Objetivo</div>
                <div className="text-2xl font-bold">60%</div>
                <div className="text-xs opacity-70 mt-1">Actual: {parcel.humedad}%</div>
             </div>
          </div>
       </div>

       {/* Analysis Grid */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Agronomic Context */}
          <div className="space-y-3">
             <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Sprout size={16} /> Contexto Agronómico
             </h4>
             <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-4 h-full">
                <div className="flex items-center justify-between p-2 bg-background rounded-xl border border-border/50">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                         <Sprout size={20} />
                      </div>
                      <div>
                         <div className="text-xs text-muted-foreground">Cultivo</div>
                         <div className="font-bold text-foreground">{parcel.cultivo}</div>
                      </div>
                   </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-background rounded-xl border border-border/50">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                         <Layers size={20} />
                      </div>
                      <div>
                         <div className="text-xs text-muted-foreground">Suelo</div>
                         <div className="font-bold text-foreground">{parcel.tipoSuelo || 'Estándar'}</div>
                      </div>
                   </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed px-1">
                   El sistema ha calculado una retención de agua media-baja debido al suelo <b>{parcel.tipoSuelo?.toLowerCase() || 'franco'}</b>. Se requiere riego frecuente pero corto para evitar drenaje profundo.
                </p>
             </div>
          </div>

          {/* Weather Analysis */}
          <div className="space-y-3">
             <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Cloud size={16} /> Análisis Meteorológico
             </h4>
             <div className="bg-muted/30 border border-border rounded-2xl p-4 h-full flex flex-col justify-between">
                <div className="flex items-center gap-4 mb-4">
                   <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">Precipitación (7d)</div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">135 mm</div>
                   </div>
                   <div className="w-px h-10 bg-border"></div>
                   <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">Evapotranspiración</div>
                      <div className="text-2xl font-bold text-orange-500">Alta</div>
                   </div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-200 dark:border-blue-900/30">
                   <p className="text-xs text-blue-800 dark:text-blue-300 font-medium leading-relaxed">
                      <span className="font-bold">Aviso:</span> Se esperan lluvias significativas a partir del miércoles. El riego programado para hoy es preventivo para mantener la humedad hasta entonces.
                   </p>
                </div>
             </div>
          </div>
       </div>

       {/* Forecast Strip */}
       <div className="space-y-3 pt-6">
          <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
             <Calendar size={16} /> Previsión Semanal
          </h4>
          <div className="grid grid-cols-7 gap-2">
             {forecast.map((day, i) => (
                <div key={i} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${day.rain > 20 ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-background border-border'}`}>
                   <span className="text-[10px] font-bold text-muted-foreground mb-1">{day.day}</span>
                   <day.icon size={20} className={`mb-1.5 ${day.rain > 0 ? 'text-blue-500' : 'text-orange-400'}`} />
                   <span className="text-xs font-bold text-foreground">{day.temp}°</span>
                   <div className="h-1 w-full bg-muted rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${Math.min(day.rain, 100)}%` }}></div>
                   </div>
                </div>
             ))}
          </div>
       </div>

       {/* Configuración de Riegos */}
       <div className="space-y-4 pt-6 border-t border-border mt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Clock size={16} /> Horarios de Riego
              </h4>
              <div className="relative group flex items-center">
                <Info size={16} className="text-muted-foreground hover:text-blue-500 cursor-help transition-colors" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-3 bg-card border border-border text-card-foreground text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                  <p className="mb-2 leading-relaxed text-muted-foreground">
                    Introduce los horarios en los que prefieres que el sistema inicie el riego. El algoritmo inteligente determinará automáticamente los minutos y la cantidad de agua necesarios basándose en la humedad del suelo y la previsión meteorológica, pudiendo incluso <strong>cancelar el riego</strong> si las condiciones lo hacen innecesario.
                  </p>
                  <p className="bg-blue-50/50 dark:bg-blue-900/20 p-2 rounded-lg border border-blue-100 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 leading-relaxed">
                    💡 <strong>Consejo:</strong> Las mejores horas para regar son al <strong>amanecer (05:00 - 07:00)</strong> o al <strong>anochecer (20:00 - 22:00)</strong>. Así se minimiza la evaporación por el sol y el calor, permitiendo que el agua penetre mejor en las raíces.
                  </p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] h-3 w-3 -translate-y-1/2 rotate-45 border-b border-r border-border bg-card"></div>
                </div>
              </div>
            </div>
            {!isAdding && (
              <button 
                onClick={() => setIsAdding(true)}
                className="text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus size={14} /> Añadir Horario
              </button>
            )}
          </div>

          <div className="grid gap-3">
            <AnimatePresence>
              {isAdding && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  className="bg-card border border-border p-4 rounded-xl shadow-sm overflow-hidden"
                >
                  <div className="flex items-start gap-3 w-full">
                    <div className="flex-1 flex flex-col">
                      <label className="text-xs font-bold text-muted-foreground mb-1.5 block">Hora del Riego (24h)</label>
                      <TimeInput24h 
                        value={newHora} 
                        onChange={setNewHora} 
                        isInvalid={!isNewHoraFormatValid || isNewHoraDuplicate}
                      />
                      <div className="h-4 mt-1">
                        {isNewHoraDuplicate && <p className="text-[10px] font-bold text-red-500 ml-1">Esta hora ya está programada</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-[22px]">
                      <button onClick={() => setIsAdding(false)} className="p-2 border border-border text-muted-foreground hover:bg-muted rounded-xl transition-colors h-[42px] w-[42px] flex items-center justify-center"><X size={18} /></button>
                      <button onClick={handleAdd} disabled={!canAddNew} className="p-2 bg-primary text-primary-foreground shadow-md hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[42px] w-[42px] flex items-center justify-center"><CheckCircle2 size={18} /></button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isLoadingTurnos ? (
              <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
            ) : turnos.length === 0 && !isAdding ? (
              <div className="text-center p-6 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
                No hay horarios programados. Añade uno para que el algoritmo lo gestione.
              </div>
            ) : (
              turnos.map(turno => (
                <div key={turno.id} className="bg-muted/30 border border-border p-3 rounded-xl flex items-center justify-between transition-colors hover:bg-muted/50">
                  {editingId === turno.id ? (
                    <div className="w-full flex flex-col">
                      <div className="flex items-start gap-3 w-full">
                        <div className="flex-1 flex flex-col">
                          <TimeInput24h 
                            value={editHora} 
                            onChange={setEditHora} 
                            isInvalid={!isEditHoraFormatValid || isEditHoraDuplicate} 
                          />
                          {isEditHoraDuplicate && <p className="text-[10px] font-bold text-red-500 mt-1 ml-1">Esta hora ya está programada</p>}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingId(null)} className="p-2 border border-border text-muted-foreground hover:bg-muted rounded-xl transition-colors h-[42px] w-[42px] flex items-center justify-center"><X size={16} /></button>
                          <button onClick={() => handleUpdate(turno.id)} disabled={!canEdit} className="p-2 bg-green-600 text-white hover:bg-green-700 shadow-sm rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-[42px] w-[42px] flex items-center justify-center"><CheckCircle2 size={16} /></button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 p-2.5 rounded-lg font-mono text-xl font-bold">{turno.horaConfigurada}</div>
                        <div>
                          <div className="text-sm font-bold text-foreground">{turno.estadoRiego}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{turno.estadoRiego === 'Programado' ? `Duración: ${turno.tiempoRiegoMin} min` : 'Esperando algoritmo...'}</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingId(turno.id); setEditHora(turno.horaConfigurada); }} className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors"><Pencil size={16} /></button>
                        <button onClick={() => handleDelete(turno.id)} className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
       </div>
    </div>
  );
};

// Componente de Gráfico de Humedad Detallado con Navegación
const DetailedHumidityChart = ({ data }: { data: { label: string, value: number }[] }) => {
  const ITEMS_PER_PAGE = 24;
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
       <div className="h-96 w-full">
          {/* Gráfica SVG Interactiva */}
          <div className="relative h-full w-full select-none">
            <svg width="100%" height="100%" viewBox="0 0 600 300" className="overflow-visible font-sans" preserveAspectRatio="none">
              {/* Líneas de guía */}
              {[0, 25, 50, 75, 100].map(v => {
                const y = 300 - 30 - ((v / 100) * 240);
                return (
                  <g key={v}>
                    <line x1="30" y1={y} x2="570" y2={y} stroke="currentColor" className="text-border" strokeWidth="1" />
                    <text x="20" y={y + 4} textAnchor="end" className="text-[10px] fill-muted-foreground font-medium">{v}%</text>
                  </g>
                )
              })}

              {/* Generar Path */}
              {(() => {
                if (displayData.length === 0) return null;

                const points = displayData.map((d, i) => {
                  const x = 30 + (i * (540 / Math.max(displayData.length - 1, 1)));
                  const y = 300 - 30 - ((d.value / 100) * 240);
                  return { x, y, ...d };
                });
                const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
                const areaD = `${pathD} L ${points[points.length-1].x},270 L ${points[0].x},270 Z`;

                return (
                  <>
                    <defs>
                      <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/></linearGradient>
                    </defs>
                    <path d={areaD} fill="url(#gradient)" />
                    <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {points.map((p, i) => (
                      <g key={i} onMouseEnter={() => setHoveredChartIndex(i)} onMouseLeave={() => setHoveredChartIndex(null)} className="cursor-pointer">
                        <rect x={p.x - 20} y={0} width={40} height={300} fill="transparent" />
                        
                        {/* Línea guía vertical */}
                        {hoveredChartIndex === i && (
                          <line 
                            x1={p.x} y1={p.y} x2={p.x} y2={270} 
                            strokeDasharray="4 4" 
                            className="stroke-border" 
                            strokeWidth="1.5" 
                          />
                        )}

                        <circle cx={p.x} cy={p.y} r={hoveredChartIndex === i ? 5 : 3} className={`transition-all duration-200 ${hoveredChartIndex === i ? 'fill-blue-600 stroke-card stroke-[2px]' : 'fill-card stroke-blue-500 stroke-[1.5px]'}`} />
                        <text x={p.x} y={290} textAnchor="middle" className={`text-xs font-medium transition-all ${hoveredChartIndex === i ? 'fill-blue-600 opacity-100' : 'fill-muted-foreground opacity-0'}`}>{p.label}</text>
                        
                        {hoveredChartIndex === i && (
                          <foreignObject x={p.x - 40} y={p.y - 50} width={80} height={40} className="overflow-visible pointer-events-none">
                            <div className="flex flex-col items-center justify-center bg-background text-foreground text-xs rounded-lg py-1 px-2 shadow-xl border border-border">
                              <span className="font-bold">{p.value}%</span>
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 border-4 border-transparent border-t-background"></div>
                            </div>
                          </foreignObject>
                        )}
                      </g>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
       </div>
    </div>
  );
};

// Componente Estado Vacío para Parcelas
const EmptyParcelState = ({ onAction }: { onAction: () => void }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-3xl border-2 border-dashed border-border/60 bg-muted/20">
    <div className="bg-green-100 dark:bg-green-900/20 p-6 rounded-full mb-6">
      <Sprout size={48} className="text-green-600 dark:text-green-400" />
    </div>
    <h3 className="text-2xl font-bold text-card-foreground mb-2">No tienes parcelas registradas</h3>
    <p className="text-muted-foreground max-w-md mb-8">
      Empieza registrando tu terreno para monitorizar la humedad, gestionar el riego y visualizar el estado de tus cultivos.
    </p>
    <button onClick={onAction} className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-base font-bold text-primary-foreground shadow-lg shadow-green-600/20 hover:bg-primary/90 transition-all hover:scale-105">
      <Plus size={20} /> Registrar Mi Primera Parcela
    </button>
  </div>
);

interface ParcelasViewProps {
  datosParcelas: Parcela[];
  onRefresh: () => void;
  mapTarget?: { lat: number; lng: number } | null;
  onMapTargetCleared?: () => void;
}

export default function ParcelasView({ datosParcelas, onRefresh, mapTarget, onMapTargetCleared }: ParcelasViewProps) {
  const { theme } = useTheme();
  const [parcelas, setParcelas] = useState<Parcela[]>(datosParcelas);
  const [vista, setVista] = useState<'galeria' | 'mapa'>(mapTarget ? 'mapa' : 'galeria');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCultivo, setFiltroCultivo] = useState('todos');
  const [filtroTipoSuelo, setFiltroTipoSuelo] = useState('todos');
  const [filtroRiego, setFiltroRiego] = useState('todos');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [parcelaParaEliminar, setParcelaParaEliminar] = useState<Parcela | null>(null);
  
  // Estado unificado para el historial (Parcela o Mota)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [chartData, setChartData] = useState<{label: string, value: number}[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [targetParcelId, setTargetParcelId] = useState<number | null>(null);
  const [editingParcel, setEditingParcel] = useState<Parcela | null>(null);
  const [viewingDevicesParcel, setViewingDevicesParcel] = useState<ParcelaExtended | null>(null);
  const [viewingIrrigationParcel, setViewingIrrigationParcel] = useState<Parcela | null>(null);

  // ESTADO PARA NOTIFICACIONES (TOASTS)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Efecto para ocultar la notificación automáticamente después de 4 segundos
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Sincronizar props con estado local si cambian (ej: recarga desde dashboard)
  useEffect(() => {
    setParcelas(datosParcelas);
  }, [datosParcelas]);

  // Si recibimos un objetivo de mapa externo, cambiamos a la vista de mapa
  useEffect(() => {
    if (mapTarget) setVista('mapa');
  }, [mapTarget]);

  // Limpieza al desmontar el componente (salir de la pestaña Parcelas)
  // Usamos useRef para evitar problemas de dependencias con la función prop
  const onMapTargetClearedRef = useRef(onMapTargetCleared);
  useEffect(() => { onMapTargetClearedRef.current = onMapTargetCleared; }, [onMapTargetCleared]);

  useEffect(() => {
    return () => {
      if (onMapTargetClearedRef.current) onMapTargetClearedRef.current();
    };
  }, []);

  // Actualizar datos cuando cambia el rango o el ítem seleccionado
  useEffect(() => {
    if (!selectedHistoryItem) return;

    const fetchHistoryData = async () => {
      setIsLoadingHistory(true);
      try {
        const end = new Date();
        const start = new Date();
        if (timeRange === '24h') start.setHours(start.getHours() - 24);
        else if (timeRange === '7d') start.setDate(start.getDate() - 7);
        else if (timeRange === '30d') start.setDate(start.getDate() - 30);

        let rawData;
        let formattedData;

        if (selectedHistoryItem.type === 'mota') {
          rawData = await getMediciones(selectedHistoryItem.data.id, start, end);
          formattedData = rawData.map((m: any) => ({
            label: new Date(m.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
            value: Math.round(m.humedad)
          }));
        } else { // Es de tipo 'parcela'
          rawData = await getParcelaHistorico(selectedHistoryItem.data.id, start, end);
          formattedData = rawData.map((h: any) => ({
            label: new Date(h.fecha).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
            value: Math.round(h.humedadMedia)
          }));
        }
        setChartData(formattedData);
      } catch (error) {
        console.error("Error cargando historial:", error);
        setNotification({ type: 'error', message: (error as Error).message || 'No se pudo cargar el historial' });
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistoryData();
  }, [timeRange, selectedHistoryItem]);

  const openHistory = (item: HistoryItem) => {
    setSelectedHistoryItem(item);
    setTimeRange('24h'); // Resetear a 24h al abrir
  };

  const handleDeleteParcel = (parcela: Parcela) => {
    setParcelaParaEliminar(parcela);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAndClose = async () => {
    if (!parcelaParaEliminar) return;
    try {
      await deleteParcela(parcelaParaEliminar.id);
      setNotification({ type: 'success', message: 'Parcela eliminada correctamente' });
      setIsDeleteModalOpen(false);
      setParcelaParaEliminar(null);
      onRefresh(); // Recargar datos del servidor
    } catch (error) {
      console.error("Error al eliminar:", error);
      setNotification({ type: 'error', message: 'No se pudo eliminar la parcela.' });
    }
  };

  const handleEditParcel = (parcel: Parcela) => {
    setEditingParcel(parcel);
    setIsModalOpen(true);
  };

  const handleSaveParcel = async (parcelaGuardada: Parcela) => {
    try {
      if (editingParcel) {
        // Actualizar existente
        await updateParcela(editingParcel.id, parcelaGuardada);
        setNotification({ type: 'success', message: 'Parcela actualizada correctamente' });
      } else {
        // Crear nueva
        await createParcela(parcelaGuardada);
        setNotification({ type: 'success', message: 'Parcela creada exitosamente' });
      }
      setEditingParcel(null);
      setIsModalOpen(false);
      onRefresh(); // Recargar datos del servidor
    } catch (error) {
      console.error("Error al guardar:", error);
      setNotification({ type: 'error', message: 'Error al guardar. Verifica los datos.' });
    }
  };

  // --- SANITIZACIÓN DE DATOS CENTRALIZADA ---
  // Creamos una versión "segura" de las parcelas para usar en TODA la vista (Mapa, Lista y Modales)
  // Esto evita que el modal de edición explote si recibe coordenadas nulas o mal formadas.
  const parcelasSeguras = useMemo(() => {
    return parcelas.map(p => {
      const pAny = p as any;

      // 1. Validar centro de parcela (Fallback a coordenadas por defecto si falla)
      let latCentro = Number(pAny.latitudCentro);
      let lngCentro = Number(pAny.longitudCentro);
      if (!Number.isFinite(latCentro) || !Number.isFinite(lngCentro)) {
         latCentro = 37.3891;
         lngCentro = -5.9845;
      }

      // 2. Validar coordenadas del polígono
      let coords = Array.isArray(p.coordenadas) ? p.coordenadas : [];
      // Filtrar puntos inválidos dentro del polígono
      coords = coords.filter((c: any) => Array.isArray(c) && c.length >= 2 && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])));

      // 3. Procesar TODOS los dispositivos (para modales) y filtrar para MAPA
      const todosDispositivosProcesados = (p.dispositivos || []).map(d => {
        const dAny = d as any;
        const lat = Number(dAny.lat ?? dAny.latitud);
        const lng = Number(dAny.lng ?? dAny.longitud);
        const tieneGPS = Number.isFinite(lat) && Number.isFinite(lng);
        
        return { 
          ...d, 
          lat: tieneGPS ? lat : null, 
          lng: tieneGPS ? lng : null,
          latitud: tieneGPS ? lat : null, 
          longitud: tieneGPS ? lng : null,
          coordenadas: tieneGPS ? [lat, lng] : null
        };
      });

      // Filtramos SOLO los que tienen GPS válido para pasárselos a Leaflet (initParcelMap)
      // Así evitamos errores de renderizado o marcadores en el océano
      const dispositivosParaMapa = todosDispositivosProcesados.filter(d => d.lat !== null && d.lng !== null);

      // Devolvemos la parcela con datos garantizados para Leaflet
      return {
        ...p, 
        latitudCentro: latCentro, 
        longitudCentro: lngCentro, 
        lat: latCentro, 
        lng: lngCentro, 
        coordenadas: coords, 
        dispositivos: dispositivosParaMapa as unknown as Dispositivo[], // Casting doble para evitar conflicto de tipos estrictos
        dispositivosTodos: todosDispositivosProcesados as DispositivoExtended[] // Todos para el modal
      };
    });
  }, [parcelas]);

  // Opciones para los selectores de filtro
  const opcionesCultivo = useMemo(() => {
    const cultivos = new Set(parcelasSeguras.map(p => p.cultivo).filter(Boolean));
    return [
      { value: 'todos', label: 'Todos los Cultivos' },
      ...Array.from(cultivos).map(c => ({ value: c as string, label: c as string }))
    ];
  }, [parcelasSeguras]);

  const opcionesTipoSuelo = useMemo(() => {
    const tipos = new Set(parcelasSeguras.map(p => p.tipoSuelo).filter(Boolean));
    return [
      { value: 'todos', label: 'Todos los Suelos' },
      ...Array.from(tipos).map(t => ({ value: t as string, label: t as string }))
    ];
  }, [parcelasSeguras]);

  const opcionesRiego = useMemo(() => {
    const tipos = new Set(parcelasSeguras.map(p => p.tipoRiego).filter(Boolean));
    return [
      { value: 'todos', label: 'Todos los Riegos' },
      ...Array.from(tipos).map(t => ({ value: t as string, label: t as string }))
    ];
  }, [parcelasSeguras]);

  // Filtrado de parcelas para la galería
  const parcelasFiltradas = useMemo(() => {
    const terminoBusqueda = busqueda.toLowerCase();
    return parcelasSeguras.filter(p => 
      ((p.nombre || '').toLowerCase().includes(terminoBusqueda)) &&
      (filtroCultivo === 'todos' || p.cultivo === filtroCultivo) &&
      (filtroTipoSuelo === 'todos' || p.tipoSuelo === filtroTipoSuelo) &&
      (filtroRiego === 'todos' || p.tipoRiego === filtroRiego)
    );
  }, [parcelasSeguras, busqueda, filtroCultivo, filtroTipoSuelo, filtroRiego]);

  useEffect(() => {
    // Usamos 'as string' para evitar el error de TS que infiere erróneamente que los tipos no se solapan
    if ((vista as string) !== 'mapa' || !mapRef.current) return;
    
    const map = L.map(mapRef.current);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);
    
    // Usar la utilidad compartida para inicializar el mapa
    let parcelManager: any = null;
    let removeTargetCircle: (() => void) | null = null; // Variable para la función de limpieza

    try {
      parcelManager = initParcelMap(map, parcelasSeguras, {
        onClick: (_parcel, latlng) => {
          if (removeTargetCircle) removeTargetCircle(); // Limpiar círculo al tocar parcela

          const targetZoom = 16;
          // Proyectamos a píxeles, restamos 150px en Y (subir el centro => bajar el punto de anclaje)
          // para dejar espacio al popup que se abre hacia arriba.
          const targetPoint = map.project(latlng, targetZoom).subtract([0, 150]);
          const targetCenter = map.unproject(targetPoint, targetZoom);
          map.setView(targetCenter, targetZoom, { animate: true, duration: 1.5 });
        },
        onDeviceHistoryClick: (device) => {
          if (removeTargetCircle) removeTargetCircle(); // Limpiar círculo al tocar dispositivo
          openHistory({ type: 'mota', data: device });
        },
        getPopupContent: (p) => {
          const container = document.createElement('div');
          container.className = "map-popup-container";
          
          // Iconos SVG inline para el popup
          const sproutIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.2.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1.7-1.6 1.6-3.4 1.6-3.4s-.3-1.1-1.6-1.7c-2.7-1.2-4.4.7-4.4.7z"/></svg>`;
          const layersIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
          const dropletsIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500/40 mb-1"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.8-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>`;
          const rulerIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0l12.6 12.6z"/><line x1="14.5" y1="5.5" x2="15.5" y2="4.5"/><line x1="11.5" y1="8.5" x2="12.5" y2="7.5"/><line x1="8.5" y1="11.5" x2="9.5" y2="10.5"/><line x1="5.5" y1="14.5" x2="6.5" y2="13.5"/></svg>`;
          const clockIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
          const wifiIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`;
          const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
          const alertIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;

          // Calculamos contadores reales usando la lista completa
          const pExtended = p as unknown as ParcelaExtended;
          const totalDispositivos = pExtended.dispositivosTodos?.length || 0;
          const noGpsDispositivos = pExtended.dispositivosTodos?.filter(d => !d.lat).length || 0;

          container.innerHTML = `
            <div style="min-width: 300px;">
              <div class="map-popup-header" style="align-items: flex-start; justify-content: space-between; gap: 0.5rem;">
                <div class="flex-1 min-w-0">
                    <h3 class="map-popup-title leading-tight">${p.nombre}</h3>
                    ${p.areaM2 ? `
                        <div class="flex items-center gap-1 mt-1 text-xs font-medium text-muted-foreground">
                        ${rulerIcon}
                        <span>${(p.areaM2 / 10000).toFixed(2)} ha</span>
                        </div>
                    ` : ''}
                    <div class="flex flex-wrap gap-2 mt-2">
                        <span class="map-badge-emerald">
                            ${sproutIcon} ${p.cultivo}
                        </span>
                        ${p.tipoRiego ? `
                            <span class="map-badge-blue">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.8-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/></svg>
                            ${p.tipoRiego}
                            </span>
                        ` : ''}
                        ${p.tipoSuelo ? `
                            <span class="map-badge-amber">
                            ${layersIcon} ${p.tipoSuelo}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="${p.estado === 'ok' ? 'status-indicator-ok' : 'status-indicator-alert'} !w-7 !h-7 !flex !items-center !justify-center !rounded-full shrink-0 mt-0.5">
                  ${p.estado === 'ok' ? checkIcon : alertIcon}
                </div>
              </div>
              
              <div class="map-metric-card !p-2.5">
                  <div class="flex justify-between items-center">
                    <div>
                      <p class="text-[10px] font-bold ${p.humedad != null ? 'text-blue-600' : 'text-muted-foreground'} uppercase tracking-wider">Humedad Media</p>
                      <div class="text-lg font-extrabold ${p.humedad != null ? 'text-foreground' : 'text-muted-foreground'}">${p.humedad != null ? `${p.humedad}%` : '--'}</div>
                    </div>
                    ${dropletsIcon}
                  </div>
              </div>

              <div class="grid grid-cols-[0.8fr_1.2fr] gap-3 text-xs mb-3">
                <div class="info-card-riego cursor-default">
                  <span class="text-muted-foreground font-medium flex items-center gap-1">${clockIcon} Riego</span>
                  <span class="font-semibold text-card-foreground truncate">${p.proximoRiego}</span>
                </div>
                <div class="info-card-dispositivos cursor-default">
                  <span class="text-muted-foreground font-medium flex items-center gap-1">${wifiIcon} Dispositivos</span>
                  <span class="font-semibold text-card-foreground flex items-center">
                    ${totalDispositivos} Activos ${noGpsDispositivos > 0 ? `<span class="text-amber-500 dark:text-amber-400 ml-1.5 text-[10px]">(${noGpsDispositivos} sin GPS)</span>` : ''}
                  </span>
                </div>
              </div>
            </div>
            <button id="btn-history-${p.id}" class="map-action-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>
              Ver Historial
            </button>
          `;
          
          // Añadir listener al botón después de crearlo
          container.querySelector(`#btn-history-${p.id}`)?.addEventListener('click', () => {
            openHistory({ type: 'parcela', data: p });
          });
          return container;
        }
      });
    } catch (error) {
      console.error("CRITICAL MAP ERROR: Fallo al inicializar capas.", error);
    }

    // PRIORIDAD 1: Objetivo externo (GPS de dispositivo)
    if (mapTarget) {
      map.setView([mapTarget.lat, mapTarget.lng], 19, { animate: true, duration: 1.5 });
      // Marcador de ubicación exacta (5 metros de radio)
      const targetCircle = L.circle([mapTarget.lat, mapTarget.lng], {
        radius: 12, // 12 metros reales
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.2,
        weight: 2 // Borde sólido
      }).addTo(map);

      // Definimos la función de limpieza que usaremos en todos los eventos
      removeTargetCircle = () => {
        if (map.hasLayer(targetCircle)) map.removeLayer(targetCircle);
      };

      // Eliminar el círculo al hacer clic en cualquier parte del mapa
      map.once('click', () => {
        if (removeTargetCircle) removeTargetCircle();
        if (onMapTargetCleared) onMapTargetCleared(); // Limpiar estado en Dashboard
      });
    } else if (targetParcelId) {
      // PRIORIDAD 2: Parcela seleccionada desde galería
      const target = parcelasSeguras.find(p => p.id === targetParcelId);
      if (target) {
        const center = L.polygon(target.coordenadas).getBounds().getCenter();
        map.setView(center, 16);
      }
      setTargetParcelId(null); // Resetear objetivo
    } else if (parcelasSeguras.length > 0) {
      const bounds = parcelManager?.getBounds();
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    } else {
      map.setView([37.385, -5.978], 14);
    }

    // Wrapper seguro para evitar que errores de Leaflet rompan la UI
    const safeUpdateVisibility = () => {
      if (!parcelManager) return;
      try {
        parcelManager.updateVisibility();
      } catch (err) {
        // Error silencioso en renderizado de capa para no interrumpir UX
      }
    };

    if (parcelManager) {
      map.on('zoomend', safeUpdateVisibility);
      map.on('moveend', safeUpdateVisibility);

      safeUpdateVisibility();
    }

    return () => { 
      if (parcelManager) parcelManager.cleanup();
      map.remove(); 
    };
  }, [vista, theme, parcelasSeguras, mapTarget, onMapTargetCleared]); // Dependemos de los datos sanitizados

  return (
    <>
      {/* Estilos globales para mejorar visibilidad de líneas en el mapa */}
      <style>{`
        .leaflet-overlay-pane path.leaflet-interactive {
          stroke-width: 4px !important;
          stroke-opacity: 0.8 !important;
          filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.3));
        }
      `}</style>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col">
        {/* Encabezado solo visible en modo Galería para maximizar espacio en Mapa */}
        {vista === 'galeria' && (
          <>
            <div className="mb-6 flex items-center justify-between rounded-3xl border border-border/50 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
              <h2 className="text-lg font-semibold text-card-foreground">Gestión de Terrenos</h2>
              <div className="flex rounded-lg border border-border bg-card p-1">
                <button onClick={() => setVista('galeria')} className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors bg-primary text-primary-foreground shadow-sm"><LayoutGrid size={16} /> Galería</button>
                <button onClick={() => setVista('mapa')} className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors text-muted-foreground hover:bg-muted/50"><Globe size={16} /> Satélite</button>
              </div>
            </div>

            {/* Barra de Búsqueda (Solo visible si hay parcelas) */}
            {parcelasSeguras.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar por nombre..." 
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="flora-input pl-10 w-full"
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={filtroCultivo}
                  onChange={(val) => setFiltroCultivo(val)}
                  options={opcionesCultivo}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={filtroTipoSuelo}
                  onChange={(val) => setFiltroTipoSuelo(val)}
                  options={opcionesTipoSuelo}
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  value={filtroRiego}
                  onChange={(val) => setFiltroRiego(val)}
                  options={opcionesRiego}
                />
              </div>
              </div>
            )}
          </>
        )}

        {vista === 'mapa' ? (
          <div className={`relative flex-1 overflow-hidden rounded-3xl border border-border shadow-inner ${theme}`}>
            {/* Controles flotantes compactos para el mapa */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] flex gap-2">
               <div className="flex items-center gap-1 rounded-full border border-border/50 bg-card/90 p-1.5 shadow-xl backdrop-blur-md">
                  <button type="button" onClick={() => {
                    setVista('galeria');
                    if (onMapTargetCleared) onMapTargetCleared(); // Limpiar al salir del mapa manualmente
                  }} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all"><LayoutGrid size={16} /> Galería</button>
                  <button type="button" onClick={() => setVista('mapa')} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold bg-primary text-primary-foreground shadow-sm transition-all"><Globe size={16} /> Satélite</button>
               </div>
            </div>
            <div ref={mapRef} className="h-full w-full z-0" />
          </div>
        ) : (
          // Lógica de Galería: Estado vacío o Grid
          parcelasSeguras.length === 0 ? (
            <EmptyParcelState onAction={() => { setEditingParcel(null); setIsModalOpen(true); }} />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <button 
              onClick={() => { setEditingParcel(null); setIsModalOpen(true); }} 
              className="group flex h-40 hover:h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border hover:border-primary hover:bg-green-200 dark:hover:bg-primary/10 transition-all duration-500 overflow-hidden"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-green-200 group-hover:text-green-600"><Plus size={28} /></div>
              <span className="font-semibold text-card-foreground">Registrar Parcela</span>
            </button>
            {parcelasFiltradas.map(p => (
              <div key={p.id} className="flora-card group">
                {/* Header */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-card-foreground leading-tight">{p.nombre}</h3>
                      {p.areaM2 && (
                        <div className="flex items-center gap-1 mt-1 text-xs font-medium text-muted-foreground">
                          <Ruler size={12} />
                          <span>{(p.areaM2 / 10000).toFixed(2)} ha</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="badge-emerald" title={`Cultivo: ${p.cultivo}`}>
                          <Sprout size={12} /> {p.cultivo}
                        </span>
                        {p.tipoSuelo && (
                          <span className="badge-amber" title={`Suelo: ${p.tipoSuelo}`}>
                            <Layers size={12} /> {p.tipoSuelo}
                          </span>
                        )}
                        {p.tipoRiego && (
                          <span className="badge-blue" title={`Riego: ${p.tipoRiego}`}>
                            <Droplets size={12} /> {p.tipoRiego}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={p.estado === 'ok' ? 'status-indicator-ok' : 'status-indicator-alert'}>
                      {p.estado === 'ok' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    </div>
                  </div>

                  {/* Main Metric: Humidity */}
                  <div 
                    className={`metric-card-blue ${p.humedad == null ? '!bg-muted/30 hover:!bg-muted/40 border border-dashed !cursor-default' : ''}`} 
                    onClick={() => p.humedad != null && openHistory({ type: 'parcela', data: p })}
                  >
                    <div className="flex justify-between items-end">
                      <div>
                        <p className={`text-xs font-bold ${p.humedad == null ? 'text-muted-foreground' : 'text-blue-600'} uppercase tracking-wider mb-1`}>Humedad Media</p>
                        <div className={`text-3xl font-extrabold ${p.humedad == null ? 'text-muted-foreground' : 'text-card-foreground'}`}>
                          {p.humedad != null ? `${p.humedad}%` : '--'}
                        </div>
                      </div>
                      <Droplets className={`${p.humedad == null ? 'text-muted-foreground/30' : 'text-blue-500/40'} mb-1`} size={32} />
                    </div>
                  </div>

                  {/* Secondary Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="info-card-riego cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setViewingIrrigationParcel(p)}>
                      <span className="text-muted-foreground font-medium flex items-center gap-1"><Clock size={12}/> Riego</span>
                      <span className="font-semibold text-card-foreground truncate">
                        {p.proximoRiego}
                      </span>
                    </div>
                    <div 
                      className="info-card-dispositivos group/dev"
                      onClick={() => setViewingDevicesParcel(p as unknown as ParcelaExtended)}
                    >
                      <span className="text-muted-foreground font-medium flex items-center gap-1"><Wifi size={12}/> Dispositivos</span>
                      <span className="font-semibold text-card-foreground">
                        {(p as unknown as ParcelaExtended).dispositivosTodos?.length || 0} Activos
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Footer Actions */}
                <div className="mt-auto px-5 pb-4 pt-3 border-t border-border flex justify-between items-center">
                   <div className="flex gap-1">
                      <button 
                        onClick={() => handleEditParcel(p)}
                        className="p-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteParcel(p)}
                        className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                   <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setTargetParcelId(p.id);
                      setVista('mapa');
                    }}
                    className="text-xs font-bold text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                   >
                     <MapPin size={14} /> Ver en mapa
                   </button>
                </div>
              </div>
            ))}
          </div>
          )
        )}
      </motion.div>
      <RegistrarParcelaModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingParcel(null); }} 
        parcelasExistentes={parcelasSeguras}
        parcelaAEditar={editingParcel}
        onGuardar={handleSaveParcel}
      />

      <ConfirmarEliminarModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteAndClose}
        parcelaNombre={parcelaParaEliminar?.nombre}
      />

      {/* Modal de Historial de Humedad */}
      <AnimatePresence>
        {selectedHistoryItem && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-6">
                <div>
                  <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2 mb-1">
                    <BarChart3 className="text-blue-500"/> 
                    {selectedHistoryItem.type === 'parcela' ? 'Historial de Humedad (Media)' : 'Historial de Humedad'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedHistoryItem.type === 'parcela' 
                      ? (selectedHistoryItem.data as Parcela).nombre 
                      : (selectedHistoryItem.data as Dispositivo).nombre || 'Sensor sin nombre'}
                    {selectedHistoryItem.type === 'parcela' && <span className="ml-2 text-xs bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded-full">Media de sensores</span>}
                  </p>
                </div>
                <button onClick={() => setSelectedHistoryItem(null)} className="rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-muted">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8">
                {/* Selector de Rango */}
                <div className="flex justify-center mb-8">
                  <div className="flex bg-secondary p-1 rounded-xl">
                    {(['24h', '7d', '30d'] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setTimeRange(r)}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                          timeRange === r 
                            ? 'bg-card text-blue-600 shadow-sm' 
                            : 'text-muted-foreground hover:text-card-foreground'
                        }`}
                      >
                        {r === '24h' ? 'Últimas 24h' : r === '7d' ? '7 Días' : '30 Días'}
                      </button>
                    ))}
                  </div>
                </div>

                {isLoadingHistory ? (
                  <div className="h-96 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : chartData.length > 0 ? (
                  <DetailedHumidityChart data={chartData} />
                ) : (
                  <div className="h-96 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/30 rounded-xl">
                    <BarChart3 size={48} className="mb-4 opacity-50" />
                    <span className="font-bold text-lg text-foreground">No hay datos históricos</span>
                    <span className="text-sm max-w-xs mt-1">
                      No se han registrado mediciones para {selectedHistoryItem?.type === 'parcela' ? 'esta parcela' : 'este sensor'} en el período de tiempo seleccionado.
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Resumen de Dispositivos */}
      <AnimatePresence>
        {viewingDevicesParcel && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg overflow-hidden rounded-3xl bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-6">
                <h3 className="text-xl font-bold text-card-foreground">Dispositivos en {viewingDevicesParcel.nombre}</h3>
                <button onClick={() => setViewingDevicesParcel(null)} className="rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-muted">
                  <X size={20} />
                </button>
              </div>
              <DeviceSummaryModal parcel={viewingDevicesParcel} onClose={() => setViewingDevicesParcel(null)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Decisión de Riego */}
      <AnimatePresence>
        {viewingIrrigationParcel && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl overflow-hidden rounded-3xl bg-card shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-border p-6">
                <h3 className="text-xl font-bold text-card-foreground flex items-center gap-2">
                  <Droplets className="text-blue-500"/> 
                  Decisión de Riego: {viewingIrrigationParcel.nombre}
                </h3>
                <button onClick={() => setViewingIrrigationParcel(null)} className="rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-muted">
                  <X size={20} />
                </button>
              </div>
              
              <IrrigationDecisionModal parcel={viewingIrrigationParcel} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
    </>
  );
}
