import { CreateMedicioneDto } from './dto/create-medicione.dto';
import { UpdateMedicioneDto } from './dto/update-medicione.dto';
export declare class MedicionesService {
    create(createMedicioneDto: CreateMedicioneDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateMedicioneDto: UpdateMedicioneDto): string;
    remove(id: number): string;
}
