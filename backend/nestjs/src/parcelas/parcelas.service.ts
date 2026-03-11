import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';
import { Parcela, HistoricoParcela } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ObtenerHistoricoDto } from './dto/obtener-historico.dto';

@Injectable()
export class ParcelasService {

  constructor(private prisma: PrismaService) {}
  
  async create(userId: number, createParcelaDto: CreateParcelaDto): Promise<Parcela> {
    return this.prisma.parcela.create({
      data: {usuarioId: userId, ...createParcelaDto},
    });
  }

  async findAll(usuarioId: number): Promise<Parcela[]> {
    return this.prisma.parcela.findMany({
      where: {usuarioId},
      include: { cultivo: true, suelo: true, riego: true }
    });
  }

  async findOne(usuarioId: number, id: number): Promise<Parcela | null> {
    return this.prisma.parcela.findUnique({
      where: {id, usuarioId},
      include: { cultivo: true, suelo: true, riego: true }
    });
  }

  async update(usuarioId: number, id: number, updateParcelaDto: UpdateParcelaDto): Promise<Parcela> {
    return this.prisma.parcela.update({
      where: {id, usuarioId},
      data: updateParcelaDto,
    });
  }

  async remove(usuarioId: number, id: number): Promise<Parcela> {
    return this.prisma.parcela.delete({
      where: {id, usuarioId},
    });
  }

  // --- LÓGICA DE NEGOCIO AVANZADA ---

  // Se llama automáticamente cuando llegan nuevos datos de sensores
  async actualizarEstadoParcela(parcelaId: number): Promise<void> {
    // 1. Calcular la media de humedad de todas las motas activas en la parcela
    const agregados = await this.prisma.mota.aggregate({
      where: { parcelaId: parcelaId },
      _avg: { humedad: true }
    });
    
    const media = agregados._avg.humedad || 0;

    // 2. Actualizar el estado actual de la parcela y guardar registro histórico
    // Usamos una transacción para asegurar que el dato actual y el histórico sean coherentes
    await this.prisma.$transaction([
      this.prisma.parcela.update({
        where: { id: parcelaId },
        data: { humedadMedia: media }
      }),
      this.prisma.historicoParcela.create({
        data: {
          parcelaId: parcelaId,
          humedadMedia: media
        }
      })
    ]);
  }

  async getHistorico(usuarioId: number, obtenerHistoricoDto:ObtenerHistoricoDto): Promise<HistoricoParcela[]> {
    //Buscamos mediciones que se comprendan en las fechas y pertenezcan al usuario
    let parcelaId: number = obtenerHistoricoDto.parcelaId;
    let fechaBegin: string = obtenerHistoricoDto.fechaBegin;
    let fechaEnd: string = obtenerHistoricoDto.fechaEnd

    const parcela = await this.findOne(usuarioId, parcelaId);
    if (!parcela) throw new NotFoundException('Parcela no encontrada o no te pertenece.');

    return this.prisma.historicoParcela.findMany({
      where: { parcelaId,
        fecha: {
          gte: new Date(fechaBegin), // Convertimos el string a objeto Date
          lte: new Date(fechaEnd)
        }
       },
      orderBy: { fecha: 'asc' },
    });
  }
}
