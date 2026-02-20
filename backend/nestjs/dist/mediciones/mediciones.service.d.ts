import { CreateMedicionDto } from './dto/create-medicion.dto';
import { Medicion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class MedicionesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createMedicionDto: CreateMedicionDto): Promise<Medicion>;
    findAll(): import(".prisma/client").Prisma.PrismaPromise<{
        id: number;
        bateria: number;
        humedad: number;
        rssi: number | null;
        snr: number | null;
        erroresRxMota: number | null;
        motaId: number;
        fecha: Date;
    }[]>;
    findOne(id: number): import(".prisma/client").Prisma.Prisma__MedicionClient<{
        id: number;
        bateria: number;
        humedad: number;
        rssi: number | null;
        snr: number | null;
        erroresRxMota: number | null;
        motaId: number;
        fecha: Date;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    remove(id: number): import(".prisma/client").Prisma.Prisma__MedicionClient<{
        id: number;
        bateria: number;
        humedad: number;
        rssi: number | null;
        snr: number | null;
        erroresRxMota: number | null;
        motaId: number;
        fecha: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
