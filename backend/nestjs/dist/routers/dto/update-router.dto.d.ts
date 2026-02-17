import { CreateRouterDto } from './create-router.dto';
declare const UpdateRouterDto_base: import("@nestjs/common").Type<Partial<CreateRouterDto>>;
export declare class UpdateRouterDto extends UpdateRouterDto_base {
    ssid: string;
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
}
export {};
