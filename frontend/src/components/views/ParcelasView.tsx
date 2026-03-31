import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LayoutGrid, Globe, Plus, Sprout, CheckCircle2, AlertTriangle, Droplets, Clock, X, Wifi, MapPin, Layers, Pencil, Trash2, Signal, Router as RouterIcon, Cpu, Radio, Search, Ruler } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import RegistrarParcelaModal from './RegistrarParcelaModal';
import Select from '../ui/Select'; // Importamos el componente Select
import ConfirmarEliminarModal from './ConfirmarEliminarModal';
import { initParcelMap, type Parcela, type Dispositivo } from '../../utils/mapUtils';
import { createParcela, updateParcela, deleteParcela } from '../../services/dataService';
import IrrigationDecisionModal from './IrrigationDecisionModal';
import HumidityHistoryModal, { type HistoryItem } from './HumidityHistoryModal';

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
  alertas: string[];
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
  const [orden, setOrden] = useState('nombre_asc');
  const [itemsVisibles, setItemsVisibles] = useState(5); // 11 parcelas + 1 botón de añadir = 12

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [parcelaParaEliminar, setParcelaParaEliminar] = useState<Parcela | null>(null);
  
  // Estado unificado para el historial (Parcela o Mota)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
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

  const openHistory = (item: HistoryItem) => {
    setSelectedHistoryItem(item);
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

      // 4. Calcular Alertas de Estado
      const alertas: string[] = [];
      
      if (todosDispositivosProcesados.length === 0) {
        alertas.push("No tiene ningún dispositivo asignado");
      } else {
        todosDispositivosProcesados.forEach(d => {
          const nombre = d.nombre || d.modelo || `Dispositivo #${d.id}`;
          if (d.bateria != null && d.bateria <= 20) alertas.push(`Batería baja en ${nombre}`);
          if (d.estado === 'offline') alertas.push(`${nombre} está offline`);
          if (d.lat === null || d.lng === null) alertas.push(`${nombre} no tiene GPS`);
        });
      }

      if (p.humedad != null && pAny.humedadObjetivo != null && p.humedad < pAny.humedadObjetivo) {
        alertas.push(`Humedad baja (${p.humedad}% < ${pAny.humedadObjetivo}%)`);
      }

      const estadoCalculado = alertas.length > 0 ? 'alert' : 'ok';

      // Devolvemos la parcela con datos garantizados para Leaflet
      return {
        ...p, 
        estado: estadoCalculado,
        alertas,
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

  const opcionesOrden = [
    { value: 'nombre_asc', label: 'Nombre (A-Z)' },
    { value: 'nombre_desc', label: 'Nombre (Z-A)' },
    { value: 'area_desc', label: 'Mayor Superficie' },
    { value: 'area_asc', label: 'Menor Superficie' },
    { value: 'dispositivos_desc', label: 'Más Dispositivos' },
    { value: 'dispositivos_asc', label: 'Menos Dispositivos' },
    { value: 'humedad_desc', label: 'Más Húmedas' },
    { value: 'humedad_asc', label: 'Menos Húmedas' },
  ];

  // Filtrado y Ordenación de parcelas para la galería
  const parcelasProcesadas = useMemo(() => {
      const terminoBusqueda = busqueda.toLowerCase();
      const filtradas = parcelasSeguras.filter(p => 
        ((p.nombre || '').toLowerCase().includes(terminoBusqueda)) &&
        (filtroCultivo === 'todos' || p.cultivo === filtroCultivo) &&
        (filtroTipoSuelo === 'todos' || p.tipoSuelo === filtroTipoSuelo) &&
        (filtroRiego === 'todos' || p.tipoRiego === filtroRiego)
      );

      // Lógica de ordenación
      return filtradas.sort((a, b) => {
          switch (orden) {
              case 'nombre_desc':
                  return b.nombre.localeCompare(a.nombre);
              case 'area_desc':
                  return (b.areaM2 || 0) - (a.areaM2 || 0);
              case 'area_asc':
                  return (a.areaM2 || 0) - (b.areaM2 || 0);
              case 'dispositivos_desc':
                  return (b.dispositivosTodos?.length || 0) - (a.dispositivosTodos?.length || 0);
              case 'dispositivos_asc':
                  return (a.dispositivosTodos?.length || 0) - (b.dispositivosTodos?.length || 0);
              case 'humedad_desc':
                  return (b.humedad || -1) - (a.humedad || -1);
              case 'humedad_asc':
                  return (a.humedad || -1) - (b.humedad || -1);
              case 'nombre_asc':
              default:
                  return a.nombre.localeCompare(b.nombre);
          }
      });
  }, [parcelasSeguras, busqueda, filtroCultivo, filtroTipoSuelo, filtroRiego, orden]);

  // Paginación
  const parcelasVisibles = useMemo(() => {
      return parcelasProcesadas.slice(0, itemsVisibles);
  }, [parcelasProcesadas, itemsVisibles]);

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

          const hasAlerts = pExtended.alertas?.length > 0;
          const alertIcon12px = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top: 2px;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
          const checkIcon14px = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;

          const alertListHtml = hasAlerts
              ? `<ul style="margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap: 6px;">${pExtended.alertas.map(a => `<li style="display:flex; align-items:start; gap:6px; color: ${theme === 'dark' ? '#f87171' : '#dc2626'};"><span style="margin-top:1px;">${alertIcon12px}</span><span style="line-height:1.4;">${a}</span></li>`).join('')}</ul>`
              : `<div style="display:flex; align-items:center; gap:6px; color: ${theme === 'dark' ? '#4ade80' : '#16a34a'}; font-weight: 600;">${checkIcon14px}<span>Todo correcto</span></div>`;

          const tooltipHtml = `
              <div class="map-popup-tooltip" style="display:none; position: absolute; top: 100%; right: 0; margin-top: 8px; width: 224px; padding: 12px; background-color: ${theme === 'dark' ? 'hsl(222.2 84% 4.9%)' : 'white'}; border: 1px solid ${theme === 'dark' ? 'hsl(215 28% 17%)' : 'hsl(215 20% 90%)'}; color: ${theme === 'dark' ? 'hsl(210 40% 98%)' : 'hsl(222.2 84% 4.9%)'}; font-size: 12px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2), 0 10px 10px -5px rgba(0,0,0,0.1); z-index: 99999;">
                  <div style="position: absolute; bottom: 100%; right: 12px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid ${theme === 'dark' ? 'hsl(215 28% 17%)' : 'hsl(215 20% 90%)'};"></div>
                  <div style="position: absolute; bottom: 100%; right: 12px; margin-bottom: -1px; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 6px solid ${theme === 'dark' ? 'hsl(222.2 84% 4.9%)' : 'white'};"></div>
                  ${alertListHtml}
              </div>
          `;

          container.innerHTML = `
            <div style="min-width: 300px;" data-parcel-id="${p.id}">
              <div class="map-popup-header" style="align-items: flex-start; justify-content: space-between; gap: 0.5rem; position: relative; z-index: 100;">
                <div class="flex-1 min-w-0" style="position: relative; z-index: 1;">
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
                <div class="map-popup-status-wrapper" style="position: relative; z-index: 99999;">
                    <div class="${p.estado === 'ok' ? 'status-indicator-ok' : 'status-indicator-alert'} !w-7 !h-7 !flex !items-center !justify-center !rounded-full shrink-0 mt-0.5 cursor-help">
                        ${p.estado === 'ok' ? checkIcon : alertIcon}
                    </div>
                    ${tooltipHtml}
                </div>
              </div>
              
              <div class="map-metric-card !p-2.5" style="position: relative; z-index: 1;">
                  <div class="flex justify-between items-center">
                    <div>
                      <p class="text-[10px] font-bold ${p.humedad != null ? 'text-blue-600' : 'text-muted-foreground'} uppercase tracking-wider">Humedad Media</p>
                      <div class="text-lg font-extrabold ${p.humedad != null ? 'text-foreground' : 'text-muted-foreground'}">${p.humedad != null ? `${p.humedad}%` : '--'}</div>
                    </div>
                    ${dropletsIcon}
                  </div>
              </div>

              <div class="grid grid-cols-[0.8fr_1.2fr] gap-3 text-xs mb-3" style="position: relative; z-index: 1;">
                <div class="info-card-riego cursor-default">
                  <span class="text-muted-foreground font-medium flex items-center gap-1">${clockIcon} Riego</span>
                  <span class="font-semibold text-card-foreground whitespace-normal leading-tight">${p.proximoRiego}</span>
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

    // HACK: Recorrer las capas del mapa para aplicar el color correcto al borde
    // Esto es necesario porque no podemos modificar `initParcelMap` directamente.
    if (parcelManager && typeof (parcelManager as any).eachLayer === 'function') {
      (parcelManager as any).eachLayer((layer: any) => {
        const popup = layer.getPopup();
        if (popup) {
          const content = popup.getContent();
          if (content && content.dataset && content.dataset.parcelId) {
            const parcelId = parseInt(content.dataset.parcelId, 10);
            const parcelData = parcelasSeguras.find(p => p.id === parcelId);
            if (parcelData && typeof layer.setStyle === 'function') {
              layer.setStyle({
                color: parcelData.estado === 'alert' ? '#ef4444' : '#22c55e', // Borde
                fillColor: parcelData.estado === 'alert' ? '#f87171' : '#4ade80', // Relleno
              });
            }
          }
        }
      });
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
        .map-popup-status-wrapper:hover .map-popup-tooltip {
          display: block !important;
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
              <div className="mb-6 space-y-4">
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
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="w-full sm:w-44">
                    <Select
                      value={filtroCultivo}
                      onChange={(val) => setFiltroCultivo(val)}
                      options={opcionesCultivo}
                    />
                  </div>
                  <div className="w-full sm:w-44">
                    <Select
                      value={filtroTipoSuelo}
                      onChange={(val) => setFiltroTipoSuelo(val)}
                      options={opcionesTipoSuelo}
                    />
                  </div>
                  <div className="w-full sm:w-44">
                    <Select
                      value={filtroRiego}
                      onChange={(val) => setFiltroRiego(val)}
                      options={opcionesRiego}
                    />
                  </div>
                  <div className="flex-1 sm:w-auto sm:min-w-[180px]">
                    <Select
                      value={orden}
                      onChange={(val) => setOrden(val)}
                      options={opcionesOrden}
                    />
                  </div>
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
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <button 
                onClick={() => { setEditingParcel(null); setIsModalOpen(true); }} 
                className="group flex h-40 hover:h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border hover:border-primary hover:bg-green-200 dark:hover:bg-primary/10 transition-all duration-500 overflow-hidden"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-green-200 group-hover:text-green-600"><Plus size={28} /></div>
                <span className="font-semibold text-card-foreground">Registrar Parcela</span>
              </button>
              {parcelasVisibles.map(p => (
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
                    
                    {/* Indicador de Estado con Tooltip Flotante */}
                    <div className={`relative group/status cursor-help ${p.estado === 'ok' ? 'status-indicator-ok' : 'status-indicator-alert'}`}>
                      {p.estado === 'ok' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} className="animate-pulse" />}
                      
                      <div className="absolute top-full right-0 mt-2 w-56 p-3 bg-card border border-border text-card-foreground text-xs rounded-xl shadow-2xl opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all z-50 pointer-events-none">
                        <div className="absolute bottom-full right-3 translate-y-[1px] h-3 w-3 rotate-45 border-t border-l border-border bg-card"></div>
                        <div className="relative z-10">
                          {((p as unknown as ParcelaExtended).alertas || []).length > 0 ? (
                            <ul className="space-y-1.5">
                              {(p as unknown as ParcelaExtended).alertas.map((alerta, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-red-600 dark:text-red-400">
                                  <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                  <span className="leading-tight font-medium">{alerta}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                              <CheckCircle2 size={14} />
                              <span>Todo correcto</span>
                            </div>
                          )}
                        </div>
                      </div>
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
                      <span className="font-semibold text-card-foreground leading-tight line-clamp-2">
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
            {itemsVisibles < parcelasProcesadas.length && (
                <div className="mt-8 flex justify-center">
                    <button 
                        onClick={() => setItemsVisibles(prev => prev + 8)}
                        className="flex items-center gap-2 rounded-xl bg-card px-6 py-3 text-base font-bold text-card-foreground border border-border shadow-sm hover:bg-muted transition-all hover:scale-105"
                    >
                        <Plus size={20} /> Cargar Más Parcelas
                    </button>
                </div>
            )}
            </>
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
      <HumidityHistoryModal 
        item={selectedHistoryItem} 
        onClose={() => setSelectedHistoryItem(null)} 
        onError={(msg) => setNotification({ type: 'error', message: msg })}
      />

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
      <IrrigationDecisionModal 
        isOpen={!!viewingIrrigationParcel} 
        parcel={viewingIrrigationParcel} 
        onClose={() => setViewingIrrigationParcel(null)} 
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
    </>
  );
}
