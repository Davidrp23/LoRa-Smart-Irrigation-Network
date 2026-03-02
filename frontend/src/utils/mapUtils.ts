import L from 'leaflet';

export interface Dispositivo {
  id: number;
  tipo: 'router' | 'mota';
  coordenadas: [number, number];
  estado: 'online' | 'offline' | 'low-battery';
  nombre?: string;
  modelo?: string;
  bateria?: number;
  ssid?: string;
  fechaUltimaConexion?: string;
  routerId?: number;
  esPublico?: boolean;
  // Datos técnicos de conexión
  rssi?: number;
  snr?: number;
  paquetesEnviados?: number;
  paquetesRecibidos?: number;
  erroresTx?: number;
  erroresRx?: number;
  erroresCrc?: number;
}

export interface Parcela {
  id: number;
  nombre: string;
  cultivo: string;
  humedad: number;
  proximoRiego: string;
  estado: string;
  motas: number;
  dispositivos?: Dispositivo[];
  coordenadas: [number, number][];
}

export interface ParcelMapOptions {
  onClick?: (parcel: Parcela) => void;
  getPopupContent?: (parcel: Parcela) => string | HTMLElement | null;
}

export interface ParcelMapManager {
  updateVisibility: () => void;
  cleanup: () => void;
  getBounds: () => L.LatLngBounds;
}

export const initParcelMap = (map: L.Map, parcelas: Parcela[], options?: ParcelMapOptions): ParcelMapManager => {
  const labelsGroup = L.layerGroup().addTo(map);
  const verticesGroup = L.layerGroup().addTo(map);
  const unifiedPointsGroup = L.layerGroup().addTo(map);
  const polygonsGroup = L.layerGroup().addTo(map);
  const devicesGroup = L.layerGroup().addTo(map);
  const connectionsGroup = L.layerGroup().addTo(map);

  // Inyectar estilos para animaciones de marcadores si no existen
  if (!document.getElementById('device-map-styles')) {
    const style = document.createElement('style');
    style.id = 'device-map-styles';
    style.innerHTML = `
      @keyframes pulse-ring {
        0% { transform: scale(0.5); opacity: 0.8; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      .device-marker-container {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .device-ring {
        position: absolute;
        border-radius: 50%;
        height: 100%;
        width: 100%;
        animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        z-index: 0;
      }
      .device-dot {
        position: relative;
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(0,0,0,0.4);
        z-index: 1;
      }
    `;
    document.head.appendChild(style);
  }

  // Mapa auxiliar para buscar coordenadas de routers por ID
  const routerPositions = new Map<number, [number, number]>();
  parcelas.forEach(p => {
    p.dispositivos?.forEach(d => {
      if (d.tipo === 'router') {
        routerPositions.set(d.id, d.coordenadas);
      }
    });
  });

  const layers = parcelas.map(p => {
    const color = p.estado === 'alerta' ? '#ef4444' : '#22c55e';
    const fillColor = p.estado === 'alerta' ? '#f87171' : '#4ade80';

    const poly = L.polygon(p.coordenadas, {
      color: color, fillColor: fillColor, fillOpacity: 0.3, weight: 3
    }).addTo(polygonsGroup);

    const defaultPopupContent = `
      <div style="font-family: sans-serif;">
        <b style="font-size: 16px;">${p.nombre}</b><br>
        <span style="color: #64748b; font-size: 12px;">${p.cultivo}</span><br><br>
        Humedad Media: <b>${p.humedad}%</b>
      </div>
    `;

    if (options?.getPopupContent) {
      const content = options.getPopupContent(p);
      if (content) poly.bindPopup(content);
    } else {
      poly.bindPopup(defaultPopupContent);
    }

    if (options?.onClick) {
      poly.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        options.onClick!(p);
      });
    }

    const center = poly.getBounds().getCenter();

    const textIcon = L.divIcon({
      className: 'bg-transparent border-none shadow-none',
      html: `
        <div style="transform: translate(-50%, -50%); display: flex; justify-content: center; align-items: center;">
          <div class="px-3 py-1 rounded-full bg-slate-900/75 backdrop-blur-sm border border-white/20 shadow-lg">
            <span class="text-white text-xs font-semibold whitespace-nowrap">${p.nombre}</span>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    const label = L.marker(center, { icon: textIcon, interactive: false });

    const vertices = L.layerGroup();
    p.coordenadas.forEach(coord => {
      L.circleMarker(coord, { radius: 4, color: '#fff', weight: 1, fillColor: color, fillOpacity: 0.8 }).addTo(vertices);
    });

    const unifiedPoint = L.circleMarker(center, { radius: 8, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1 });

    if (options?.onClick) {
      unifiedPoint.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        options.onClick!(p);
      });
    }

    // Renderizar dispositivos si existen
    if (p.dispositivos) {
      p.dispositivos.forEach(d => {
        const isRouter = d.tipo === 'router';
        // Router: Violeta/Indigo, Mota: Cian/Azul Claro
        const devColor = isRouter ? '#8b5cf6' : '#06b6d4';
        const ringColor = isRouter ? 'rgba(139, 92, 246, 0.6)' : 'rgba(6, 182, 212, 0.6)';
        const size = isRouter ? 24 : 18; // Aumentado el tamaño para mejor visibilidad

        // Marcador personalizado con animación CSS
        const icon = L.divIcon({
          className: 'bg-transparent',
          html: `
            <div class="device-marker-container" style="width: ${size}px; height: ${size}px;">
              <div class="device-ring" style="background-color: ${ringColor};"></div>
              <div class="device-dot" style="background-color: ${devColor}; width: ${size * 0.6}px; height: ${size * 0.6}px; border: 2px solid white;"></div>
            </div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2]
        });
        
        // zIndexOffset alto para que aparezca encima de las etiquetas de parcela
        const marker = L.marker(d.coordenadas, { icon, zIndexOffset: 1000 }).addTo(devicesGroup);

        // Generar HTML de detalles técnicos según el tipo
        let technicalDetailsHtml = '';
        if (isRouter) {
          technicalDetailsHtml = `
            <div class="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-3">
              <div class="bg-slate-50 p-1.5 rounded border border-slate-100">
                <div class="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Enviados</div>
                <div class="font-mono font-bold text-slate-700">${d.paquetesEnviados ?? 0}</div>
              </div>
              <div class="bg-slate-50 p-1.5 rounded border border-slate-100">
                <div class="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Recibidos</div>
                <div class="font-mono font-bold text-slate-700">${d.paquetesRecibidos ?? 0}</div>
              </div>
              <div class="bg-red-50 p-1.5 rounded border border-red-100">
                <div class="text-red-400 font-semibold uppercase tracking-wider text-[10px]">Err. TX/RX</div>
                <div class="font-mono font-bold text-red-700">${d.erroresTx ?? 0} / ${d.erroresRx ?? 0}</div>
              </div>
              <div class="bg-orange-50 p-1.5 rounded border border-orange-100">
                <div class="text-orange-400 font-semibold uppercase tracking-wider text-[10px]">Err. CRC</div>
                <div class="font-mono font-bold text-orange-700">${d.erroresCrc ?? 0}</div>
              </div>
            </div>
          `;
        } else {
          const rssiVal = d.rssi ?? -120;
          const rssiColor = rssiVal > -100 ? 'text-green-600' : rssiVal > -115 ? 'text-yellow-600' : 'text-red-600';
          const rssiBg = rssiVal > -100 ? 'bg-green-500' : rssiVal > -115 ? 'bg-yellow-500' : 'bg-red-500';
          const signalPercent = Math.min(100, Math.max(0, (rssiVal + 120) * 2)); // -120dbm = 0%, -70dbm = 100%

          technicalDetailsHtml = `
            <div class="mt-3 space-y-2">
              <div class="bg-slate-50 p-2 rounded border border-slate-100">
                <div class="flex justify-between items-center mb-1 text-xs">
                   <span class="text-slate-500 font-bold uppercase">Señal (RSSI)</span>
                   <span class="font-mono font-bold ${rssiColor}">${d.rssi ?? 'N/A'} dBm</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div class="${rssiBg} h-1.5 rounded-full transition-all duration-500" style="width: ${signalPercent}%"></div>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="bg-slate-50 p-1.5 rounded border border-slate-100">
                  <div class="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">SNR</div>
                  <div class="font-mono font-bold text-slate-700">${d.snr ?? 'N/A'} dB</div>
                </div>
                <div class="bg-slate-50 p-1.5 rounded border border-slate-100">
                  <div class="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Pérdidas</div>
                  <div class="font-mono font-bold text-slate-700">${d.erroresRx ?? 0}</div>
                </div>
              </div>
            </div>
          `;
        }

        // Popup con información detallada
        const popupContent = `
          <div class="font-sans p-1 min-w-[240px]">
            <div class="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <div class="w-2.5 h-2.5 rounded-full ${d.estado === 'online' ? 'bg-green-500' : d.estado === 'low-battery' ? 'bg-yellow-500' : 'bg-red-500'}"></div>
              <span class="font-bold text-base text-slate-800">${isRouter ? 'Router LoRaWAN' : 'Sensor Node'}</span>
            </div>
            <div class="space-y-2 text-sm text-slate-600">
              ${d.nombre ? `<div class="flex justify-between"><span>Nombre:</span> <span class="font-semibold text-slate-800">${d.nombre}</span></div>` : ''}
              <div class="flex justify-between"><span>ID:</span> <span class="font-mono text-slate-500">#${d.id}</span></div>
              <div class="flex justify-between"><span>Modelo:</span> <span class="font-semibold text-slate-800">${d.modelo || 'N/A'}</span></div>
              ${d.ssid ? `<div class="flex justify-between"><span>SSID:</span> <span class="font-semibold text-slate-800">${d.ssid}</span></div>` : ''}
              ${isRouter ? `<div class="flex justify-between items-center"><span>Red:</span> <span class="font-bold text-xs px-2 py-0.5 rounded-full ${d.esPublico ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}">${d.esPublico ? 'Pública' : 'Privada'}</span></div>` : ''}
              <div class="flex justify-between"><span>Batería:</span> <span class="font-bold ${d.bateria && d.bateria < 20 ? 'text-red-600' : 'text-green-600'}">${d.bateria}%</span></div>
              <div class="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-400 text-right">Últ. conexión: ${d.fechaUltimaConexion || 'N/A'}</div>
            </div>
            
            <details class="mt-3 pt-2 border-t border-slate-100 group">
              <summary class="cursor-pointer text-sm font-bold text-blue-600 hover:text-blue-700 select-none flex items-center gap-1 outline-none">
                <span class="group-open:hidden">Ver detalles de conexión</span>
                <span class="hidden group-open:inline">Ocultar detalles</span>
              </summary>
              ${technicalDetailsHtml}
            </details>
          </div>
        `;
        marker.bindPopup(popupContent);

        // Dibujar línea de conexión si es una mota y tiene router asignado
        if (!isRouter && d.routerId) {
          const routerPos = routerPositions.get(d.routerId);
          if (routerPos) {
            L.polyline([d.coordenadas, routerPos], {
              color: '#64748b', weight: 2.5, dashArray: '6, 8', opacity: 0.8
            }).addTo(connectionsGroup);
          }
        }
      });
    }

    return { poly, label, vertices, unifiedPoint };
  });

  const updateVisibility = () => {
    const zoom = map.getZoom();
    const zoomThreshold = 14;

    // Lógica de escalado para dispositivos:
    // Se hacen más pequeños al alejar y desaparecen si el zoom es bajo (<15)
    if (zoom < 15) {
      if (map.hasLayer(devicesGroup)) map.removeLayer(devicesGroup);
      if (map.hasLayer(connectionsGroup)) map.removeLayer(connectionsGroup);
    } else {
      if (!map.hasLayer(devicesGroup)) map.addLayer(devicesGroup);
      if (!map.hasLayer(connectionsGroup)) map.addLayer(connectionsGroup);
    }

    layers.forEach(({ poly, label, vertices, unifiedPoint }) => {
      const bounds = poly.getBounds();
      const ne = map.latLngToContainerPoint(bounds.getNorthEast());
      const sw = map.latLngToContainerPoint(bounds.getSouthWest());
      const width = Math.abs(ne.x - sw.x);
      const height = Math.abs(ne.y - sw.y);
      
      // Mostrar etiqueta solo si el polígono es lo suficientemente grande (ej. 80x30 px)
      const isBigEnough = width > 80 && height > 30;

      if (zoom >= zoomThreshold) {
        // Zoom alto: Ver polígono, vértices y etiqueta (si cabe). Ocultar punto unificado.
        if (!verticesGroup.hasLayer(vertices)) verticesGroup.addLayer(vertices);
        if (unifiedPointsGroup.hasLayer(unifiedPoint)) unifiedPointsGroup.removeLayer(unifiedPoint);
        
        if (isBigEnough) {
          if (!labelsGroup.hasLayer(label)) labelsGroup.addLayer(label);
        } else {
          if (labelsGroup.hasLayer(label)) labelsGroup.removeLayer(label);
        }
      } else {
        // Zoom bajo: Ocultar vértices y etiqueta. Mostrar punto unificado.
        if (verticesGroup.hasLayer(vertices)) verticesGroup.removeLayer(vertices);
        if (!unifiedPointsGroup.hasLayer(unifiedPoint)) unifiedPointsGroup.addLayer(unifiedPoint);
        if (labelsGroup.hasLayer(label)) labelsGroup.removeLayer(label);
      }
    });
  };

  const cleanup = () => {
    labelsGroup.remove();
    verticesGroup.remove();
    unifiedPointsGroup.remove();
    polygonsGroup.remove();
    devicesGroup.remove();
    connectionsGroup.remove();
  };

  const getBounds = () => {
      if (layers.length === 0) return L.latLngBounds([]);
      const group = L.featureGroup(layers.map(l => l.poly));
      return group.getBounds();
  }

  return { updateVisibility, cleanup, getBounds };
};
