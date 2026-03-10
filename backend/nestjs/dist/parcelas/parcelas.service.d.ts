import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';
import { Parcela, HistoricoParcela } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ObtenerHistoricoDto } from './dto/obtener-historico.dto';
export declare class ParcelasService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: number, createParcelaDto: CreateParcelaDto): Promise<Parcela>;
    findAll(usuarioId: number): Promise<Parcela[]>;
    findOne(usuarioId: number, id: number): Promise<Parcela | null>;
    update(usuarioId: number, id: number, updateParcelaDto: UpdateParcelaDto): Promise<Parcela>;
    remove(usuarioId: number, id: number): Promise<Parcela>;
    actualizarEstadoParcela(parcelaId: number): Promise<void>;
    getHistorico(usuarioId: number, obtenerHistoricoDto: ObtenerHistoricoDto): Promise<HistoricoParcela[]>;
}
