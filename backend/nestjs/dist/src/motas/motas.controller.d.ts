import { MotasService } from './motas.service';
import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
import { Mota } from '@prisma/client';
import { vincularMotaDto } from './dto/vincular-mota.dto';
import { UpdateMotasBulkDto } from './dto/update-motas-bulk.dto';
import { ObtenerMedicionDto } from './dto/obtener-medicion.dto';
export declare class MotasController {
    private readonly motasService;
    constructor(motasService: MotasService);
    create(createMotaDto: CreateMotaDto): Promise<Mota>;
    vincularMota(req: any, vincularMotaDto: vincularMotaDto): Promise<Mota>;
    desvincularMota(req: any, id: number): Promise<Mota>;
    findAll(req: any): Promise<Mota[]>;
    findOne(req: any, id: number): Promise<Mota | null>;
    update(req: any, id: number, updateMotaDto: UpdateMotaDto): Promise<Mota>;
    updateMotas(req: any, updateMotasBulkDto: UpdateMotasBulkDto): Promise<{
        ok: boolean;
        mensaje: string;
        motasActualizadas?: undefined;
    } | {
        ok: boolean;
        motasActualizadas: number;
        mensaje?: undefined;
    }>;
    getReportes(req: any, obtenerMedicionDto: ObtenerMedicionDto): Promise<{
        id: number;
        humedad: number;
        rssi: number | null;
        snr: number | null;
        paquetesEnviados: number | null;
        paquetesRecibidos: number | null;
        erroresRx: number | null;
        erroresTx: number | null;
        erroresCanalOcupado: number | null;
        erroresCriptograficos: number | null;
        erroresCrc: number | null;
        erroresACKfaltante: number | null;
        fecha: Date;
        motaId: number;
        bateria: number;
    }[] | null>;
}
