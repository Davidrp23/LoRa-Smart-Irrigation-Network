import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { MotasService } from './motas.service';
import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
import { Mota } from '@prisma/client';

import { UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { vincularMotaDto } from './dto/vincular-mota.dto';
import { UpdateMotasBulkDto } from './dto/update-motas-bulk.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('motas')
export class MotasController {
  constructor(private readonly motasService: MotasService) {}

  @Post()
  async create(@Body() createMotaDto: CreateMotaDto): Promise<Mota> {
    return this.motasService.create(createMotaDto);
  }

  @Post('vincular/')
  async vincularMota(@Request() req, @Body() vincularMotaDto: vincularMotaDto): Promise<Mota>{
    return this.motasService.vincularMota(req.user.id, vincularMotaDto);
  }

  @Post('desvincular/:id')
  async desvincularMota(@Request() req, @Param('id', ParseIntPipe) id: number): Promise<Mota>{
    return this.motasService.desvincularMota(req.user.id, id);
  }

  @Get()
  async findAll(@Request() req): Promise<Mota[]> {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.motasService.findAll(miPropioId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id', ParseIntPipe) id: number): Promise<Mota | null> {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.motasService.findOne(miPropioId, id);
  }

  @Patch(':id')
  async update(@Request() req, @Param('id',ParseIntPipe) id: number, @Body() updateMotaDto: UpdateMotaDto): Promise<Mota> {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.motasService.update(miPropioId, id, updateMotaDto);
  }

  // @Delete(':id') //No podemos eliminar una mota ya que sigue existiendo, solo podemos desvincularla
  // async remove(@Request() req, @Param('id', ParseIntPipe) id: number): Promise<Mota> {
  //   const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
  //   return this.motasService.remove(miPropioId, id);
  // }

  @Patch('update/all')
  async updateMotas(@Request() req, @Body() updateMotasBulkDto: UpdateMotasBulkDto) {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.motasService.actualizarMotas(miPropioId,updateMotasBulkDto);
  }

}
