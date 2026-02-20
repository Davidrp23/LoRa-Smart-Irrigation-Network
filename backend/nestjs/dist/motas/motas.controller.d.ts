import { MotasService } from './motas.service';
import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
import { Mota } from '@prisma/client';
import { vincularMotaDto } from './dto/vincular-mota.dto';
export declare class MotasController {
    private readonly motasService;
    constructor(motasService: MotasService);
    create(createMotaDto: CreateMotaDto): Promise<Mota>;
    vincularMota(req: any, vincularMotaDto: vincularMotaDto): Promise<Mota>;
    findAll(): Promise<Mota[]>;
    findOne(id: number): Promise<Mota | null>;
    update(id: number, updateMotaDto: UpdateMotaDto): Promise<Mota>;
    remove(id: number): Promise<Mota>;
}
