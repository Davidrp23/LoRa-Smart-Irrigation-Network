export declare class UpdateRouterDto {
    nombre: string;
    ssid: string;
    canal: number;
    esPublico: boolean;
    latitud: number;
    longitud: number;
    bateria: number;
    fechaUltimaConexion: Date;
    paquetesEnviados: number;
    paquetesRecibidos: number;
    erroresTx: number;
    erroresRx: number;
    erroresCrc: number;
    cvgGPRS: number;
    erroresCriptograficos: number;
    erroresCanalOcupado: number;
    erroresColaLlena: number;
    versionAplicada: number;
    parcelaId: number;
}
