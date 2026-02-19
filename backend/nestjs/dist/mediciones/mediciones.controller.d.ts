import { MedicionesService } from './mediciones.service';
import { CreateMedicionDto } from './dto/create-medicion.dto';
export declare class MedicionesController {
    private readonly medicionesService;
    constructor(medicionesService: MedicionesService);
    create(createMedicioneDto: CreateMedicionDto): Promise<{
        id: number;
        fecha: Date;
        humedad: number;
        bateria: number;
        rssi: number | null;
        snr: number | null;
        erroresRxMota: number | null;
        motaId: number;
    }>;
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        fecha: Date;
        humedad: number;
        bateria: number;
        rssi: number | null;
        snr: number | null;
        erroresRxMota: number | null;
        motaId: number;
    }[]>;
    findOne(id: number): import(".prisma/client").Prisma.Prisma__MedicionClient<{
        id: number;
        fecha: Date;
        humedad: number;
        bateria: number;
        rssi: number | null;
        snr: number | null;
        erroresRxMota: number | null;
        motaId: number;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    remove(id: number): import(".prisma/client").Prisma.Prisma__MedicionClient<{
        id: number;
        fecha: Date;
        humedad: number;
        bateria: number;
        rssi: number | null;
        snr: number | null;
        erroresRxMota: number | null;
        motaId: number;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
