import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { MedicionesService } from './mediciones.service';
import { CreateMedicionDto } from './dto/create-medicion.dto';

import { UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('mediciones')
export class MedicionesController {
  constructor(private readonly medicionesService: MedicionesService) {}

  @Post()
  create(@Body() createMedicioneDto: CreateMedicionDto) {
    return this.medicionesService.create(createMedicioneDto);
  }
  //Las mediciones no se pueden borrar, se consultan las mediciones de cada mota con el campo de "mediciones" en la BD,
  //no hay necesidad de hacerlo directamente.

  // @Get()
  // findAll() {
  //   return this.medicionesService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id', ParseIntPipe) id: number) {
  //   return this.medicionesService.findOne(id);
  // }

  // @Delete(':id')
  // remove(@Param('id', ParseIntPipe) id: number) {
  //   return this.medicionesService.remove(id);
  // }
}
