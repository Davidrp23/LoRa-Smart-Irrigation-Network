import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';
import { Parcela } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
export declare class ParcelasService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: number, createParcelaDto: CreateParcelaDto): Promise<Parcela>;
    findAll(): Promise<Parcela[]>;
    findOne(id: number): Promise<Parcela | null>;
    update(id: number, updateParcelaDto: UpdateParcelaDto): Promise<Parcela>;
    remove(id: number): Promise<Parcela>;
}
