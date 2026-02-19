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

  async findAll(): Promise<Parcela[]> {
    return this.prisma.parcela.findMany();
  }

  async findOne(id: number): Promise<Parcela | null> {
    return this.prisma.parcela.findUnique({
      where: {id}
    });
  }

  async update(id: number, updateParcelaDto: UpdateParcelaDto): Promise<Parcela> {
    return this.prisma.parcela.update({
      where: {id},
      data: updateParcelaDto
    });
  }

  async remove(id: number): Promise<Parcela> {
    return this.prisma.parcela.delete({
      where: {id},
    });
  }
}
