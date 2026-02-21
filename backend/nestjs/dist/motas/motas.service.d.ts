import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Mota } from '@prisma/client';
import { vincularMotaDto } from './dto/vincular-mota.dto';
import { ParcelasService } from 'src/parcelas/parcelas.service';
export declare class MotasService {
    private prisma;
    private parcelasService;
    constructor(prisma: PrismaService, parcelasService: ParcelasService);
    create(createMotaDto: CreateMotaDto): Promise<Mota>;
    findAll(usuarioId: number): Promise<Mota[]>;
    findOne(usuarioId: number, id: number): Promise<Mota | null>;
    update(usuarioId: number, id: number, updateMotaDto: UpdateMotaDto): Promise<Mota>;
    remove(usuarioId: number, id: number): Promise<Mota>;
    vincularMota(Userid: number, vincularMotaDto: vincularMotaDto): Promise<Mota>;
    desvincularMota(usuarioId: number, id: number): Promise<Mota>;
}
