import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LayoutGrid, Globe, Plus, Sprout, CheckCircle2, AlertTriangle, Droplets, Clock, BarChart3, X, Wifi, MapPin, Layers, Pencil, Trash2, Battery, Signal, Router as RouterIcon, Cpu } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import RegistrarParcelaModal from './RegistrarParcelaModal';
import ConfirmarEliminarModal from './ConfirmarEliminarModal';
import { initParcelMap, type Parcela, type Dispositivo } from '../../utils/mapUtils';

const parcelasFalsas: Parcela[] = [
  { 
    id: 1, nombre: 'Sector Norte - Tomates', cultivo: 'Tomate Rojo', tipoSuelo: 'Franco-Arcilloso', humedad: 45, proximoRiego: 'Hoy, 22:00', estado: 'ok', motas: 4,
    coordenadas: [
      [36.94887185099825, -6.100605594574611], [36.9501864933793, -6.105923013725575], [36.946008167461436, -6.107466521031202], [36.94468833903622, -6.102233715367487]
    ] as [number, number][],
    dispositivos: [
      { id: 101, tipo: 'router', esPublico: true, coordenadas: [36.9475, -6.1040], estado: 'online', modelo: 'Gateway Pro V2', ssid: 'LoRa-Norte', bateria: 100, fechaUltimaConexion: 'Hace 2 min', paquetesEnviados: 15420, paquetesRecibidos: 15380, erroresTx: 5, erroresRx: 12, erroresCrc: 3 },
      { id: 102, tipo: 'mota', coordenadas: [36.9485, -6.1020], estado: 'online', nombre: 'Sensor Humedad 1', modelo: 'Heltec V3', bateria: 85, fechaUltimaConexion: 'Hace 10 min', routerId: 101, rssi: -85, snr: 9.5, erroresRx: 0, humedad: 42 },
      { id: 103, tipo: 'mota', coordenadas: [36.9465, -6.1060], estado: 'online', nombre: 'Sensor Humedad 2', modelo: 'Heltec V3', bateria: 72, fechaUltimaConexion: 'Hace 15 min', routerId: 101, rssi: -92, snr: 7.2, erroresRx: 1, humedad: 48 },
      { id: 104, tipo: 'mota', coordenadas: [36.9490, -6.1050], estado: 'low-battery', nombre: 'Sensor Suelo A', modelo: 'Heltec V3', bateria: 12, fechaUltimaConexion: 'Hace 1 hora', routerId: 101, rssi: -105, snr: 2.1, erroresRx: 5, humedad: 45 }
    ]
  },
  { 
    id: 2, nombre: 'Sector Sur - Algodon', cultivo: 'Algodon', tipoSuelo: 'Limoso', humedad: 90, proximoRiego: 'Mañana, 07:00', estado: 'ok', motas: 5,
    coordenadas: [
      [36.947696751728195, -6.095302867086164], 
      [36.95186319198487, -6.093650681420625], [36.95451699582317, -6.104295241892999], 
      [36.950309323918084, -6.105913161047598]
    ] as [number, number][],
    dispositivos: [
      { id: 201, tipo: 'router', esPublico: false, coordenadas: [36.9510, -6.1000], estado: 'online', modelo: 'Gateway Lite', ssid: 'LoRa-Sur', bateria: 95, fechaUltimaConexion: 'Hace 1 min', paquetesEnviados: 8900, paquetesRecibidos: 8850, erroresTx: 2, erroresRx: 5, erroresCrc: 0 },
      { id: 202, tipo: 'mota', coordenadas: [36.9525, -6.0970], estado: 'online', nombre: 'Mota Central', modelo: 'Heltec V3', bateria: 60, fechaUltimaConexion: 'Hace 5 min', routerId: 201, rssi: -78, snr: 11.0, erroresRx: 0, humedad: 88 },
      { id: 203, tipo: 'mota', coordenadas: [36.9500, -6.1030], estado: 'online', nombre: 'Mota Borde', modelo: 'Heltec V3', bateria: 55, fechaUltimaConexion: 'Hace 8 min', routerId: 201, rssi: -95, snr: 6.5, erroresRx: 2, humedad: 92 },
      { id: 204, tipo: 'mota', coordenadas: [36.9490, -6.0960], estado: 'offline', nombre: 'Mota Vieja', modelo: 'Heltec V2', bateria: 0, fechaUltimaConexion: 'Hace 2 días', routerId: 201, rssi: -125, snr: -5.0, erroresRx: 20, humedad: 0 },
      { id: 205, tipo: 'mota', coordenadas: [36.9530, -6.1020], estado: 'online', nombre: 'Sensor Nuevo', modelo: 'Heltec V3', bateria: 98, fechaUltimaConexion: 'Hace 1 min', routerId: 201, rssi: -65, snr: 12.5, erroresRx: 0, humedad: 90 }
    ]
  },
  { 
    id: 3, nombre: 'Sector Este - Vides', cultivo: 'Viñedo Tempranillo', tipoSuelo: 'Calcáreo', humedad: 37, proximoRiego: 'Hoy, 18:00', estado: 'alerta', motas: 3,
    coordenadas: [
      [36.95307824110262, -6.116886463551348], 
      [36.9572215752587, -6.115265353562782], [36.961317959487495, -6.1316134803903655], 
      [36.95718131680132, -6.133309343564988]
    ] as [number, number][],
    dispositivos: [
      { id: 301, tipo: 'router', esPublico: false, coordenadas: [36.9570, -6.1240], estado: 'online', modelo: 'Gateway Pro', ssid: 'LoRa-Este', bateria: 88, fechaUltimaConexion: 'Hace 3 min', paquetesEnviados: 22000, paquetesRecibidos: 21950, erroresTx: 10, erroresRx: 25, erroresCrc: 8 },
      { id: 302, tipo: 'mota', coordenadas: [36.9550, -6.1200], estado: 'online', nombre: 'Vides 1', modelo: 'Heltec V3', bateria: 40, fechaUltimaConexion: 'Hace 20 min', routerId: 301, rssi: -88, snr: 8.0, erroresRx: 1, humedad: 35 },
      { id: 303, tipo: 'mota', coordenadas: [36.9590, -6.1280], estado: 'low-battery', nombre: 'Vides 2', modelo: 'Heltec V3', bateria: 15, fechaUltimaConexion: 'Hace 45 min', routerId: 301, rssi: -110, snr: 1.5, erroresRx: 8, humedad: 39 }
    ]
  },
];

const generateRandomData = (range: '24h' | '7d' | '30d') => {
  const count = range === '24h' ? 24 : range === '7d' ? 7 : 30;
  return Array.from({ length: count }, (_, i) => ({
    label: range === '24h' ? `${i}:00` : range === '7d' ? `Día ${i+1}` : `Día ${i+1}`,
    value: Math.floor(Math.random() * 60) + 20 // 20-80% random
  }));
};

type HistoryItem = { type: 'parcela', data: Parcela } | { type: 'mota', data: Dispositivo };

// Componente Modal para Resumen de Dispositivos
const DeviceSummaryModal = ({ parcel, onClose }: { parcel: Parcela, onClose: () => void }) => {
  const routers = parcel.dispositivos?.filter(d => d.tipo === 'router') || [];
  const motas = parcel.dispositivos?.filter(d => d.tipo === 'mota') || [];

  const DeviceList = ({ title, devices, icon: Icon, colorClass }: any) => (
    <div className="mb-6 last:mb-0">
      <h4 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${colorClass}`}>
        <Icon size={16} /> {title} ({devices.length})
      </h4>
      {devices.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No hay dispositivos de este tipo.</p>
      ) : (
        <div className="grid gap-3">
          {devices.map((d: Dispositivo) => (
            <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border transition-colors hover:bg-muted">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${d.estado === 'online' ? 'bg-green-500' : d.estado === 'low-battery' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                <div>
                  <p className="font-bold text-card-foreground text-sm">{d.nombre || d.modelo || `Dispositivo #${d.id}`}</p>
                  <p className="text-xs text-muted-foreground">{d.ssid || `ID: ${d.id}`}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                {d.tipo === 'mota' && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Signal size={14} /> {d.rssi} dBm
                  </div>
                )}
                <div className={`flex items-center gap-1 ${d.bateria && d.bateria < 20 ? 'text-red-500' : 'text-green-600'}`}>
                  <Battery size={14} /> {d.bateria}%
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

export default function ParcelasView() {
  const { theme } = useTheme();
  const [parcelas, setParcelas] = useState<Parcela[]>(parcelasFalsas);
  const [vista, setVista] = useState<'galeria' | 'mapa'>('galeria');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [parcelaParaEliminar, setParcelaParaEliminar] = useState<Parcela | null>(null);
  
  // Estado unificado para el historial (Parcela o Mota)
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [chartData, setChartData] = useState<{label: string, value: number}[]>([]);
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [targetParcelId, setTargetParcelId] = useState<number | null>(null);
  const [editingParcel, setEditingParcel] = useState<Parcela | null>(null);
  const [viewingDevicesParcel, setViewingDevicesParcel] = useState<Parcela | null>(null);

  // Actualizar datos cuando cambia el rango o el ítem seleccionado
  useEffect(() => {
    if (selectedHistoryItem) {
      setChartData(generateRandomData(timeRange));
    }
  }, [timeRange, selectedHistoryItem]);

  const openHistory = (item: HistoryItem) => {
    setSelectedHistoryItem(item);
    setTimeRange('24h'); // Resetear a 24h al abrir
  };

  const handleDeleteParcel = (parcela: Parcela) => {
    setParcelaParaEliminar(parcela);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteAndClose = () => {
    if (!parcelaParaEliminar) return;
    setParcelas(prev => prev.filter(p => p.id !== parcelaParaEliminar.id));
    setIsDeleteModalOpen(false);
    setParcelaParaEliminar(null);
  };

  const handleEditParcel = (parcel: Parcela) => {
    setEditingParcel(parcel);
    setIsModalOpen(true);
  };

  const handleSaveParcel = (parcelaGuardada: Parcela) => {
    if (editingParcel) {
      // Actualizar existente
      setParcelas(prev => prev.map(p => p.id === parcelaGuardada.id ? parcelaGuardada : p));
    } else {
      // Crear nueva
      setParcelas(prev => [...prev, parcelaGuardada]);
    }
    setEditingParcel(null);
    setIsModalOpen(false);
  };

  useEffect(() => {
    if (vista !== 'mapa' || !mapRef.current) return;
    
    const map = L.map(mapRef.current);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);
    
    // Usar la utilidad compartida para inicializar el mapa
    const parcelManager = initParcelMap(map, parcelas, {
      onClick: (parcel) => {
        // Calcular centro para hacer zoom
        const center = L.polygon(parcel.coordenadas).getBounds().getCenter();
        map.flyTo(center, 16, { duration: 1.5 });
      },
      onDeviceHistoryClick: (device) => {
        openHistory({ type: 'mota', data: device });
      },
      getPopupContent: (p) => {
        const container = document.createElement('div');
        container.className = "min-w-[240px] font-sans";
        container.innerHTML = `
          <div>
            <div class="flex justify-between items-start mb-3">
              <div>
                <h3 class="text-lg font-bold text-slate-800 m-0 leading-tight">${p.nombre}</h3>
                <p class="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">${p.cultivo}</p>
                ${p.tipoSuelo ? `<p class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg> ${p.tipoSuelo}</p>` : ''}
              </div>
              ${p.estado === 'alerta' 
                ? '<span class="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full border border-red-200">ALERTA</span>' 
                : '<span class="bg-green-100 text-green-600 text-[10px] font-bold px-2 py-1 rounded-full border border-green-200">OK</span>'
              }
            </div>
            
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="text-[10px] text-slate-400 font-bold uppercase">Humedad</span>
                </div>
                <div class="text-xl font-extrabold text-slate-700">${p.humedad}%</div>
              </div>
              <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div class="flex items-center gap-1.5 mb-1">
                  <span class="text-[10px] text-slate-400 font-bold uppercase">Riego</span>
                </div>
                <div class="text-sm font-bold text-slate-700 mt-0.5">${p.proximoRiego}</div>
              </div>
            </div>
          </div>
          <button id="btn-history-${p.id}" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-md shadow-blue-200">
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

    // Si hay una parcela objetivo (venimos desde la galería), centramos en ella
    if (targetParcelId) {
      const target = parcelas.find(p => p.id === targetParcelId);
      if (target) {
        const center = L.polygon(target.coordenadas).getBounds().getCenter();
        map.setView(center, 16);
      }
      setTargetParcelId(null); // Resetear objetivo
    } else if (parcelas.length > 0) {
      map.fitBounds(parcelManager.getBounds(), { padding: [50, 50] });
    } else {
      map.setView([37.385, -5.978], 14);
    }

    map.on('zoomend', parcelManager.updateVisibility);

    // Ejecutar la visibilidad inicial después de que el mapa y las capas se hayan configurado
    parcelManager.updateVisibility();

    return () => { 
      parcelManager.cleanup();
      map.remove(); 
    };
  }, [vista, theme, parcelas]); // Añadido parcelas a dependencias para redibujar si cambian

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-card-foreground">Gestión de Terrenos</h2>
          <div className="flex rounded-lg border border-border bg-card p-1">
            <button onClick={() => setVista('galeria')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${vista === 'galeria' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}><LayoutGrid size={16} /> Galería</button>
            <button onClick={() => setVista('mapa')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${vista === 'mapa' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/50'}`}><Globe size={16} /> Satélite</button>
          </div>
        </div>

        {vista === 'mapa' ? (
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-border shadow-inner">
            <div ref={mapRef} className="h-full w-full z-0" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <button 
              onClick={() => { setEditingParcel(null); setIsModalOpen(true); }} 
              className="group flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/10 transition-all"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-green-200 group-hover:text-green-600"><Plus size={28} /></div>
              <span className="font-semibold text-card-foreground">Registrar Parcela</span>
            </button>
            {parcelas.map(p => (
              <div key={p.id} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
                {/* Header */}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-card-foreground leading-tight">{p.nombre}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-700">
                          <Sprout size={12} /> {p.cultivo}
                        </span>
                        {p.tipoSuelo && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-bold text-amber-700">
                            <Layers size={12} /> {p.tipoSuelo}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${p.estado === 'ok' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                      {p.estado === 'ok' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                    </div>
                  </div>

                  {/* Main Metric: Humidity */}
                  <div className="mb-4 p-4 rounded-xl bg-blue-500/10 dark:bg-blue-500/5 border border-blue-500/20 dark:border-blue-500/10 cursor-pointer hover:bg-blue-500/20 dark:hover:bg-blue-500/10 transition-colors" onClick={() => openHistory({ type: 'parcela', data: p })}>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Humedad Media</p>
                        <div className="text-3xl font-extrabold text-card-foreground">{p.humedad}%</div>
                      </div>
                      <Droplets className="text-blue-500/40 mb-1" size={32} />
                    </div>
                  </div>

                  {/* Secondary Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground font-medium flex items-center gap-1"><Clock size={12}/> Riego</span>
                      <span className="font-semibold text-card-foreground truncate">{p.proximoRiego}</span>
                    </div>
                    <div 
                      className="flex flex-col gap-1 p-2 rounded-lg bg-muted/50 cursor-pointer hover:bg-purple-500/20 dark:hover:bg-purple-500/10 transition-colors group/dev"
                      onClick={() => setViewingDevicesParcel(p)}
                    >
                      <span className="text-muted-foreground font-medium flex items-center gap-1"><Wifi size={12}/> Dispositivos</span>
                      <span className="font-semibold text-card-foreground">
                        {p.dispositivos?.length || 0} Activos
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
        )}
      </motion.div>
      <RegistrarParcelaModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingParcel(null); }} 
        parcelasExistentes={parcelas}
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
              className="w-full max-w-2xl overflow-hidden rounded-3xl bg-card shadow-2xl"
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

                <div className="h-64 w-full">
                  {/* Gráfica SVG Interactiva */}
                  <div className="relative h-full w-full select-none">
                    <svg width="100%" height="100%" viewBox="0 0 600 200" className="overflow-visible">
                      {/* Líneas de guía */}
                      {[0, 25, 50, 75, 100].map(v => {
                        const y = 200 - 30 - ((v / 100) * 140);
                        return (
                          <g key={v}>
                            <line x1="30" y1={y} x2="570" y2={y} stroke="currentColor" className="text-border" strokeWidth="1" />
                            <text x="20" y={y + 4} textAnchor="end" className="text-[10px] fill-muted-foreground font-medium">{v}%</text>
                          </g>
                        )
                      })}

                      {/* Generar Path */}
                      {(() => {
                        if (chartData.length === 0) return null;

                        const points = chartData.map((d, i) => {
                          const x = 30 + (i * (540 / Math.max(chartData.length - 1, 1)));
                          const y = 200 - 30 - ((d.value / 100) * 140);
                          return { x, y, ...d };
                        });
                        const pathD = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;
                        const areaD = `${pathD} L ${points[points.length-1].x},170 L ${points[0].x},170 Z`;

                        return (
                          <>
                            <defs>
                              <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/><stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/></linearGradient>
                            </defs>
                            <path d={areaD} fill="url(#gradient)" />
                            <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            
                            {points.map((p, i) => (
                              <g key={i} onMouseEnter={() => setHoveredChartIndex(i)} onMouseLeave={() => setHoveredChartIndex(null)} className="cursor-pointer">
                                <rect x={p.x - 20} y={0} width={40} height={200} fill="transparent" />
                                
                                {/* Línea guía vertical */}
                                {hoveredChartIndex === i && (
                                  <line 
                                    x1={p.x} y1={p.y} x2={p.x} y2={170} 
                                    strokeDasharray="4 4" 
                                    className="stroke-border" 
                                    strokeWidth="1.5" 
                                  />
                                )}

                                <circle cx={p.x} cy={p.y} r={hoveredChartIndex === i ? 6 : 4} className={`transition-all duration-200 ${hoveredChartIndex === i ? 'fill-blue-600 stroke-card stroke-2' : 'fill-card stroke-blue-500 stroke-2'}`} />
                                <text x={p.x} y={190} textAnchor="middle" className={`text-xs font-medium transition-all ${hoveredChartIndex === i ? 'fill-blue-600 opacity-100' : 'fill-muted-foreground opacity-0'}`}>{p.label}</text>
                                
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
    </>
  );
}
