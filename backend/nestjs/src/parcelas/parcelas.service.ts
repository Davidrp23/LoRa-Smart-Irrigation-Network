import { Injectable } from '@nestjs/common';
import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';
import { Parcela } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParcelasService {

  constructor(private prisma: PrismaService) {}
  
  async create(userId: number, createParcelaDto: CreateParcelaDto): Promise<Parcela> {
    return this.prisma.parcela.create({
      data: {usuarioId: userId, ...createParcelaDto}
    });
  }

  async findAll(usuarioId: number): Promise<Parcela[]> {
    return this.prisma.parcela.findMany({where: {usuarioId}});
  }

  async findOne(usuarioId: number, id: number): Promise<Parcela | null> {
    return this.prisma.parcela.findUnique({
      where: {id, usuarioId}
    });
  }

  async update(usuarioId: number, id: number, updateParcelaDto: UpdateParcelaDto): Promise<Parcela> {
    return this.prisma.parcela.update({
      where: {id, usuarioId},
      data: updateParcelaDto
    });
  }

  async remove(usuarioId: number, id: number): Promise<Parcela> {
    return this.prisma.parcela.delete({
      where: {id, usuarioId},
    });
  }
}
