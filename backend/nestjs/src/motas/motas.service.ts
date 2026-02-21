import { Injectable } from '@nestjs/common';
import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Mota } from '@prisma/client';
import { vincularMotaDto } from './dto/vincular-mota.dto';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ParcelasService } from 'src/parcelas/parcelas.service';

@Injectable()
export class MotasService {

  constructor(private prisma: PrismaService, private parcelasService: ParcelasService) {}


  async create(createMotaDto: CreateMotaDto): Promise<Mota> {
    return this.prisma.mota.create({
      data: createMotaDto
    });
  }

  async findAll(usuarioId: number): Promise<Mota[]> {
    return this.prisma.mota.findMany({where: {usuarioId}});
  }

  async findOne(usuarioId: number, id: number): Promise<Mota | null> {
    return this.prisma.mota.findUnique({
      where: {id, usuarioId}
    });
  }

  async update(usuarioId: number, id: number, updateMotaDto: UpdateMotaDto): Promise<Mota> {
    //Tenemos que verificar si la parcela a la que se pretende vincular existe
    const parcelaId: number = updateMotaDto.parcelaId;

    if(parcelaId != null){
      if(await this.parcelasService.findOne(usuarioId,parcelaId) == null){
        throw new NotFoundException(`La parcela con ID ${parcelaId} no existe o no le pertenece al usuario propietario de la mota.`);
      }
    }
  
    //Tambien tenemos que verificar que el router exista, una mota puede estar conectada a un router que no 
    //sea propiedad del usuario

    const routerId: number = updateMotaDto.routerId;

    if(routerId != null){
      if(await this.prisma.router.findUnique({where: {id:routerId}}) == null){
        throw new NotFoundException(`El router con ID ${routerId} no existe.`);
      }
    }
    
    return this.prisma.mota.update({
      where: {id, usuarioId},
      data: updateMotaDto
    });
  }

  async remove(usuarioId: number, id: number): Promise<Mota> {
    return this.prisma.mota.delete({
      where: {id, usuarioId}
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

  async desvincularMota(usuarioId: number ,id: number): Promise<Mota> {

    //Buscar la mota
    const mota = await this.prisma.mota.findUnique({ where: {id, usuarioId} });

    //Mota no existe
    if (!mota) {
      throw new NotFoundException(`La mota con ID ${id} no fue encontrada o no te pertenece.`);
    }

    //Conectar y Actualizar
    try {
      const motaActualizada: Mota = await this.prisma.mota.update({
        where: { id, usuarioId },
        data: {
          //Desemparejar usuario
          usuarioId: null,
          // Borrar fecha de adjudicacion
          claimedAt: null,
        },
      });

      return motaActualizada;

    } catch (error) {
      // Si Prisma intenta conectar a un usuario que no existe, lanza el error 'P2025'
      if (error.code === 'P2025') {
        throw new NotFoundException(`El usuario no existe.`);
      }
      // Si es otro error de base de datos, lo dejamos pasar
      throw error; 
    }
  }
}
