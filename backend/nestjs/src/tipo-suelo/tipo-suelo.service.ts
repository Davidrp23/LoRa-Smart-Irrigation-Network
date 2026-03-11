import { Injectable } from '@nestjs/common';
import { TipoSuelo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';


@Injectable()
export class TipoSueloService {

  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<TipoSuelo[]> {
    return this.prisma.tipoSuelo.findMany();
  }

}
