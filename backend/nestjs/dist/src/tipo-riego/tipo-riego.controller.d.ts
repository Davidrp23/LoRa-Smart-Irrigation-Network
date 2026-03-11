import { TipoRiegoService } from './tipo-riego.service';
import { TipoRiego } from '@prisma/client';
export declare class TipoRiegoController {
    private readonly tipoRiegoService;
    constructor(tipoRiegoService: TipoRiegoService);
    findAll(): Promise<TipoRiego[]>;
}
