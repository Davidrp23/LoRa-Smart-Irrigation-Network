import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
export declare class MotasService {
    create(createMotaDto: CreateMotaDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateMotaDto: UpdateMotaDto): string;
    remove(id: number): string;
}
