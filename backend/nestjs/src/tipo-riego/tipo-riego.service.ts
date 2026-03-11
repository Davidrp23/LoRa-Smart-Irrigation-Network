import { Injectable } from '@nestjs/common';
import { TipoRiego } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TipoRiegoService {

  constructor(private prisma: PrismaService) {}

  async findAll(): Promise<TipoRiego[]> {
    return this.prisma.tipoRiego.findMany();
  }

}
