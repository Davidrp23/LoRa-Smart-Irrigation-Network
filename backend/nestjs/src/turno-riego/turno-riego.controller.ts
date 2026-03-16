import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { TurnoRiegoService } from './turno-riego.service';
import { CreateTurnoRiegoDto } from './dto/create-turno-riego.dto';
import { UpdateTurnoRiegoDto } from './dto/update-turno-riego.dto';
import { UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';


@UseGuards(AuthGuard('jwt'))
@Controller('turno-riego')
export class TurnoRiegoController {
  constructor(private readonly turnoRiegoService: TurnoRiegoService) {}

  @Post()
  create(@Request() req, @Body() createTurnoRiegoDto: CreateTurnoRiegoDto) {
    return this.turnoRiegoService.create(req.user.id, createTurnoRiegoDto);
  }

  //Obtiene todos las programaciones de riego de una parcela.
  @Get('parcela/:parcelaId')
  findAll(@Request() req, @Param('parcelaId', ParseIntPipe) parcelaId: number) {
    return this.turnoRiegoService.findAll(req.user.id, parcelaId);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.turnoRiegoService.findOne(req.user.id, id);
  }

  @Patch(':id')
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() updateTurnoRiegoDto: UpdateTurnoRiegoDto) {
    return this.turnoRiegoService.update(req.user.id, id, updateTurnoRiegoDto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.turnoRiegoService.remove(req.user.id, id);
  }
}
