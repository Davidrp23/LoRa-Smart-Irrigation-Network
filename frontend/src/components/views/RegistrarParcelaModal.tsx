import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Map, Undo2, Check, ChevronDown, Search, CheckCircle } from 'lucide-react';
import { initParcelMap, type Parcela, type ParcelMapManager } from '../../utils/mapUtils';


const CULTIVOS_DISPONIBLES = [
  "Aceituna (Olivo)", "Acelga", "Aguacate", "Ajo", "Albahaca", "Albaricoque", "Alcachofa", "Alfalfa", "Algodón", "Almendra", "Apio", "Arándano", "Arroz", "Avellana", "Avena",
  "Batata", "Berenjena", "Brócoli", "Cacahuete", "Cacao", "Café", "Calabacín", "Calabaza", "Caña de azúcar", "Caqui", "Cebada", "Cebolla", "Centeno", "Cereza", "Chirimoya", "Ciruela", "Coco", "Col", "Coliflor", "Colza",
  "Dátil", "Endibia", "Escarola", "Espárrago", "Espinaca", "Frambuesa", "Fresa / Fresón", "Garbanzo", "Girasol", "Granada", "Grosella", "Guisante",
  "Haba", "Higo", "Hinojo", "Judía", "Kiwi", "Laurel", "Lechuga", "Lenteja", "Lima", "Limón", "Lino", "Lúpulo",
  "Maíz", "Mandarina", "Mango", "Manzana", "Melocotón", "Melón", "Membrillo", "Mora", "Nabo", "Naranja", "Nectarina", "Níspero", "Nuez",
  "Ñame", "Papaya", "Patata", "Pepino", "Pera", "Perejil", "Pimiento", "Piña", "Pistacho", "Plátano", "Pomelo", "Puerro",
  "Rábano", "Remolacha", "Repollo", "Rúcula", "Sandía", "Soja", "Sorgo", "Tabaco", "Tomate", "Trigo", "Tritikale", "Uva (Viñedo)", "Yuca", "Zanahoria", "Zarzamora"
];

const TIPOS_SUELO = [
  "Arcilloso", "Arenoso", "Calcáreo", "Franco", "Franco-Arcilloso", "Franco-Arenoso", "Franco-Limoso", "Limoso", "Pedregoso", "Salino", "Turba"
];

interface RegistrarParcelaModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcelasExistentes: Parcela[];
  parcelaAEditar?: Parcela | null;
  onGuardar: (parcela: Parcela) => void;
}

export default function RegistrarParcelaModal({ isOpen, onClose, parcelasExistentes, parcelaAEditar, onGuardar }: RegistrarParcelaModalProps) {
  // Inicializar estado directamente con props para evitar renderizados vacíos iniciales
  const [nombre, setNombre] = useState(parcelaAEditar?.nombre || '');
  const [cultivo, setCultivo] = useState(parcelaAEditar?.cultivo || '');
  const [tipoSuelo, setTipoSuelo] = useState(parcelaAEditar?.tipoSuelo || '');
  const [puntos, setPuntos] = useState<[number, number][]>(parcelaAEditar?.coordenadas || []);
  const [isCultivoOpen, setIsCultivoOpen] = useState(false);
  const [isSueloOpen, setIsSueloOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownSueloRef = useRef<HTMLDivElement>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const pointsLayerRef = useRef<L.FeatureGroup | null>(null); 
  const labelMarkerRef = useRef<L.Marker | null>(null); 
  const unifiedMarkerRef = useRef<L.CircleMarker | null>(null); // Nuevo: punto central
  const parcelMapManagerRef = useRef<ParcelMapManager | null>(null);
  const isEditingRef = useRef(false);
  isEditingRef.current = !!parcelaAEditar;

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCultivoOpen(false);
      }
      if (dropdownSueloRef.current && !dropdownSueloRef.current.contains(event.target as Node)) {
        setIsSueloOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cultivosFiltrados = CULTIVOS_DISPONIBLES.filter(c => 
    c.toLowerCase().includes(cultivo.toLowerCase())
  );

  const suelosFiltrados = TIPOS_SUELO.filter(s => 
    s.toLowerCase().includes(tipoSuelo.toLowerCase())
  );

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Actualizar estado si cambia la parcela a editar mientras el modal está abierto
    if (parcelaAEditar) {
      setNombre(parcelaAEditar.nombre);
      setCultivo(parcelaAEditar.cultivo);
      setTipoSuelo(parcelaAEditar.tipoSuelo || '');
      setPuntos(parcelaAEditar.coordenadas);
    }
    // Nota: No reseteamos a vacío aquí para evitar parpadeos, se maneja en el onClose o al montar

    // Filtrar la parcela actual de las existentes para no dibujarla doble (como estática y como editable)
    const parcelasParaMapa = parcelaAEditar ? parcelasExistentes.filter(p => p.id !== parcelaAEditar.id) : parcelasExistentes;

    const map = L.map(mapContainerRef.current, { zoomControl: false });
    mapRef.current = map;

    const isEditing = !!parcelaAEditar;
    const polygonStyle = isEditing
      ? { color: '#f59e0b', fillColor: '#facc15', fillOpacity: 0.4, weight: 4 } // Amarillo para editar
      : { color: '#22c55e', fillColor: '#4ade80', fillOpacity: 0.3, weight: 4 }; // Verde para crear

    // Inicializar capas inmediatamente para evitar referencias nulas
    pointsLayerRef.current = L.featureGroup().addTo(map);
    polygonLayerRef.current = L.polygon([], polygonStyle).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}').addTo(map);

    map.on('click', (e) => {
      const nuevaCoordenada: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPuntos(prev => {
        const nuevosPuntos = [...prev, nuevaCoordenada];
        actualizarMapa(nuevosPuntos);
        return nuevosPuntos;
      });
    });

    // Lógica para detectar el cambio de zoom y mostrar/ocultar elementos
    map.on('zoomend', () => {
      actualizarVisibilidadPorZoom();
    });
    
    // Ejecutar una vez al inicio (con un pequeño delay para asegurar que el mapa está listo/redimensionado)
    const timerId = setTimeout(() => {
      if (!mapRef.current) return; // Seguridad por si se cerró el modal
      
      map.invalidateSize(); // Forzar redimensionamiento AHORA que el modal es visible.

      const initialPoints = parcelaAEditar ? parcelaAEditar.coordenadas : [];

      // 1. Establecer la vista inicial ANTES de añadir capas que requieran proyección
      let viewSet = false;

      // Si estamos editando, centrar en la parcela a editar
      if (initialPoints.length > 0) {
         const bounds = L.polygon(initialPoints).getBounds();
         if (bounds && bounds.isValid()) {
            try {
              map.fitBounds(bounds, { padding: [80, 80] });
              viewSet = true;
            } catch (err) {
              console.error("❌ Error al hacer fitBounds:", err);
            }
         }
      }

      // Inicializar parcelas existentes con la utilidad compartida
      if (parcelasParaMapa.length > 0) {
        parcelMapManagerRef.current = initParcelMap(map, parcelasParaMapa, {
          onClick: (parcel) => {
            const center = L.polygon(parcel.coordenadas).getBounds().getCenter();
            map.flyTo(center, 16, { duration: 1.5 });
          },
          getPopupContent: () => null // No mostrar popup en este modo
        });
        
        // Si no hemos establecido vista (es decir, es nueva parcela), centrar en las existentes
        if (!viewSet) {
           const bounds = parcelMapManagerRef.current.getBounds();
           if (bounds.isValid()) {
             map.fitBounds(bounds, { padding: [50, 50] });
             viewSet = true;
           }
        }
      } 
      
      // Si aún no hay vista (ni editar, ni existentes), usar por defecto
      if (!viewSet) {
        map.setView([37.3891, -5.9845], 15);
      }

      // Actualizar geometría del polígono si existe
      if (polygonLayerRef.current) {
        polygonLayerRef.current.setLatLngs(initialPoints);
      }

      // Dibujar vértices y etiquetas iniciales (ahora que la vista está establecida)
      actualizarMapa(initialPoints);

      actualizarVisibilidadPorZoom();
    }, 300); // Tiempo suficiente para que termine la animación del modal
    map.on('moveend', actualizarVisibilidadPorZoom);

    return () => {
      clearTimeout(timerId);
      // Primero, limpiar las capas y gestores que dependen del mapa
      if (parcelMapManagerRef.current) {
        parcelMapManagerRef.current.cleanup();
        parcelMapManagerRef.current = null;
      }

      // Luego, destruir la instancia del mapa
      if (mapRef.current) {
        mapRef.current.off();
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Finalmente, limpiar el resto de referencias y estado
      polygonLayerRef.current = null;
      pointsLayerRef.current = null;
      labelMarkerRef.current = null;
      unifiedMarkerRef.current = null;
      
      setPuntos([]);
      setNombre('');
      setCultivo('');
      setTipoSuelo('');
    };
  }, [isOpen, parcelasExistentes, parcelaAEditar]);

  // Sincronizar etiqueta cuando el nombre cambie
  useEffect(() => {
    actualizarMapa(puntos);
  }, [nombre, puntos]);

  const actualizarVisibilidadPorZoom = () => {
    if (!mapRef.current) return;
    // Protección crítica: No intentar proyectar si el mapa no tiene centro/zoom
    if (mapRef.current.getZoom() === undefined) return;

    const zoom = mapRef.current.getZoom();
    const isZoomedIn = zoom >= 14;

    // 1. Gestionar visibilidad de parcelas existentes (usando la utilidad compartida)
    if (parcelMapManagerRef.current) {
      parcelMapManagerRef.current.updateVisibility();
    }

    // 2. Gestionar visibilidad de la nueva parcela (si existe)
    let showLabelNew = false;
    if (polygonLayerRef.current) {
      const bounds = polygonLayerRef.current.getBounds();
      if (bounds.isValid()) {
        // Calcular dimensiones en píxeles para decidir si mostrar etiqueta
        const northEast = mapRef.current.latLngToContainerPoint(bounds.getNorthEast());
        const southWest = mapRef.current.latLngToContainerPoint(bounds.getSouthWest());
        const width = Math.abs(northEast.x - southWest.x);
        const height = Math.abs(northEast.y - southWest.y);
        
        // Mostrar etiqueta solo si el polígono es lo suficientemente grande (ej. 80x30 px)
        showLabelNew = width > 80 && height > 30;
      }
    }

    // Controlar Etiqueta
    if (labelMarkerRef.current) {
      if (showLabelNew && !mapRef.current.hasLayer(labelMarkerRef.current)) {
        labelMarkerRef.current.addTo(mapRef.current);
      } else if (!showLabelNew && mapRef.current.hasLayer(labelMarkerRef.current)) {
        mapRef.current.removeLayer(labelMarkerRef.current);
      }
    }

    // Controlar Vértices vs Punto Unificado
    if (pointsLayerRef.current && unifiedMarkerRef.current) {
      if (isZoomedIn) {
        if (!mapRef.current.hasLayer(pointsLayerRef.current)) pointsLayerRef.current.addTo(mapRef.current);
        if (mapRef.current.hasLayer(unifiedMarkerRef.current)) mapRef.current.removeLayer(unifiedMarkerRef.current);
      } else {
        if (mapRef.current.hasLayer(pointsLayerRef.current)) mapRef.current.removeLayer(pointsLayerRef.current);
        if (!mapRef.current.hasLayer(unifiedMarkerRef.current)) unifiedMarkerRef.current.addTo(mapRef.current);
      }
    }
  };

  const actualizarMapa = (coords: [number, number][]) => {
    if (!polygonLayerRef.current || !pointsLayerRef.current || !mapRef.current) return;
    
    // Protección: Si el mapa no está listo, no intentar añadir marcadores complejos
    if (mapRef.current.getZoom() === undefined) return;

    polygonLayerRef.current.setLatLngs(coords);
    pointsLayerRef.current.clearLayers();

    const vertexFillColor = isEditingRef.current ? '#d97706' : '#16a34a'; // Naranja para editar, verde para crear

    coords.forEach(coord => {
      L.circleMarker(coord, {
        radius: 6, color: '#ffffff', weight: 2, fillColor: vertexFillColor, fillOpacity: 1
      }).addTo(pointsLayerRef.current!);
    });

    if (labelMarkerRef.current) mapRef.current.removeLayer(labelMarkerRef.current);
    if (unifiedMarkerRef.current) mapRef.current.removeLayer(unifiedMarkerRef.current);

    if (coords.length >= 3) {
      const center = polygonLayerRef.current.getBounds().getCenter();

      // Solo añadir etiqueta si hay nombre y el centro es válido
      if (nombre.trim() !== '' && center) {
        // CAMBIO: Nuevo formato moderno y centrado
        const textIcon = L.divIcon({
          className: 'bg-transparent border-none shadow-none',
          html: `
            <div style="transform: translate(-50%, -50%); display: flex; justify-content: center; align-items: center;">
              <div class="px-3 py-1 rounded-full bg-slate-900/75 backdrop-blur-sm border border-white/20 shadow-lg">
                <span class="text-white text-xs font-semibold whitespace-nowrap">${nombre}</span>
              </div>
            </div>
          `,
          iconSize: [0, 0], // Usamos transform translate para centrar, así no depende de un tamaño fijo
          iconAnchor: [0, 0]
        });
        labelMarkerRef.current = L.marker(center, { icon: textIcon, interactive: false });
      }

      if (center) {
        const unifiedMarkerColor = isEditingRef.current ? '#d97706' : '#16a34a';
        unifiedMarkerRef.current = L.circleMarker(center, {
          radius: 8, color: '#ffffff', weight: 2, fillColor: unifiedMarkerColor, fillOpacity: 1
        });
      }

      actualizarVisibilidadPorZoom();
    }
  };

  const deshacerUltimoPunto = () => {
    setPuntos(prev => prev.slice(0, -1));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (puntos.length < 3) {
      alert("Debes dibujar al menos 3 puntos en el mapa para cerrar un polígono.");
      return;
    }

    const nuevaParcela: Parcela = {
      id: parcelaAEditar ? parcelaAEditar.id : Date.now(), // ID temporal si es nuevo
      nombre,
      cultivo,
      tipoSuelo,
      coordenadas: puntos,
      // Mantener datos existentes o valores por defecto
      humedad: parcelaAEditar?.humedad ?? 0,
      proximoRiego: parcelaAEditar?.proximoRiego ?? 'N/A',
      estado: parcelaAEditar?.estado ?? 'ok',
      motas: parcelaAEditar?.motas ?? 0,
      dispositivos: parcelaAEditar?.dispositivos ?? []
    };

    onGuardar(nuevaParcela);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="flex w-full max-w-5xl overflow-hidden rounded-3xl bg-card shadow-2xl flex-col md:flex-row h-[85vh] md:h-[600px]"
          >
            {/* ... Todo el HTML/JSX del formulario se mantiene igual ... */}
            <div className="flex w-full flex-col justify-between border-r border-border p-8 md:w-1/3 overflow-y-auto">
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-card-foreground">{parcelaAEditar ? 'Editar Parcela' : 'Nueva Parcela'}</h2>
                  <button onClick={onClose} className="rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-muted md:hidden">
                    <X size={20} />
                  </button>
                </div>
                
                <form id="parcela-form" onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-card-foreground">Nombre de la Parcela</label>
                    <input 
                      type="text" required placeholder="Ej. Parcela Olivos A"
                      value={nombre} onChange={e => setNombre(e.target.value)}
                      className="mt-2 block w-full rounded-xl border-input bg-background px-4 py-3 text-card-foreground focus:border-primary focus:outline-none" 
                    />
                  </div>
                  
                  <div className="relative" ref={dropdownRef}>
                    <label className="block text-sm font-medium text-card-foreground">Tipo de Cultivo</label>
                    <div className="relative mt-2">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <input 
                        type="text" required placeholder="Buscar cultivo..."
                        value={cultivo} 
                        onChange={e => {
                          setCultivo(e.target.value);
                          setIsCultivoOpen(true);
                        }}
                        onFocus={() => setIsCultivoOpen(true)}
                        className="block w-full rounded-xl border-input bg-background pl-10 pr-10 py-3 text-card-foreground focus:border-primary focus:outline-none" 
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isCultivoOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {isCultivoOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.1 }}
                          className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border-border bg-popover shadow-xl"
                        >
                          {cultivosFiltrados.length > 0 ? (
                            <ul className="py-1">
                              {cultivosFiltrados.map((c) => (
                                <li key={c}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCultivo(c);
                                      setIsCultivoOpen(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-popover-foreground hover:bg-primary/10 hover:text-primary flex items-center justify-between group"
                                  >
                                    <span>{c}</span>
                                    {cultivo === c && <CheckCircle size={16} className="text-primary" />}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                              No se encontraron resultados.
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Selector de Tipo de Suelo */}
                  <div className="relative" ref={dropdownSueloRef}>
                    <label className="block text-sm font-medium text-card-foreground">Tipo de Suelo</label>
                    <div className="relative mt-2">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Search className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <input 
                        type="text" required placeholder="Buscar tipo de suelo..."
                        value={tipoSuelo} 
                        onChange={e => {
                          setTipoSuelo(e.target.value);
                          setIsSueloOpen(true);
                        }}
                        onFocus={() => setIsSueloOpen(true)}
                        className="block w-full rounded-xl border-input bg-background pl-10 pr-10 py-3 text-card-foreground focus:border-primary focus:outline-none" 
                      />
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isSueloOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    <AnimatePresence>
                      {isSueloOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.1 }}
                          className="absolute z-50 mt-2 max-h-60 w-full overflow-auto rounded-xl border-border bg-popover shadow-xl"
                        >
                          {suelosFiltrados.length > 0 ? (
                            <ul className="py-1">
                              {suelosFiltrados.map((s) => (
                                <li key={s}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setTipoSuelo(s);
                                      setIsSueloOpen(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-popover-foreground hover:bg-primary/10 hover:text-primary flex items-center justify-between group"
                                  >
                                    <span>{s}</span>
                                    {tipoSuelo === s && <CheckCircle size={16} className="text-primary" />}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                              No se encontraron resultados.
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="rounded-xl bg-blue-500/10 p-4 border border-blue-500/20">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2 mb-1">
                      <Map size={16} /> Instrucciones
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Haz clic en el mapa para marcar las esquinas.
                    </p>
                  </div>
                </form>
              </div>

              <div className="mt-8 flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 rounded-xl border-border px-4 py-3 text-sm font-bold text-card-foreground hover:bg-muted">
                  Cancelar
                </button>
                <button type="submit" form="parcela-form" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/30">
                  <Check size={18}/> Guardar
                </button>
              </div>
            </div>

            <div className="relative w-full md:w-2/3 h-64 md:h-full bg-muted/30">
              <div className="absolute bottom-6 left-0 right-0 z-[400] flex justify-center pointer-events-none">
                 <button 
                  onClick={deshacerUltimoPunto}
                  disabled={puntos.length === 0}
                  className={`pointer-events-auto flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-lg transition-all ${
                    puntos.length === 0 
                    ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                    : 'bg-card text-card-foreground hover:bg-muted'
                  }`}
                >
                  <Undo2 size={18} /> Deshacer
                </button>
              </div>
              <div ref={mapContainerRef} className="h-full w-full z-0" />
            </div>
            
            <button onClick={onClose} className="absolute right-4 top-4 z-[400] hidden rounded-full bg-card/80 p-2 text-card-foreground shadow-md backdrop-blur-md hover:bg-card md:block">
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
