import { TipoSuelo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class TipoSueloService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<TipoSuelo[]>;
}
