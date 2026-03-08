import { Injectable } from '@nestjs/common';
import { CreateMedicionDto } from './dto/create-medicion.dto';
import { Medicion } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { ObtenerMedicionDto } from './dto/obtener-medicion.dto';

@Injectable()
export class MedicionesService {

  constructor(private prisma: PrismaService) {}

  async create(usuarioId: number, createMedicionDto: CreateMedicionDto): Promise<Medicion> {

    //Nos aseguramos antes de buscar las mediciones si la mota pertenece al usuario.
    const mota = await this.prisma.mota.findUnique({where: {id: createMedicionDto.motaId, usuarioId}});

    if(!mota){
      throw new NotFoundException(`La mota con ID ${createMedicionDto.motaId} no existe o no te pertenece.`);
    }
    
    return this.prisma.medicion.create({
      data: createMedicionDto
    });
    
  }

  async findByDate(usuarioId: number, obtenerMedicionDto: ObtenerMedicionDto): Promise<Medicion[] | null> {
    //Buscamos mediciones que se comprendan en las fechas y pertenezcan al usuario
    let motaId: number = obtenerMedicionDto.motaId;
    let fechaBegin: string = obtenerMedicionDto.fechaBegin;
    let fechaEnd: string = obtenerMedicionDto.fechaEnd

    //Nos aseguramos antes de buscar las mediciones si la mota pertenece al usuario.
    const mota = await this.prisma.mota.findUnique({where: {id: motaId, usuarioId}});

    if(!mota){
      throw new NotFoundException(`La mota con ID ${motaId} no existe o no te pertenece.`);
    }

    //Buscamos en la tabla de mediciones por id de la mota y teniendo en cuenta las dechas de inicio y fin
    return this.prisma.medicion.findMany({
      where: {
        motaId: motaId,
        fecha: {
          gte: new Date(fechaBegin), // Convertimos el string a objeto Date
          lte: new Date(fechaEnd)
        }
      }
    });
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
