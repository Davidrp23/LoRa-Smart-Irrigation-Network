import { MedicionesService } from './mediciones.service';
import { CreateMedicionDto } from './dto/create-medicion.dto';
import { ObtenerMedicionDto } from './dto/obtener-medicion.dto';
export declare class MedicionesController {
    private readonly medicionesService;
    constructor(medicionesService: MedicionesService);
    create(req: any, createMedicioneDto: CreateMedicionDto): Promise<{
        humedad: number;
        rssi: number | null;
        snr: number | null;
        erroresRxMota: number | null;
        id: number;
        fecha: Date;
        bateria: number;
        motaId: number;
    }>;
    findByDate(req: any, obtenerMedicionDto: ObtenerMedicionDto): Promise<{
        humedad: number;
        rssi: number | null;
        snr: number | null;
        erroresRxMota: number | null;
        id: number;
        fecha: Date;
        bateria: number;
        motaId: number;
    }[] | null>;
}
