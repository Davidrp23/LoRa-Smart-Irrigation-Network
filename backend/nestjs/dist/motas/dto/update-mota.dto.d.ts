import { CreateMotaDto } from './create-mota.dto';
declare const UpdateMotaDto_base: import("@nestjs/common").Type<Partial<CreateMotaDto>>;
export declare class UpdateMotaDto extends UpdateMotaDto_base {
    nombre: string;
    parcelaId: number;
    latitud: number;
    longitud: number;
    routerId: number;
    bateriaUltima: number;
    fechaUltimaConexion: Date;
}
export {};
