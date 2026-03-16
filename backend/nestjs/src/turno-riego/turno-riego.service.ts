import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTurnoRiegoDto } from './dto/create-turno-riego.dto';
import { UpdateTurnoRiegoDto } from './dto/update-turno-riego.dto';
import { PrismaService } from '../prisma/prisma.service';
import { TurnoRiego } from '@prisma/client';

@Injectable()
export class TurnoRiegoService {

  constructor(private prisma: PrismaService) {}

  async create(userId: number, createTurnoRiegoDto: CreateTurnoRiegoDto): Promise<TurnoRiego> {

    await this.compruebaPermisos(userId, createTurnoRiegoDto.parcelaId);

    return this.prisma.turnoRiego.create({data: createTurnoRiegoDto});
  }

  //Obtiene todos las programaciones de riego de una parcela.
  async findAll(userId: number, parcelaId: number): Promise<TurnoRiego[]> {

    await this.compruebaPermisos(userId, parcelaId);

    return this.prisma.turnoRiego.findMany({where: {parcelaId}});
  }

  async findOne(userId: number, id: number): Promise<TurnoRiego | null> {

    await this.compruebaIdConParcela(userId, id);

    return this.prisma.turnoRiego.findUnique({where: {id}});
  }

  async update(userId: number, id: number, updateTurnoRiegoDto: UpdateTurnoRiegoDto): Promise<TurnoRiego> {

    await this.compruebaIdConParcela(userId, id); //Comprobamos si el turno de riego le pertenece

    return this.prisma.turnoRiego.update({where: {id}, data: updateTurnoRiegoDto});
  }

  async remove(userId: number, id: number): Promise<TurnoRiego> {

    await this.compruebaIdConParcela(userId, id);

    return this.prisma.turnoRiego.delete({where: {id}});
  
  }

  async compruebaPermisos(userId: number, parcelaId: number){
    //Comprobamos si el usuario puede crear ese turno de riego en la parcela que esta en el body
    //puede ser que esa parcela no sea del usuario y no pueda crearla, solo puede crear turnos de riego en parcelas que son suyas.
    const parcela = await this.prisma.parcela.findUnique({
      select: { id: true },
      where: {  
        id: parcelaId,
        usuarioId: userId
      }
    });

    if (!parcela) throw new NotFoundException('Parcela no encontrada o no te pertenece.');
  }

  async compruebaIdConParcela(userId: number, id: number){
    //Sacamos el turno de riego de la bd y comprobamos si la parcela a la que apunta
    //pertenece al usuario, si es asi, se lo entregamos al usuario.
    const turnoRiego = await this.prisma.turnoRiego.findUnique({
      select: { parcelaId: true },
      where: {  
        id,
        parcela: {
          usuarioId: userId
        }
      }
    });

    if (!turnoRiego) throw new NotFoundException('Turno de riego no encontrado o no te pertenece.');
  }
}
