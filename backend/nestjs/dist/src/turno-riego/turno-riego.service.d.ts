import { CreateTurnoRiegoDto } from './dto/create-turno-riego.dto';
import { UpdateTurnoRiegoDto } from './dto/update-turno-riego.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TurnoRiego } from '@prisma/client';
export declare class TurnoRiegoService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: number, createTurnoRiegoDto: CreateTurnoRiegoDto): Promise<TurnoRiego>;
    findAll(userId: number, parcelaId: number): Promise<TurnoRiego[]>;
    findOne(userId: number, id: number): Promise<TurnoRiego | null>;
    update(userId: number, id: number, updateTurnoRiegoDto: UpdateTurnoRiegoDto): Promise<TurnoRiego>;
    remove(userId: number, id: number): Promise<TurnoRiego>;
    compruebaPermisos(userId: number, parcelaId: number): Promise<void>;
    compruebaIdConParcela(userId: number, id: number): Promise<void>;
}
