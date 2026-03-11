import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TipoSueloService } from './tipo-suelo.service';
import { TipoSuelo } from '@prisma/client';

import { AuthGuard } from '@nestjs/passport';
import { UseGuards } from '@nestjs/common';

@UseGuards(AuthGuard('jwt'))
@Controller('tipo-suelo')
export class TipoSueloController {
  constructor(private readonly tipoSueloService: TipoSueloService) {}

  @Get()
  async findAll(): Promise<TipoSuelo[]> {
    return this.tipoSueloService.findAll();
  }

}
