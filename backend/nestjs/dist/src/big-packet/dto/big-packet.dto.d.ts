export declare class CreateBigPacketDto {
}
export declare class RouterTelemetryDto {
    bateria?: number;
    latitud?: number;
    longitud?: number;
    paquetesEnviados?: number;
    paquetesRecibidos?: number;
    erroresTx?: number;
    erroresRx?: number;
    erroresCriptograficos?: number;
    erroresCrc?: number;
    erroresColaLlena?: number;
    erroresCanalOcupado?: number;
    cvgGPRS?: number;
    versionAplicada: number;
}
export declare class MotaReportDto {
    motaId: number;
    timestamp?: number;
    latitud?: number;
    longitud?: number;
    bateria: number;
    humedad: number;
    rssi: number;
    snr: number;
    paquetesEnviados?: number;
    paquetesRecibidos?: number;
    erroresRx?: number;
    erroresTx?: number;
    erroresCanalOcupado?: number;
    erroresCriptograficos?: number;
    erroresCrc?: number;
    erroresACKfaltante?: number;
    versionAplicada: number;
}
export declare class BigPacketDto {
    router?: RouterTelemetryDto;
    motas: MotaReportDto[];
}
