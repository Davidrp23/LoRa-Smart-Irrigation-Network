import { TipoCultivo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class TipoCultivoService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<TipoCultivo[]>;
}
