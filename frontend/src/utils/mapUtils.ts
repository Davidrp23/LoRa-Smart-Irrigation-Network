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
  humedad?: number;
  canal?: number; // 0-3
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
  tipoSuelo?: string;
  humedad: number | null;
  proximoRiego: string;
  estado: string;
  motas: number;
  dispositivos?: Dispositivo[];
  coordenadas: [number, number][];
  areaM2?: number;
  caudalRiegoLh?: number;
  cultivoId?: number | null;
  sueloId?: number | null;
  riegoId?: number | null;
  tipoRiego?: string;
  zonaHoraria?: string;
}

export interface ParcelMapOptions {
  onClick?: (parcel: Parcela, latlng: L.LatLng) => void;
  getPopupContent?: (parcel: Parcela) => string | HTMLElement | null;
  onDeviceHistoryClick?: (device: Dispositivo) => void;
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
    const color = p.estado === 'alert' ? '#ef4444' : '#22c55e';
    const fillColor = p.estado === 'alert' ? '#f87171' : '#4ade80';

    const poly = L.polygon(p.coordenadas, {
      color: color, fillColor: fillColor, fillOpacity: 0.3, weight: 3
    }).addTo(polygonsGroup);

    const defaultPopupContent = `
      <div class="map-popup-container">
        <div class="map-popup-header">
           <div>
             <div class="map-popup-title">${p.nombre}</div>
             <div class="map-popup-subtitle">${p.cultivo}</div>
           </div>
           <div class="map-popup-badge ${p.estado === 'alert' ? 'alert' : 'ok'}">
             ${p.estado === 'alert' ? 'ALERTA' : 'OK'}
           </div>
        </div>
        <div class="map-popup-body">
           <div class="map-popup-row">
             <span class="map-popup-label">Humedad Media</span>
             <span class="map-popup-value text-base">${p.humedad}%</span>
           </div>
        </div>
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
        options.onClick!(p, e.latlng);
      });
    }

    const center = poly.getBounds().getCenter();

    const textIcon = L.divIcon({
      className: 'bg-transparent border-none shadow-none',
      html: `
        <div class="map-floating-label">
            <span>${p.nombre}</span>
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
        options.onClick!(p, e.latlng);
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
              <div class="device-dot" style="background-color: ${devColor}; width: ${size * 0.6}px; height: ${size * 0.6}px;"></div>
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
            <div class="map-tech-grid">
              <div class="map-tech-box">
                <div class="map-tech-label">Enviados</div>
                <div class="map-tech-value">${d.paquetesEnviados ?? 0}</div>
              </div>
              <div class="map-tech-box">
                <div class="map-tech-label">Recibidos</div>
                <div class="map-tech-value">${d.paquetesRecibidos ?? 0}</div>
              </div>
              <div class="map-tech-box border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/50">
                <div class="map-tech-label text-red-600 dark:text-red-400">Err. TX/RX</div>
                <div class="map-tech-value text-red-700 dark:text-red-300">${d.erroresTx ?? 0} / ${d.erroresRx ?? 0}</div>
              </div>
              <div class="map-tech-box border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-900/50">
                <div class="map-tech-label text-amber-600 dark:text-amber-400">Err. CRC</div>
                <div class="map-tech-value text-amber-700 dark:text-amber-300">${d.erroresCrc ?? 0}</div>
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
              <div class="map-tech-box">
                <div class="flex justify-between items-center mb-1 text-xs">
                   <span class="map-tech-label">Señal (RSSI)</span>
                   <span class="map-tech-value ${rssiColor}">${d.rssi ?? 'N/A'} dBm</span>
                </div>
                <div class="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div class="${rssiBg} h-1.5 rounded-full transition-all duration-500" style="width: ${signalPercent}%"></div>
                </div>
              </div>
              <div class="map-tech-grid">
                <div class="map-tech-box">
                  <div class="map-tech-label">SNR</div>
                  <div class="map-tech-value">${d.snr ?? 'N/A'} dB</div>
                </div>
                <div class="map-tech-box">
                  <div class="map-tech-label">Pérdidas</div>
                  <div class="map-tech-value">${d.erroresRx ?? 0}</div>
                </div>
              </div>
            </div>
          `;
        }

        // Popup con información detallada usando clases globales
        const popupContent = `
          <div class="map-popup-container">
            <div class="map-popup-header mb-3 pb-2 border-b border-border flex justify-between items-center">
              <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full ${d.estado === 'online' ? 'bg-green-500' : d.estado === 'low-battery' ? 'bg-yellow-500' : 'bg-red-500'}"></div>
                <span class="font-bold text-foreground">${isRouter ? 'Router LoRaWAN' : 'Sensor Node'}</span>
              </div>
              <span class="text-[10px] font-mono text-muted-foreground">#${d.id}</span>
            </div>
            
            <div class="map-popup-body space-y-2">
              ${d.nombre ? `<div class="font-medium text-sm text-foreground mb-2">${d.nombre}</div>` : ''}
              
              <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                <span class="text-muted-foreground">Modelo:</span>
                <span class="text-foreground text-right">${d.modelo || 'N/A'}</span>

                ${d.ssid ? `<span class="text-muted-foreground">SSID:</span><span class="text-foreground text-right truncate max-w-[120px] justify-self-end">${d.ssid}</span>` : ''}
                
                <span class="text-muted-foreground">Canal:</span>
                <span class="text-foreground text-right font-mono">CH ${d.canal ?? 0}</span>

                <span class="text-muted-foreground">Batería:</span>
                <span class="text-right font-bold ${d.bateria && d.bateria < 20 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}">
                  ${d.bateria}%
                </span>
                
                ${isRouter ? `
                  <span class="text-muted-foreground">Tipo:</span>
                  <span class="text-right"><span class="inline-flex items-center px-1.5 rounded-sm text-[10px] font-medium ${d.esPublico ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}">${d.esPublico ? 'Pública' : 'Privada'}</span></span>
                ` : ''}
              </div>
              
              ${!isRouter && d.humedad !== undefined ? `
                <div class="mt-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
                  <span class="text-xs text-blue-700 dark:text-blue-300 font-medium">Humedad</span>
                  <span class="text-sm font-bold text-blue-700 dark:text-blue-400">${d.humedad}%</span>
                </div>
              ` : ''}
              
              <div class="mt-2 pt-2 border-t border-border text-[10px] text-muted-foreground text-center">
                Últ. conexión: ${d.fechaUltimaConexion ? (() => {
                    const date = new Date(d.fechaUltimaConexion);
                    return isNaN(date.getTime()) ? d.fechaUltimaConexion : date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                })() : 'N/A'}
              </div>
            </div>
            
            <details class="map-tech-details group mt-2 pt-2 border-t border-border">
              <summary class="map-tech-summary text-[10px] py-1">
                <span class="group-open:hidden">Ver detalles de conexión</span>
                <span class="hidden group-open:inline">Ocultar detalles</span>
              </summary>
              ${technicalDetailsHtml}
            </details>
            
            ${!isRouter && options?.onDeviceHistoryClick ? `
              <button id="btn-device-history-${d.id}" class="map-action-button mt-2 py-1.5 text-xs">
                Ver Historial
              </button>
            ` : ''}
          </div>
        `;
        const popupNode = L.DomUtil.create('div');
        popupNode.innerHTML = popupContent;
        
        if (!isRouter && options?.onDeviceHistoryClick) {
          popupNode.querySelector(`#btn-device-history-${d.id}`)?.addEventListener('click', () => options.onDeviceHistoryClick!(d));
        }

        marker.bindPopup(popupNode);

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
