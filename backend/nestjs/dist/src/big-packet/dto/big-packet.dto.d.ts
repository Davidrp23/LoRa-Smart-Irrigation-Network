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
    erroresCrc?: number;
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
    erroresRxMota?: number;
}
export declare class BigPacketDto {
    router?: RouterTelemetryDto;
    motas: MotaReportDto[];
}
