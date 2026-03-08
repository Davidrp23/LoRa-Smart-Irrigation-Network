import { CreateMedicionDto } from './dto/create-medicion.dto';
import { Medicion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ObtenerMedicionDto } from './dto/obtener-medicion.dto';
export declare class MedicionesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(usuarioId: number, createMedicionDto: CreateMedicionDto): Promise<Medicion>;
    findByDate(usuarioId: number, obtenerMedicionDto: ObtenerMedicionDto): Promise<Medicion[] | null>;
    findOne(id: number): import(".prisma/client").Prisma.Prisma__MedicionClient<{
        humedad: number;
        rssi: number | null;
        snr: number | null;
        erroresRxMota: number | null;
        id: number;
        bateria: number;
        motaId: number;
        fecha: Date;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    remove(id: number): import(".prisma/client").Prisma.Prisma__MedicionClient<{
        humedad: number;
        rssi: number | null;
        snr: number | null;
        erroresRxMota: number | null;
        id: number;
        bateria: number;
        motaId: number;
        fecha: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
}
