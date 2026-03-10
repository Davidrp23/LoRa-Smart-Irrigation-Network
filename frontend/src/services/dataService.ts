const API_URL = 'http://localhost:3000';

// Interfaces simplificadas para el adaptador
export interface AppData {
  parcelas: any[];
  dispositivos: any[];
}

export const getDashboardData = async (): Promise<AppData> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay sesión activa');

  const headers = { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}` 
  };

  try {
    // 1. Hacemos las 3 peticiones en paralelo para ir más rápido
    const [parcelasRes, motasRes, routersRes] = await Promise.all([
      fetch(`${API_URL}/parcelas`, { headers }),
      fetch(`${API_URL}/motas`, { headers }),
      fetch(`${API_URL}/routers`, { headers })
    ]);

    if (!parcelasRes.ok || !motasRes.ok || !routersRes.ok) {
      throw new Error('Error al cargar datos del sistema');
    }

    const parcelasRaw = await parcelasRes.json();
    const motasRaw = await motasRes.json();
    const routersRaw = await routersRes.json();

    // Helper para calcular estado basado en Deep Sleep (24h)
    const getEstado = (fecha: string | null) => {
      if (!fecha) return 'offline';
      const diff = new Date().getTime() - new Date(fecha).getTime();
      // Si se conectó hace menos de 24h (86400000 ms), está "Online"
      return diff < 86400000 ? 'online' : 'offline';
    };

    // 2. ADAPTADOR: Transformamos los datos del Backend al formato del Frontend
    
    // Procesamos Dispositivos (Unificamos Motas y Routers)
    const dispositivos = [
      ...routersRaw.map((r: any) => ({
        ...r,
        tipo: 'router',
        estado: getEstado(r.fechaUltimaConexion),
        historialConsumo: r.reportes ? r.reportes.map((rep: any) => ({ value: rep.bateria, date: rep.fecha })).reverse() : [],
        // Fix: Leaflet busca lat/lng, creamos alias
        lat: r.latitud,
        lng: r.longitud
      })),
      ...motasRaw.map((m: any) => ({
        ...m,
        tipo: 'mota',
        estado: getEstado(m.fechaUltimaConexion),
        bateria: m.bateriaUltima,
        rssi: m.rssi,
        snr: m.snr,
        humedad: m.humedad,
        erroresRx: m.erroresRxMota, // Mapeamos al nombre que usa el frontend
        // Precarga para la tarjeta: Mapeamos las mediciones a objetos con valor y fecha
        // Usamos .reverse() porque vienen DESC (más nueva primero) y la gráfica pinta de izq a der (antigua a nueva)
        historialConsumo: m.mediciones ? m.mediciones.map((med: any) => ({ value: med.bateria, date: med.fecha })).reverse() : [],
        // Fix: Leaflet busca lat/lng, creamos alias
        lat: m.latitud,
        lng: m.longitud
      }))
    ];

    // Procesamos Parcelas
    const parcelas = parcelasRaw.map((p: any) => {
      // Convertimos los puntos JSON (backend) a Array de Arrays (frontend leaflet)
      let coordenadas = [];
      try {
        coordenadas = (typeof p.puntos === 'string' ? JSON.parse(p.puntos) : p.puntos) || [];
      } catch (e) {
        coordenadas = [];
      }

      // Inyectamos los dispositivos que pertenecen a esta parcela
      // (El backend no siempre devuelve esto anidado, así que lo calculamos aquí)
      const dispositivosEnParcela = dispositivos
        .filter(d => d.parcelaId === p.id);

      return {
        ...p,
        coordenadas: coordenadas || [],
        dispositivos: dispositivosEnParcela,
        motas: dispositivosEnParcela.filter(d => d.tipo === 'mota').length, // Contador solo motas
        estado: 'ok', // Valor por defecto UI
        humedad: p.humedadMedia != null ? Math.round(p.humedadMedia) : null,
        proximoRiego: 'Programar' // Valor por defecto UI
      };
    });

    return { parcelas, dispositivos };

  } catch (error) {
    console.error("Error en dataService:", error);
    throw error;
  }
};

// --- GESTIÓN DE PARCELAS ---

export const createParcela = async (parcela: any) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay sesión activa');

  // Calculamos el centro si no viene (necesario para el backend)
  let latCentro = parcela.latitudCentro;
  let lngCentro = parcela.longitudCentro;

  if ((!latCentro || !lngCentro) && parcela.coordenadas && parcela.coordenadas.length > 0) {
     const lats = parcela.coordenadas.map((p: any) => p[0]);
     const lngs = parcela.coordenadas.map((p: any) => p[1]);
     latCentro = lats.reduce((a:any, b:any) => a + b, 0) / lats.length;
     lngCentro = lngs.reduce((a:any, b:any) => a + b, 0) / lngs.length;
  }

  // Preparamos el payload LIMPIO (solo lo que el DTO permite)
  const payload = {
    nombre: parcela.nombre,
    cultivo: parcela.cultivo || 'Sin cultivo',
    tipoSuelo: parcela.tipoSuelo,
    latitudCentro: latCentro || 0,
    longitudCentro: lngCentro || 0,
    puntos: parcela.coordenadas // Frontend usa 'coordenadas', Backend espera 'puntos' (mapeado en DTO)
  };

  const response = await fetch(`${API_URL}/parcelas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Error al crear parcela');
  return await response.json();
};

export const updateParcela = async (id: number, parcela: any) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay sesión activa');

  // Solo enviamos lo necesario
  const payload: any = {
    nombre: parcela.nombre,
    cultivo: parcela.cultivo,
    tipoSuelo: parcela.tipoSuelo,
  };
  
  // Si se editaron los puntos, los enviamos
  if (parcela.coordenadas) {
      payload.puntos = parcela.coordenadas;
      // Nota: Deberíamos recalcular el centro aquí también, pero por simplicidad lo omitimos o el backend podría hacerlo
  }

  const response = await fetch(`${API_URL}/parcelas/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Error al actualizar parcela');
  return await response.json();
};

export const deleteParcela = async (id: number) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay sesión activa');

  const response = await fetch(`${API_URL}/parcelas/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    },
  });

  if (!response.ok) throw new Error('Error al eliminar parcela');
  return await response.json();
};

// --- GESTIÓN DE DISPOSITIVOS (ROUTERS Y MOTAS) ---

export const createDevice = async (device: any, type: 'router' | 'mota') => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay sesión activa');

  const endpoint = type === 'router' ? 'routers/vincular' : 'motas/vincular';
  
  // Solo enviamos el código de vinculación para reclamar el dispositivo
  const payload = { codigoVinculacion: device.codigoVinculacion };

  const response = await fetch(`${API_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Error al vincular ${type}`);
  return await response.json();
};

export const updateDevice = async (id: number, device: any, type: 'router' | 'mota') => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay sesión activa');

  const endpoint = type === 'router' ? 'routers' : 'motas';
  // Reutilizamos la lógica de payload de creación, pero sin código de vinculación (no se suele editar)
  const payload: any = { 
    nombre: device.nombre,
    parcelaId: device.parcelaId ? Number(device.parcelaId) : null
  };

  if (type === 'router') { 
    payload.ssid = device.ssid; 
    payload.esPublico = device.esPublico; 
    payload.canal = device.canal; // Enviamos el canal numérico
  } else {
    payload.frecuencia = device.frecuencia; // Solo las motas tienen frecuencia de actualización
  }

  //console.log(payload);

  const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`Error al actualizar ${type}`);
  return await response.json();
};

export const deleteDevice = async (id: number, type: 'router' | 'mota') => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay sesión activa');

  // Endpoint correcto: /desvincular/:id (POST)
  const endpoint = type === 'router' ? 'routers/desvincular' : 'motas/desvincular';
  const response = await fetch(`${API_URL}/${endpoint}/${id}`, {
    method: 'POST', 
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) throw new Error(`Error al desvincular ${type}`);
  return await response.json();
};

// --- GESTIÓN DE MEDICIONES (HISTÓRICO) ---

export const getMediciones = async (motaId: number, fechaBegin: Date, fechaEnd: Date) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay sesión activa');

  const response = await fetch(`${API_URL}/mediciones/buscar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ motaId, fechaBegin, fechaEnd }),
  });

  //console.log(JSON.stringify({ motaId, fechaBegin, fechaEnd }));

  if (!response.ok) throw new Error('Error al obtener mediciones');
  return await response.json();
};

export const getRouterReportes = async (routerId: number, fechaBegin: Date, fechaEnd: Date) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay sesión activa');

  const response = await fetch(`${API_URL}/routers/reportes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ routerId, fechaBegin, fechaEnd }),
  });

  if (!response.ok) throw new Error('Error al obtener reportes del router');
  return await response.json();
};

export const getParcelaHistorico = async (parcelaId: number, fechaBegin: Date, fechaEnd: Date) => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No hay sesión activa');

  const response = await fetch(`${API_URL}/parcelas/historico`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ parcelaId, fechaBegin, fechaEnd }),
  });

  console.log(JSON.stringify({ parcelaId, fechaBegin, fechaEnd }));

  if (!response.ok) throw new Error('Error al obtener histórico de la parcela');
  return await response.json();
};