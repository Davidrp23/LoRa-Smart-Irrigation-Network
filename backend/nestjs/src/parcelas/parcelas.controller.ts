import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ParcelasService } from './parcelas.service';
import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';

import { UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ObtenerHistoricoDto } from './dto/obtener-historico.dto';

@UseGuards(AuthGuard('jwt'))
@Controller('parcelas')
export class ParcelasController {
  constructor(private readonly parcelasService: ParcelasService) {}

  @Post()
  create(@Request() req, @Body() createParcelaDto: CreateParcelaDto) {
    return this.parcelasService.create(req.user.id, createParcelaDto);
  }

  @Get()
  findAll(@Request() req) {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.parcelasService.findAll(miPropioId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.parcelasService.findOne(miPropioId, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() updateParcelaDto: UpdateParcelaDto) {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.parcelasService.update(miPropioId, id, updateParcelaDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.parcelasService.remove(miPropioId, id);
  }

  @Post('/historico')
  getHistorico(@Request() req, @Body() obtenerHistoricoDto: ObtenerHistoricoDto) {
    const miPropioId = req.user.id;
    return this.parcelasService.getHistorico(miPropioId, obtenerHistoricoDto);
  }
}
