import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
import { Mota } from './entities/mota.entity';
export declare class MotasService {
    private motas;
    create(createMotaDto: CreateMotaDto): string;
    findAll(): Mota[];
    findOne(id: number): string;
    update(id: number, updateMotaDto: UpdateMotaDto): string;
    remove(id: number): string;
}
