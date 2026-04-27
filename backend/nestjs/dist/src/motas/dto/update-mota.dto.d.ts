export declare class UpdateMotaDto {
    nombre: string;
    parcelaId: number;
    frecuencia: number;
    canal: number;
    latitud: number;
    longitud: number;
    routerId: number;
    bateriaUltima: number;
    humedad: number;
    rssi: number;
    snr: number;
    paquetesEnviados: number;
    paquetesRecibidos: number;
    erroresRx: number;
    erroresTx: number;
    erroresCanalOcupado: number;
    erroresCriptograficos: number;
    erroresCrc: number;
    erroresACKfaltante: number;
    versionAplicada: number;
    fechaUltimaConexion: Date;
    conexionPublica: boolean;
}
