import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Mota } from '@prisma/client';
import { vincularMotaDto } from './dto/vincular-mota.dto';
export declare class MotasService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createMotaDto: CreateMotaDto): Promise<Mota>;
    findAll(): Promise<Mota[]>;
    findOne(id: number): Promise<Mota | null>;
    update(id: number, updateMotaDto: UpdateMotaDto): Promise<Mota>;
    remove(id: number): Promise<Mota>;
    vincularMota(Userid: number, vincularMotaDto: vincularMotaDto): Promise<Mota>;
}
