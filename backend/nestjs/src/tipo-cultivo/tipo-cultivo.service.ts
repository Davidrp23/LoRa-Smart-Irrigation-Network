import { Injectable } from '@nestjs/common';
import { TipoCultivo } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TipoCultivoService {

  constructor(private prisma: PrismaService) {}

  async findAll() : Promise<TipoCultivo[]> {
    return this.prisma.tipoCultivo.findMany();
  }

}
