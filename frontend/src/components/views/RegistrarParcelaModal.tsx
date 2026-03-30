import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Map, Undo2, Check, ChevronDown, Ruler, Droplets, Sprout, CheckCircle, ArrowRight, AlertCircle, Info, Calculator } from 'lucide-react';
import { initParcelMap, type Parcela, type ParcelMapManager } from '../../utils/mapUtils';
import { useTheme } from '../../context/ThemeContext';
import { getTiposCultivo, getTiposSuelo, getTiposRiego } from '../../services/dataService';

interface RegistrarParcelaModalProps {
  isOpen: boolean;
  onClose: () => void;
  parcelasExistentes: Parcela[];
  parcelaAEditar?: Parcela | null;
  onGuardar: (parcela: Parcela) => void;
}

// Función auxiliar para calcular área en m2 de coordenadas lat/lng (Aprox para parcelas pequeñas)
const calcularAreaPoligono = (coords: [number, number][]) => {
  if (coords.length < 3) return 0;
  
  // Proyección simple a metros (Mercator esférica local)
  // Radio Tierra = 6378137m
  const R = 6378137;
  let area = 0;

  for (let i = 0; i < coords.length; i++) {
    const [lat1, lon1] = coords[i];
    const [lat2, lon2] = coords[(i + 1) % coords.length];
    // Conversión a radianes
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const dLambda = (lon2 - lon1) * Math.PI / 180;
    area += (dLambda * (Math.sin(phi1) + Math.sin(phi2))) / 2;
  }
  return Math.abs(area * R * R);
};

// Componente de Select con búsqueda
const SearchableSelect = ({ label, value, onChange, options, placeholder }: { label: string, value: string, onChange: (val: string) => void, options: { value: string, label: string }[], placeholder: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || '';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flora-input text-left w-full flex justify-between items-center"
        >
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>{selectedLabel || placeholder}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border-border bg-popover shadow-xl"
          >
            <div className="p-2 border-b border-border">
              <input type="text" placeholder="Buscar..." className="flora-input w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} autoFocus />
            </div>
            <ul className="py-1 max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                <li key={opt.value}><button type="button" onClick={() => { onChange(opt.value); setIsOpen(false); setSearchTerm(''); }} className="w-full px-4 py-2.5 text-left text-sm text-popover-foreground hover:bg-primary/10 hover:text-primary flex items-center justify-between group"><span>{opt.label}</span>{value === opt.value && <CheckCircle size={16} className="text-primary" />}</button></li>
              )) : <div className="px-4 py-3 text-sm text-muted-foreground text-center">No se encontraron resultados.</div>}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function RegistrarParcelaModal({ isOpen, onClose, parcelasExistentes, parcelaAEditar, onGuardar }: RegistrarParcelaModalProps) {
  // Inicializar estado directamente con props para evitar renderizados vacíos iniciales
  const { theme } = useTheme();

  // Estado del Formulario
  const [nombre, setNombre] = useState(parcelaAEditar?.nombre || ''); 
  // IDs de relaciones (ahora usamos IDs en lugar de strings libres)
  const [cultivoId, setCultivoId] = useState(parcelaAEditar?.cultivoId?.toString() || '');
  const [sueloId, setSueloId] = useState(parcelaAEditar?.sueloId?.toString() || '');
  const [riegoId, setRiegoId] = useState(parcelaAEditar?.riegoId?.toString() || '');
  
  // Datos numéricos
  const [areaInput, setAreaInput] = useState(parcelaAEditar?.areaM2 ? (parcelaAEditar.areaM2 / 10000).toFixed(2) : '0'); // Mostramos Ha
  const [caudal, setCaudal] = useState(parcelaAEditar?.caudalRiegoLh?.toString() || '0');
  const [areaManual, setAreaManual] = useState(!!parcelaAEditar?.areaM2); // Si ya tenía área, asumimos que puede ser manual o calculada, por defecto dejamos editar
  const [zonaHoraria, setZonaHoraria] = useState(parcelaAEditar?.zonaHoraria || Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [laminaMaximaRiego, setLaminaMaximaRiego] = useState((parcelaAEditar as any)?.laminaMaximaRiego?.toString() || '');
  const [tiempoRiego, setTiempoRiego] = useState('');
  const [usarCalculadoraLamina, setUsarCalculadoraLamina] = useState(false);

  const [puntos, setPuntos] = useState<[number, number][]>(parcelaAEditar?.coordenadas || []);
  
  // Errores de validación
  const [errors, setErrors] = useState<{ [key: string]: boolean }>({});

  // Obtener zonas horarias disponibles nativamente (con fallback si el navegador es muy antiguo)
  const timeZones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone').map(tz => ({ value: tz, label: tz }));
    } catch (e) {
      return [
        { value: Intl.DateTimeFormat().resolvedOptions().timeZone, label: Intl.DateTimeFormat().resolvedOptions().timeZone },
        { value: 'Europe/Madrid', label: 'Europe/Madrid' }, 
        { value: 'UTC', label: 'UTC' }
      ];
    }
  }, []);

  // Validaciones Memoizadas
  const isGeneralValid = useMemo(() => nombre.trim() !== '' && puntos.length >= 3 && zonaHoraria.trim() !== '', [nombre, puntos, zonaHoraria]);

  const validateGeneral = () => {
    const newErrors: any = {};
    if (!nombre.trim()) newErrors.nombre = true;
    if (!zonaHoraria.trim()) newErrors.zonaHoraria = true;
    if (puntos.length < 3) newErrors.puntos = true;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Estado de Catálogos
  const [listaCultivos, setListaCultivos] = useState<any[]>([]);
  const [listaSuelos, setListaSuelos] = useState<any[]>([]);
  const [listaRiegos, setListaRiegos] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'agronomia'>('general');
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const pointsLayerRef = useRef<L.FeatureGroup | null>(null); 
  const labelMarkerRef = useRef<L.Marker | null>(null); 
  const unifiedMarkerRef = useRef<L.CircleMarker | null>(null); // Nuevo: punto central
  const parcelMapManagerRef = useRef<ParcelMapManager | null>(null);
  const isEditingRef = useRef(false);
  isEditingRef.current = !!parcelaAEditar;

  // Cargar Catálogos al iniciar
  useEffect(() => {
    if (isOpen) {
      getTiposCultivo().then(setListaCultivos).catch(console.error);
      getTiposSuelo().then(setListaSuelos).catch(console.error);
      getTiposRiego().then(setListaRiegos).catch(console.error);
    }
  }, [isOpen]);

  // Efecto para calcular el AREA automáticamente cuando cambian los puntos
  useEffect(() => {
    // Solo calculamos si hay un polígono cerrado (>= 3 puntos) Y el usuario no ha forzado un valor manual (o decide sobreescribirlo)
    // En este diseño UX, recalcularemos siempre visualmente pero permitiremos editar el campo final
    if (puntos.length >= 3 && !areaManual) {
      const areaM2 = calcularAreaPoligono(puntos);
      const areaHa = areaM2 / 10000;
      // Actualizamos el input con 4 decimales para precisión, usuario puede redondear
      setAreaInput(areaHa.toFixed(4));
    } else if (puntos.length < 3) {
      // Reset si borra puntos
      if (!areaManual) setAreaInput('0');
    }
  }, [puntos, areaManual]);

  useEffect(() => {
    if (!isOpen || !mapContainerRef.current) return;

    // Actualizar estado si cambia la parcela a editar mientras el modal está abierto
    if (parcelaAEditar) {
      setNombre(parcelaAEditar.nombre);
      setCultivoId(parcelaAEditar.cultivoId?.toString() || '');
      setSueloId(parcelaAEditar.sueloId?.toString() || '');
      setRiegoId(parcelaAEditar.riegoId?.toString() || '');
      setAreaInput(parcelaAEditar.areaM2 ? (parcelaAEditar.areaM2 / 10000).toFixed(4) : '0');
      setCaudal(parcelaAEditar.caudalRiegoLh?.toString() || '0');
      setPuntos(parcelaAEditar.coordenadas);
      setLaminaMaximaRiego((parcelaAEditar as any).laminaMaximaRiego?.toString() || '');
      setZonaHoraria(parcelaAEditar.zonaHoraria || Intl.DateTimeFormat().resolvedOptions().timeZone);
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
            map.setView(center, 16, { animate: true, duration: 1.5 });
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
      // Resetear el resto del formulario para evitar persistencia al reabrir
      setCultivoId('');
      setSueloId('');
      setRiegoId('');
      setAreaInput('0');
      setCaudal('0');
      setZonaHoraria(Intl.DateTimeFormat().resolvedOptions().timeZone);
      setAreaManual(false);
      setActiveTab('general');
      setErrors({});
    };
  }, [isOpen, parcelasExistentes, parcelaAEditar]);

  // Sincronizar etiqueta cuando el nombre cambie
  useEffect(() => {
    actualizarMapa(puntos);
  }, [nombre, puntos]);

  // Efecto para la calculadora de lámina en tiempo real
  useEffect(() => {
    if (usarCalculadoraLamina) {
      const c = parseFloat(caudal) || 0;
      const a = parseFloat(areaInput) * 10000 || 0;
      const t = parseFloat(tiempoRiego) || 0;

      // Solo calculamos si tenemos todos los datos positivos
      if (c > 0 && a > 0 && t > 0) {
        const lamina = (c * t) / a;
        setLaminaMaximaRiego(lamina.toFixed(2));
        setErrors(prev => ({...prev, lamina: false}));
      } else {
        // Si faltan datos dejamos el valor vacío obligando a que se den cuenta
        setLaminaMaximaRiego('');
      }
    }
  }, [caudal, areaInput, tiempoRiego, usarCalculadoraLamina]);

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

  // Manejador del botón "Siguiente"
  const handleNextStep = () => {
    if (validateGeneral()) {
      setActiveTab('agronomia');
    } else {
      // Feedback visual si falla
      const inputNombre = document.getElementById('input-nombre-parcela');
      if (inputNombre && !nombre.trim()) inputNombre.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación completa antes de guardar
    if (!validateGeneral()) {
      setActiveTab('general');
      const inputNombre = document.getElementById('input-nombre-parcela');
      if (inputNombre && !nombre.trim()) inputNombre.focus();
      return;
    }

    const newAgroErrors: any = {};
    if (!cultivoId) newAgroErrors.cultivo = true;
    if (!sueloId) newAgroErrors.suelo = true;
    if (!riegoId) newAgroErrors.riego = true;
    if (!caudal || parseFloat(caudal) <= 0) newAgroErrors.caudal = true;
    if (!laminaMaximaRiego || parseFloat(laminaMaximaRiego) <= 0) newAgroErrors.lamina = true;

    if (Object.keys(newAgroErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...newAgroErrors }));
      // Enfocar el primer error de agronomía si existe
      if (newAgroErrors.cultivo) (document.querySelector('#input-cultivo-principal button') as HTMLElement)?.focus();
      else if (newAgroErrors.suelo) (document.querySelector('#input-tipo-suelo button') as HTMLElement)?.focus();
      else if (newAgroErrors.riego) (document.querySelector('#input-metodo-riego button') as HTMLElement)?.focus();
      else if (newAgroErrors.caudal) (document.querySelector('#input-caudal-sistema') as HTMLElement)?.focus();
      else if (newAgroErrors.lamina) {
        const inputLamina = document.getElementById('input-lamina');
        if (inputLamina) inputLamina.focus();
      }
      return;
    }

    // Preparar objeto con IDs y conversión de area
    // Nota: El backend espera IDs numéricos, convertimos strings
    const cultivoObj = listaCultivos.find(c => c.id.toString() === cultivoId);
    const sueloObj = listaSuelos.find(s => s.id.toString() === sueloId);

    const nuevaParcela = {
      id: parcelaAEditar ? parcelaAEditar.id : Date.now(), // ID temporal si es nuevo
      nombre,
      cultivoId: cultivoId ? parseInt(cultivoId) : null,
      sueloId: sueloId ? parseInt(sueloId) : null,
      riegoId: riegoId ? parseInt(riegoId) : null,
      cultivo: cultivoObj?.nombre, // Fallback visual frontend
      tipoSuelo: sueloObj?.nombre, // Fallback visual frontend
      zonaHoraria,
      coordenadas: puntos,
      areaM2: parseFloat(areaInput) * 10000, // Convertir Ha a m2 para backend
      caudalRiegoLh: parseFloat(caudal),
      laminaMaximaRiego: parseFloat(laminaMaximaRiego),
      humedad: parcelaAEditar?.humedad ?? null,
      proximoRiego: parcelaAEditar?.proximoRiego ?? 'N/A',
      estado: parcelaAEditar?.estado ?? 'ok',
      motas: parcelaAEditar?.motas ?? 0,
      dispositivos: parcelaAEditar?.dispositivos ?? []
    } as unknown as Parcela;

    onGuardar(nuevaParcela);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 ${theme}`}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="flex w-full max-w-[95vw] overflow-hidden rounded-3xl bg-card shadow-2xl flex-col md:flex-row h-[90vh]"
          >
            {/* ... Todo el HTML/JSX del formulario se mantiene igual ... */}
            <div className="flex w-full flex-col border-r border-border md:w-[400px] overflow-hidden bg-card">
              
              {/* Header del Formulario */}
              <div className="p-6 border-b border-border bg-muted/20">
                 <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold text-card-foreground">{parcelaAEditar ? 'Editar Terreno' : 'Nuevo Terreno'}</h2>
                  <button onClick={onClose} className="rounded-full bg-secondary p-2 text-secondary-foreground hover:bg-muted md:hidden">
                    <X size={20} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Configura los datos agronómicos y dibuja el perímetro.</p>
                
                {/* Tabs de navegación interna */}
                <div className="flex p-1 mt-4 bg-muted rounded-lg">
                  <button 
                    onClick={() => setActiveTab('general')}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'general' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Map size={14}/> General
                  </button>
                  <button 
                    disabled // Deshabilitado el click directo, forzamos usar "Siguiente"
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'agronomia' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground/50 cursor-not-allowed'}`}
                  >
                    <Sprout size={14}/> Agronomía
                  </button>
                </div>
              </div>

              {/* Contenido Scrollable */}
              <div className="flex-1 overflow-y-auto p-6">
                <form id="parcela-form" className="space-y-5">
                  
                  {activeTab === 'general' && (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                      <div>
                        <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${errors.nombre ? 'text-destructive' : 'text-muted-foreground'}`}>Nombre Identificativo</label>
                        <input 
                          id="input-nombre-parcela"
                          type="text" required placeholder="Ej. Sector Olivos Norte"
                          value={nombre} onChange={e => { setNombre(e.target.value); if(errors.nombre) setErrors({...errors, nombre: false}); }}
                          className={`flora-input ${errors.nombre ? 'border-destructive ring-destructive/20' : ''}`}
                        />
                      </div>
                      
                      <div id="input-zona-horaria" className={errors.zonaHoraria ? 'rounded-xl border border-destructive/50 p-1' : ''}>
                        <SearchableSelect
                          label="Zona Horaria"
                          placeholder="Seleccionar Zona Horaria"
                          value={zonaHoraria}
                          onChange={(v) => { setZonaHoraria(v); if(errors.zonaHoraria) setErrors({...errors, zonaHoraria: false}); }}
                          options={timeZones}
                        />
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <label className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-2">
                          <span className="flex items-center gap-2"><Ruler size={14}/> Área Calculada</span>
                          <span className="text-[10px] bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded text-blue-800 dark:text-blue-200">Hectáreas</span>
                        </label>
                        <div className="relative">
                          <input 
                            type="number" step="0.0001" min="0" required
                            value={areaInput}
                            onChange={e => { setAreaInput(e.target.value); setAreaManual(true); }}
                            className="flora-input text-right font-mono text-lg font-bold pr-12"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">Ha</span>
                        </div>
                        <p className="text-[10px] text-blue-600/70 dark:text-blue-400/60 mt-2 leading-tight">
                          Calculado automáticamente al dibujar. Puedes ajustar el valor si conoces el área exacta de las escrituras.
                        </p>
                      </div>
                      
                      <div className={`instruction-box transition-colors ${errors.puntos ? 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30' : ''}`}>
                        <p className={`text-sm font-bold flex items-center gap-2 mb-1 ${errors.puntos ? 'text-red-700 dark:text-red-400' : 'text-blue-800 dark:text-blue-300'}`}>
                          {errors.puntos ? <AlertCircle size={16}/> : <Map size={16} />} 
                          {errors.puntos ? 'Polígono Requerido' : 'Dibujar Perímetro'}
                        </p>
                        <p className={`text-xs font-medium opacity-80 ${errors.puntos ? 'text-red-600 dark:text-red-300' : 'text-blue-700 dark:text-blue-400'}`}>
                          Haz clic en el mapa satelital para marcar las esquinas de la parcela. Necesitas al menos 3 puntos.
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'agronomia' && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                      <div id="input-cultivo-principal" className={errors.cultivo ? 'rounded-xl border border-destructive/50 p-1' : ''}>
                        <SearchableSelect
                          label="Cultivo Principal"
                          placeholder="Seleccionar Cultivo"
                          value={cultivoId}
                          onChange={(v) => { setCultivoId(v); if(errors.cultivo) setErrors({...errors, cultivo: false}); }}
                          options={listaCultivos.map(c => ({ value: c.id.toString(), label: c.nombre }))}
                        />
                      </div>
                      
                      <div id="input-tipo-suelo" className={errors.suelo ? 'rounded-xl border border-destructive/50 p-1' : ''}>
                        <SearchableSelect
                          label="Tipo de Suelo"
                          placeholder="Seleccionar Suelo"
                          value={sueloId}
                          onChange={(v) => { 
                            setSueloId(v); 
                            if(errors.suelo) setErrors({...errors, suelo: false});
                            
                            // Si no estamos usando la calculadora y seleccionamos un suelo, auto-asignamos la lámina
                            if (!usarCalculadoraLamina) {
                              const sueloObj = listaSuelos.find(s => s.id.toString() === v);
                              if (sueloObj && sueloObj.laminaMaximaRiego) {
                                setLaminaMaximaRiego(sueloObj.laminaMaximaRiego.toString());
                                if(errors.lamina) setErrors({...errors, lamina: false});
                              }
                            }
                          }}
                          options={listaSuelos.map(s => ({ value: s.id.toString(), label: s.nombre }))}
                        />
                      </div>

                      <div className="pt-4 border-t border-border mt-4">
                        <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2"><Droplets size={16} className="text-blue-500"/> Sistema de Riego</h4>
                        
                        <div className="space-y-4">
                          <div id="input-metodo-riego" className={errors.riego ? 'rounded-xl border border-destructive/50 p-1' : ''}>
                            <SearchableSelect
                              label="Método de Riego"
                              placeholder="Seleccionar Método"
                              value={riegoId}
                              onChange={(v) => { setRiegoId(v); if(errors.riego) setErrors({...errors, riego: false}); }}
                              options={listaRiegos.map(r => ({ value: r.id.toString(), label: r.nombre }))}
                            />
                          </div>
                          
                          <div>
                            <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${errors.caudal ? 'text-destructive' : 'text-muted-foreground'}`}>Caudal del Sistema</label>
                            
                            {/* Diseño de Caudal Mejorado */}
                            <div className={`flex items-center h-16 px-4 rounded-xl border bg-card transition-colors ${errors.caudal ? 'border-destructive ring-1 ring-destructive' : 'border-border'}`}>
                               <input 
                                id="input-caudal-sistema"
                                type="number" 
                                value={caudal}
                                onChange={(e) => { setCaudal(e.target.value); if(errors.caudal) setErrors({...errors, caudal: false}); }}
                                className="w-full h-full p-0 text-3xl font-bold tracking-tight text-right bg-transparent border-none appearance-none focus:ring-0 text-foreground placeholder:text-muted-foreground/30"
                                placeholder="0"
                              />
                              <span className="ml-3 text-sm font-bold text-muted-foreground">L/h</span>
                            </div>

                            <div className="px-1 mt-3">
                              <input 
                                type="range" 
                                min="0" 
                                max="100000" 
                                step="1000" 
                                value={caudal} 
                                onChange={(e) => { setCaudal(e.target.value); if(errors.caudal) setErrors({...errors, caudal: false}); }} 
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-muted"
                                style={{
                                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(parseInt(caudal) || 0) / 1000}%, ${theme === 'dark' ? '#334155' : '#e2e8f0'} ${(parseInt(caudal) || 0) / 1000}%, ${theme === 'dark' ? '#334155' : '#e2e8f0'} 100%)`
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-border mt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-2"><Droplets size={16} className="text-blue-500"/> Dosis Máxima (Lámina)</h4>
                          <button
                            type="button"
                            onClick={() => setUsarCalculadoraLamina(!usarCalculadoraLamina)}
                            className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${usarCalculadoraLamina ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-foreground hover:text-background'}`}
                          >
                            <Calculator size={14} /> Calcular por tiempo
                          </button>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/10 p-3.5 rounded-xl border border-blue-100 dark:border-blue-800/30 mb-4">
                          <p className="text-xs text-blue-800 dark:text-blue-300 flex gap-2 items-start leading-relaxed">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <span>La <strong>lámina máxima de riego (mm)</strong> es la cantidad de agua que tu suelo puede absorber por m² sin encharcarse. Si no la conoces, usa el valor por defecto del suelo o calcúlala mediante tu tiempo habitual.</span>
                          </p>
                        </div>

                        <div className={errors.lamina ? 'rounded-xl border border-destructive/50 p-1' : ''}>
                          {usarCalculadoraLamina ? (
                            <div className="space-y-3 p-4 border border-border rounded-xl bg-muted/20">
                              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Tiempo habitual de riego</label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="number" step="0.5" min="0" placeholder="Ej. 2.5"
                                  value={tiempoRiego}
                                  onChange={(e) => setTiempoRiego(e.target.value)}
                                  className="flora-input w-full font-bold"
                                />
                                <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">Horas</span>
                              </div>
                              {(!parseFloat(caudal) || parseFloat(caudal) <= 0 || !parseFloat(areaInput) || parseFloat(areaInput) <= 0) ? (
                                <p className="text-xs text-destructive mt-2 flex gap-1 items-center"><AlertCircle size={14}/> Faltan datos de área o caudal para calcular.</p>
                              ) : (
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
                                  <span className="text-xs font-bold text-muted-foreground">Lámina Resultante:</span>
                                  <span className="text-lg font-bold text-foreground">{laminaMaximaRiego || '0'} <span className="text-sm text-muted-foreground">mm</span></span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="relative">
                              <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${errors.lamina ? 'text-destructive' : 'text-muted-foreground'}`}>Lámina Manual</label>
                              <input id="input-lamina" type="number" step="0.1" min="0" value={laminaMaximaRiego} onChange={(e) => { setLaminaMaximaRiego(e.target.value); if(errors.lamina) setErrors({...errors, lamina: false}); }} className={`flora-input pr-12 w-full font-bold text-lg ${errors.lamina ? 'border-destructive ring-destructive/20' : ''}`} placeholder="Ej. 22" />
                              <span className="absolute right-4 bottom-3 text-sm font-bold text-muted-foreground">mm</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </form>
              </div>

              <div className="p-6 border-t border-border bg-muted/20 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => activeTab === 'agronomia' ? setActiveTab('general') : onClose()} 
                  className="flex-1 rounded-xl border-border px-4 py-3 text-sm font-bold text-card-foreground hover:bg-muted transition-colors"
                >
                  {activeTab === 'agronomia' ? 'Atrás' : 'Cancelar'}
                </button>
                
                {activeTab === 'general' ? (
                  <button 
                    type="button" 
                    onClick={handleNextStep} 
                    disabled={!isGeneralValid}
                    className={`group relative flex-[1.5] flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold shadow-lg transition-all duration-300 overflow-hidden ${
                      isGeneralValid 
                        ? 'bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90' 
                        : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                  >
                    <span>Siguiente</span>
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: isGeneralValid ? 0 : -20, opacity: isGeneralValid ? 1 : 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }}>
                      <ArrowRight size={16} />
                    </motion.div>
                  </button>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleSubmit}
                    className="flex-[1.5] flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 shadow-md shadow-green-600/20 transition-all"
                  >
                    <Check size={18}/> Guardar
                  </button>
                )}
              </div>
            </div>

            {/* MAPA (Lado Derecho) */}
            <div className="relative flex-1 h-64 md:h-full bg-muted/30">
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
    </AnimatePresence>,
    document.body
  );
}
