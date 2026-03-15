import { PrismaService } from '../prisma/prisma.service';
export declare class RiegoService {
    private prisma;
    private readonly logger;
    private readonly PROFUNDIDAD_RAICES_MM;
    constructor(prisma: PrismaService);
    calcularRiegoDiario(): Promise<void>;
}
