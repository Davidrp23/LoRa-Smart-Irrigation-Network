import { PrismaService } from '../prisma/prisma.service';
import { ClimaServiceService } from '../clima-service/clima-service.service';
export declare class RiegoService {
    private prisma;
    private climaService;
    private readonly logger;
    private readonly PROFUNDIDAD_RAICES_MM;
    private readonly HORAS_24_MS;
    private readonly HORAS_2_MS;
    constructor(prisma: PrismaService, climaService: ClimaServiceService);
    calcularTurnosPendientes(): Promise<void>;
}
