import { Injectable } from '@nestjs/common';
import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';
import { VincularRouterDto } from './dto/vincular-router.dto';
import { Router } from '@prisma/client'; // 2. Importa el Tipo de Prisma (El Entity real)
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoutersService {

  // 3. Inyecta Prisma en el constructor
  constructor(private prisma: PrismaService) {}


  async create(createRouterDto: CreateRouterDto): Promise<Router> {
    return this.prisma.router.create({
      data: createRouterDto
    });
  }

  findAll() {
    return this.prisma.router.findMany();
  }

  findOne(id: number) {
    return this.prisma.router.findUnique({
      where: {id},
    });
  }

  update(id: number, updateRouterDto: UpdateRouterDto) {
    return this.prisma.router.update({
      where: {id},
      data: updateRouterDto,
    });
  }

  remove(id: number) {
    return this.prisma.router.delete({
      where: {id},
    });
  }
}
