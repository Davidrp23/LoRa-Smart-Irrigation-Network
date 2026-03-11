import { TipoSueloService } from './tipo-suelo.service';
import { TipoSuelo } from '@prisma/client';
export declare class TipoSueloController {
    private readonly tipoSueloService;
    constructor(tipoSueloService: TipoSueloService);
    findAll(): Promise<TipoSuelo[]>;
}
