import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TipoRiegoService } from './tipo-riego.service';
import { TipoRiego } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { UseGuards } from '@nestjs/common';

@UseGuards(AuthGuard('jwt'))
@Controller('tipo-riego')
export class TipoRiegoController {
  constructor(private readonly tipoRiegoService: TipoRiegoService) {}

  @Get()
  async findAll(): Promise<TipoRiego[]>  {
    return this.tipoRiegoService.findAll();
  }

}
