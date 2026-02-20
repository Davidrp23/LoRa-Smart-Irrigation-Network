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
}
