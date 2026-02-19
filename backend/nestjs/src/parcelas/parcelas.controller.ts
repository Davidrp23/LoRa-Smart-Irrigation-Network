import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ParcelasService } from './parcelas.service';
import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';

import { UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('parcelas')
export class ParcelasController {
  constructor(private readonly parcelasService: ParcelasService) {}

  @Post()
  create(@Request() req, @Body() createParcelaDto: CreateParcelaDto) {
    return this.parcelasService.create(req.user.id, createParcelaDto);
  }

  @Get()
  findAll() {
    return this.parcelasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.parcelasService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateParcelaDto: UpdateParcelaDto) {
    return this.parcelasService.update(id, updateParcelaDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.parcelasService.remove(id);
  }
}
