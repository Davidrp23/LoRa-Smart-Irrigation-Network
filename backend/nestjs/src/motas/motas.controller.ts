import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { MotasService } from './motas.service';
import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
import { Mota } from '@prisma/client';

import { UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { vincularMotaDto } from './dto/vincular-mota.dto';

@Controller('motas')
export class MotasController {
  constructor(private readonly motasService: MotasService) {}

  @Post()
  async create(@Body() createMotaDto: CreateMotaDto): Promise<Mota> {
    return this.motasService.create(createMotaDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('vincular/')
  async vincularMota(@Request() req, @Body() vincularMotaDto: vincularMotaDto): Promise<Mota>{
    return this.motasService.vincularMota(req.user.id, vincularMotaDto);
  }

  @Get()
  async findAll(): Promise<Mota[]> {
    return this.motasService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Mota | null> {
    return this.motasService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id',ParseIntPipe) id: number, @Body() updateMotaDto: UpdateMotaDto): Promise<Mota> {
    return this.motasService.update(id, updateMotaDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Mota> {
    return this.motasService.remove(id);
  }
}
