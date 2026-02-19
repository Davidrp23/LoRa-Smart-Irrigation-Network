import { Injectable } from '@nestjs/common';
import { CreateMedicionDto } from './dto/create-medicion.dto';
import { Medicion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class MedicionesService {

  constructor(private prisma: PrismaService) {}

  async create(createMedicionDto: CreateMedicionDto): Promise<Medicion> {

    const mota = await this.prisma.mota.findUnique({where: {id: createMedicionDto.motaId}});

    if(!mota){
      throw new NotFoundException(`La mota con ID ${createMedicionDto.motaId} no fue encontrada.`);
    }
    
    return this.prisma.medicion.create({
      data: createMedicionDto
    });
    
  }

  findAll() {
    return this.prisma.medicion.findMany();
  }

  findOne(id: number) {
    return this.prisma.medicion.findUnique({
      where: {id}
    });
  }

  remove(id: number) {
    return this.prisma.medicion.delete({
      where: {id}
    });
  }
}
