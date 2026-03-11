import { TipoRiego } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class TipoRiegoService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<TipoRiego[]>;
}
