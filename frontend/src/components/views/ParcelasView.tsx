import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LayoutGrid, Globe, Plus, Sprout, CheckCircle2, AlertTriangle, Droplets, Clock, BarChart3, X, Wifi } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import RegistrarParcelaModal from './RegistrarParcelaModal';
import { initParcelMap, type Parcela } from '../../utils/mapUtils';

const parcelasFalsas: Parcela[] = [
  { 
    id: 1, nombre: 'Sector Norte - Tomates', cultivo: 'Tomate Rojo', humedad: 45, proximoRiego: 'Hoy, 22:00', estado: 'ok', motas: 4,
    coordenadas: [
      [36.94887185099825, -6.100605594574611], [36.9501864933793, -6.105923013725575], [36.946008167461436, -6.107466521031202], [36.94468833903622, -6.102233715367487]
    ] as [number, number][],
    dispositivos: [
      { id: 101, tipo: 'router', esPublico: true, coordenadas: [36.9475, -6.1040], estado: 'online', modelo: 'Gateway Pro V2', ssid: 'LoRa-Norte', bateria: 100, fechaUltimaConexion: 'Hace 2 min', paquetesEnviados: 15420, paquetesRecibidos: 15380, erroresTx: 5, erroresRx: 12, erroresCrc: 3 },
      { id: 102, tipo: 'mota', coordenadas: [36.9485, -6.1020], estado: 'online', nombre: 'Sensor Humedad 1', modelo: 'Heltec V3', bateria: 85, fechaUltimaConexion: 'Hace 10 min', routerId: 101, rssi: -85, snr: 9.5, erroresRx: 0 },
      { id: 103, tipo: 'mota', coordenadas: [36.9465, -6.1060], estado: 'online', nombre: 'Sensor Humedad 2', modelo: 'Heltec V3', bateria: 72, fechaUltimaConexion: 'Hace 15 min', routerId: 101, rssi: -92, snr: 7.2, erroresRx: 1 },
      { id: 104, tipo: 'mota', coordenadas: [36.9490, -6.1050], estado: 'low-battery', nombre: 'Sensor Suelo A', modelo: 'Heltec V3', bateria: 12, fechaUltimaConexion: 'Hace 1 hora', routerId: 101, rssi: -105, snr: 2.1, erroresRx: 5 }
    ]
  },
  { 
    id: 2, nombre: 'Sector Sur - Algodon', cultivo: 'Algodon', humedad: 90, proximoRiego: 'Mañana, 07:00', estado: 'ok', motas: 5,
    coordenadas: [
      [36.947696751728195, -6.095302867086164], 
      [36.95186319198487, -6.093650681420625], [36.95451699582317, -6.104295241892999], 
      [36.950309323918084, -6.105913161047598]
    ] as [number, number][],
    dispositivos: [
      { id: 201, tipo: 'router', esPublico: false, coordenadas: [36.9510, -6.1000], estado: 'online', modelo: 'Gateway Lite', ssid: 'LoRa-Sur', bateria: 95, fechaUltimaConexion: 'Hace 1 min', paquetesEnviados: 8900, paquetesRecibidos: 8850, erroresTx: 2, erroresRx: 5, erroresCrc: 0 },
      { id: 202, tipo: 'mota', coordenadas: [36.9525, -6.0970], estado: 'online', nombre: 'Mota Central', modelo: 'Heltec V3', bateria: 60, fechaUltimaConexion: 'Hace 5 min', routerId: 201, rssi: -78, snr: 11.0, erroresRx: 0 },
      { id: 203, tipo: 'mota', coordenadas: [36.9500, -6.1030], estado: 'online', nombre: 'Mota Borde', modelo: 'Heltec V3', bateria: 55, fechaUltimaConexion: 'Hace 8 min', routerId: 201, rssi: -95, snr: 6.5, erroresRx: 2 },
      { id: 204, tipo: 'mota', coordenadas: [36.9490, -6.0960], estado: 'offline', nombre: 'Mota Vieja', modelo: 'Heltec V2', bateria: 0, fechaUltimaConexion: 'Hace 2 días', routerId: 201, rssi: -125, snr: -5.0, erroresRx: 20 },
      { id: 205, tipo: 'mota', coordenadas: [36.9530, -6.1020], estado: 'online', nombre: 'Sensor Nuevo', modelo: 'Heltec V3', bateria: 98, fechaUltimaConexion: 'Hace 1 min', routerId: 201, rssi: -65, snr: 12.5, erroresRx: 0 }
    ]
  },
  { 
    id: 3, nombre: 'Sector Este - Vides', cultivo: 'Viñedo Tempranillo', humedad: 37, proximoRiego: 'Hoy, 18:00', estado: 'alerta', motas: 3,
    coordenadas: [
      [36.95307824110262, -6.116886463551348], 
      [36.9572215752587, -6.115265353562782], [36.961317959487495, -6.1316134803903655], 
      [36.95718131680132, -6.133309343564988]
    ] as [number, number][],
    dispositivos: [
      { id: 301, tipo: 'router', esPublico: false, coordenadas: [36.9570, -6.1240], estado: 'online', modelo: 'Gateway Pro', ssid: 'LoRa-Este', bateria: 88, fechaUltimaConexion: 'Hace 3 min', paquetesEnviados: 22000, paquetesRecibidos: 21950, erroresTx: 10, erroresRx: 25, erroresCrc: 8 },
      { id: 302, tipo: 'mota', coordenadas: [36.9550, -6.1200], estado: 'online', nombre: 'Vides 1', modelo: 'Heltec V3', bateria: 40, fechaUltimaConexion: 'Hace 20 min', routerId: 301, rssi: -88, snr: 8.0, erroresRx: 1 },
      { id: 303, tipo: 'mota', coordenadas: [36.9590, -6.1280], estado: 'low-battery', nombre: 'Vides 2', modelo: 'Heltec V3', bateria: 15, fechaUltimaConexion: 'Hace 45 min', routerId: 301, rssi: -110, snr: 1.5, erroresRx: 8 }
    ]
  },
];

const generateRandomData = () => {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return days.map(day => ({
    day,
    value: Math.floor(Math.random() * 50) + 30 // 30-80% random
  }));
};

export default function ParcelasView() {
  const { theme } = useTheme();
  const [vista, setVista] = useState<'galeria' | 'mapa'>('galeria');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [parcelaHistorial, setParcelaHistorial] = useState<Parcela | null>(null);
  const [chartData, setChartData] = useState<{day: string, value: number}[]>([]);
  const [hoveredChartIndex, setHoveredChartIndex] = useState<number | null>(null);

  useEffect(() => {
    if (vista !== 'mapa' || !mapRef.current) return;
    
    const map = L.map(mapRef.current);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);
    
    // Usar la utilidad compartida para inicializar el mapa
    const parcelManager = initParcelMap(map, parcelasFalsas, {
      onClick: (parcel) => {
        // Calcular centro para hacer zoom
        const center = L.polygon(parcel.coordenadas).getBounds().getCenter();
        map.flyTo(center, 16, { duration: 1.5 });
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
          setChartData(generateRandomData());
          setParcelaHistorial(p);
        });
        return container;
      }
    });

    if (parcelasFalsas.length > 0) {
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
  }, [vista, theme]);

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full flex-col">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">Gestión de Terrenos</h2>
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-slate-800">
            <button onClick={() => setVista('galeria')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm ${vista === 'galeria' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}><LayoutGrid size={16} /> Galería</button>
            <button onClick={() => setVista('mapa')} className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm ${vista === 'mapa' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}><Globe size={16} /> Satélite</button>
          </div>
        </div>

        {vista === 'mapa' ? (
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 shadow-inner">
            <div ref={mapRef} className="h-full w-full z-0" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <button onClick={() => setIsModalOpen(true)} className="group flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 hover:border-green-500 hover:bg-green-50 dark:border-slate-700 dark:hover:bg-green-500/10 transition-all">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 group-hover:bg-green-200 group-hover:text-green-600 dark:bg-slate-800 dark:group-hover:bg-green-900/50"><Plus size={28} /></div>
              <span className="font-semibold text-slate-600 dark:text-slate-400">Registrar Parcela</span>
            </button>
            {parcelasFalsas.map(p => (
              <div key={p.id} className="relative flex h-64 flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/5 dark:bg-slate-900 hover:shadow-xl transition-all">
                <Sprout className="absolute -bottom-6 -right-6 h-40 w-40 text-slate-50 dark:text-slate-800/20" strokeWidth={1} />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{p.nombre}</h3>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{p.cultivo}</p>
                  </div>
                  {p.estado === 'ok' ? <CheckCircle2 className="text-green-500" size={24} /> : <AlertTriangle className="text-red-500" size={24} />}
                </div>
                <div className="relative z-10 space-y-2">
                  <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2 dark:bg-blue-500/10">
                    <span className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-400"><Droplets size={14}/> Humedad Media</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-white">{p.humedad}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2 dark:bg-emerald-500/10">
                    <span className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><Clock size={14}/> Próximo Riego</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-white">{p.proximoRiego}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-purple-50 px-4 py-2 dark:bg-purple-500/10">
                    <span className="flex items-center gap-2 text-xs font-semibold text-purple-700 dark:text-purple-400"><Wifi size={14}/> Dispositivos</span>
                    <div className="flex gap-3 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300"><span className="text-purple-600">{p.dispositivos?.filter(d => d.tipo === 'router').length || 0}</span> Routers</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300"><span className="text-cyan-600">{p.dispositivos?.filter(d => d.tipo === 'mota').length || 0}</span> Motas</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
      <RegistrarParcelaModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        parcelasExistentes={parcelasFalsas}
      />

      {/* Modal de Historial de Humedad */}
      <AnimatePresence>
        {parcelaHistorial && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6 dark:border-white/10">
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <BarChart3 className="text-blue-500"/> Historial de Humedad
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{parcelaHistorial.nombre}</p>
                </div>
                <button onClick={() => setParcelaHistorial(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-8">
                <div className="h-64 w-full">
                  {/* Gráfica SVG Interactiva */}
                  <div className="relative h-full w-full select-none">
                    <svg width="100%" height="100%" viewBox="0 0 600 200" className="overflow-visible">
                      {/* Líneas de guía */}
                      {[0, 25, 50, 75, 100].map(v => {
                        const y = 200 - 30 - ((v / 100) * 140);
                        return (
                          <g key={v}>
                            <line x1="30" y1={y} x2="570" y2={y} stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="1" />
                            <text x="20" y={y + 4} textAnchor="end" className="text-[10px] fill-slate-400 font-medium">{v}%</text>
                          </g>
                        )
                      })}

                      {/* Generar Path */}
                      {(() => {
                        const points = chartData.map((d, i) => {
                          const x = 30 + (i * (540 / (chartData.length - 1)));
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
                                <circle cx={p.x} cy={p.y} r={hoveredChartIndex === i ? 6 : 4} className={`transition-all duration-200 ${hoveredChartIndex === i ? 'fill-blue-600 stroke-white stroke-2' : 'fill-white stroke-blue-500 stroke-2'}`} />
                                <text x={p.x} y={190} textAnchor="middle" className={`text-xs font-medium transition-colors ${hoveredChartIndex === i ? 'fill-blue-600' : 'fill-slate-400'}`}>{p.day}</text>
                                
                                {hoveredChartIndex === i && (
                                  <foreignObject x={p.x - 40} y={p.y - 50} width={80} height={40} className="overflow-visible pointer-events-none">
                                    <div className="flex flex-col items-center justify-center bg-slate-900 text-white text-xs rounded-lg py-1 px-2 shadow-xl">
                                      <span className="font-bold">{p.value}%</span>
                                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 border-4 border-transparent border-t-slate-900"></div>
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
    </>
  );
}
