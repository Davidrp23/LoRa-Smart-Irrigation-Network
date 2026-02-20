import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';
import { Parcela } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class ParcelasService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: number, createParcelaDto: CreateParcelaDto): Promise<Parcela>;
    findAll(usuarioId: number): Promise<Parcela[]>;
    findOne(usuarioId: number, id: number): Promise<Parcela | null>;
    update(usuarioId: number, id: number, updateParcelaDto: UpdateParcelaDto): Promise<Parcela>;
    remove(usuarioId: number, id: number): Promise<Parcela>;
}
