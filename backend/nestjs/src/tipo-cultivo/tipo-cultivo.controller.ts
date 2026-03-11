import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TipoCultivoService } from './tipo-cultivo.service';
import { TipoCultivo } from '@prisma/client';

import { AuthGuard } from '@nestjs/passport';
import { UseGuards } from '@nestjs/common';

@UseGuards(AuthGuard('jwt'))
@Controller('tipo-cultivo')
export class TipoCultivoController {
  constructor(private readonly tipoCultivoService: TipoCultivoService) {}

  @Get()
  async findAll(): Promise<TipoCultivo[]> {
    return this.tipoCultivoService.findAll();
  }

}
