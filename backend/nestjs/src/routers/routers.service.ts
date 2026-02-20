import { Injectable } from '@nestjs/common';
import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';
import { Router } from '@prisma/client'; // 2. Importa el Tipo de Prisma (El Entity real)
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { VincularRouterDto } from './dto/vincular-router.dto';

@Injectable()
export class RoutersService {

  // 3. Inyecta Prisma en el constructor
  constructor(private prisma: PrismaService) {}


  async create(createRouterDto: CreateRouterDto): Promise<Router> {
    return this.prisma.router.create({
      data: createRouterDto
    });
  }

  async findAll(usuarioId: number): Promise<Router[]> {
    return this.prisma.router.findMany({
      where: {usuarioId}
    });
  }

  async findOne(usuarioId: number, id: number): Promise<Router | null> {
    return this.prisma.router.findUnique({
      where: {id, usuarioId},
    });
  }

  async update(usuarioId: number, id: number, updateRouterDto: UpdateRouterDto): Promise<Router> {
    return this.prisma.router.update({
      where: {id, usuarioId},
      data: updateRouterDto,
    });
  }

  async remove(id: number): Promise<Router> {
    return this.prisma.router.delete({
      where: {id},
    });
  }

  async isPublic(usuarioId: number, id: number): Promise<Boolean | null>{
    const router: Router | null = await this.findOne(usuarioId, id);

    if(!router){
      throw new NotFoundException(`El router con ID ${id} no fue encontrado.`);
    }

    return router.esPublico;
  }

  

  async vincularRouter(Userid: number ,vincularRouterDto: VincularRouterDto): Promise<Router> {

    const { id, codigoVinculacion} = vincularRouterDto;

    //Buscar el router
    const router = await this.prisma.router.findUnique({ where: {id} });

    //Router no existe
    if (!router) {
      throw new NotFoundException(`El router con ID ${id} no fue encontrado.`);
    }

    //Evitar que alguien robe un router ya vinculado
    if (router.usuarioId !== null) {
      throw new ConflictException('Este router ya pertenece a otro usuario.');
    }

    //Código incorrecto
    if (router.codigoVinculacion !== codigoVinculacion) {
      throw new ForbiddenException('El código de vinculación es incorrecto.');
    }

    //Conectar y Actualizar
    try {
      const routerActualizado: Router = await this.prisma.router.update({
        where: { id },
        data: {
          usuario : {
            connect: {id: Userid}
          },
          // Insertar la fecha y hora actuales
          claimedAt: new Date(),
        },
      });

      return routerActualizado;

    } catch (error) {
      // Si Prisma intenta conectar a un usuario que no existe, lanza el error 'P2025'
      if (error.code === 'P2025') {
        throw new NotFoundException(`El usuario al que se pretende vincular no existe.`);
      }
      // Si es otro error de base de datos, lo dejamos pasar
      throw error; 
    }
  }

  async desvincularRouter(Userid: number ,routerId: number): Promise<Router> {

    //Buscar el router
    const router = await this.prisma.router.findUnique({ where: {id: routerId, usuarioId: Userid} });

    //Router no existe
    if (!router) {
      throw new NotFoundException(`El router con ID ${routerId} no fue encontrado o no te pertenece.`);
    }

    //Conectar y Actualizar
    try {
      const routerActualizado: Router = await this.prisma.router.update({
        where: {id: routerId, usuarioId: Userid},
        data: {
          //Desenparejar del usuario
          usuarioId : null,
          // Borrar fecha
          claimedAt: null,
        },
      });

      return routerActualizado;

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
