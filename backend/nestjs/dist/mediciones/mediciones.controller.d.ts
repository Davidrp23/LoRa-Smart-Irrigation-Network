import { MedicionesService } from './mediciones.service';
import { CreateMedicioneDto } from './dto/create-medicione.dto';
import { UpdateMedicioneDto } from './dto/update-medicione.dto';
export declare class MedicionesController {
    private readonly medicionesService;
    constructor(medicionesService: MedicionesService);
    create(createMedicioneDto: CreateMedicioneDto): string;
    findAll(): string;
    findOne(id: string): string;
    update(id: string, updateMedicioneDto: UpdateMedicioneDto): string;
    remove(id: string): string;
}
