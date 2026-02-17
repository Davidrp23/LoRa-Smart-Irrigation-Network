import { MotasService } from './motas.service';
import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
export declare class MotasController {
    private readonly motasService;
    constructor(motasService: MotasService);
    create(createMotaDto: CreateMotaDto): string;
    findAll(): string;
    findOne(id: string): string;
    update(id: string, updateMotaDto: UpdateMotaDto): string;
    remove(id: string): string;
}
