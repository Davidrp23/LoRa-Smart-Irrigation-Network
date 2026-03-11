import { TipoCultivoService } from './tipo-cultivo.service';
import { TipoCultivo } from '@prisma/client';
export declare class TipoCultivoController {
    private readonly tipoCultivoService;
    constructor(tipoCultivoService: TipoCultivoService);
    findAll(): Promise<TipoCultivo[]>;
}
