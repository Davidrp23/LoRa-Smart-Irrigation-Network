import { Injectable } from '@nestjs/common';
import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Mota } from '@prisma/client';
import { vincularMotaDto } from './dto/vincular-mota.dto';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';

@Injectable()
export class MotasService {

  constructor(private prisma: PrismaService) {}

  async create(createMotaDto: CreateMotaDto): Promise<Mota> {
    return this.prisma.mota.create({
      data: createMotaDto
    });
  }

  async findAll(): Promise<Mota[]> {
    return this.prisma.mota.findMany();
  }

  async findOne(id: number): Promise<Mota | null> {
    return this.prisma.mota.findUnique({
      where: {id}
    });
  }

  async update(id: number, updateMotaDto: UpdateMotaDto): Promise<Mota> {
    return this.prisma.mota.update({
      where: {id},
      data: updateMotaDto
    });
  }

  async remove(id: number): Promise<Mota> {
    return this.prisma.mota.delete({
      where: {id}
    });
  }

  async vincularMota(Userid: number ,vincularMotaDto: vincularMotaDto): Promise<Mota> {

    const { id, codigoVinculacion} = vincularMotaDto;

    //Buscar la mota
    const mota = await this.prisma.mota.findUnique({ where: {id} });

    //Mota no existe
    if (!mota) {
      throw new NotFoundException(`La mota con ID ${id} no fue encontrada.`);
    }

    //Evitar que alguien robe una mota ya vinculada
    if (mota.usuarioId !== null) {
      throw new ConflictException('Esta mota ya pertenece a otro usuario.');
    }

    //Código incorrecto
    if (mota.codigoVinculacion !== codigoVinculacion) {
      throw new ForbiddenException('El código de vinculación es incorrecto.');
    }

    //Conectar y Actualizar
    try {
      const motaActualizada: Mota = await this.prisma.mota.update({
        where: { id },
        data: {
          usuario : {
            connect: {id: Userid}
          },
          // Insertar la fecha y hora actuales
          claimedAt: new Date(),
        },
      });

      return motaActualizada;

    } catch (error) {
      // Si Prisma intenta conectar a un usuario que no existe, lanza el error 'P2025'
      if (error.code === 'P2025') {
        throw new NotFoundException(`El usuario al que se pretende vincular no existe.`);
      }
      // Si es otro error de base de datos, lo dejamos pasar
      throw error; 
    }
  }
}
