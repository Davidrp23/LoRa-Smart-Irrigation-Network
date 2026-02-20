import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { RoutersService } from './routers.service';
import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';
import { Router } from '@prisma/client';
import { VincularRouterDto } from './dto/vincular-router.dto';

import { UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('routers')
export class RoutersController {
  constructor(private readonly routersService: RoutersService) {}

  @Post()
  async create(@Body() createRouterDto: CreateRouterDto): Promise<Router> {
    return this.routersService.create(createRouterDto);
  }

  @Post('vincular/')
  async vincularRouter(@Request() req, @Body() vincularRouterDto: VincularRouterDto): Promise<Router>{
    return this.routersService.vincularRouter(req.user.id, vincularRouterDto);
  }

  @Post('desvincular/:id')
  async desvincularRouter(@Request() req, @Param('id', ParseIntPipe) id: number): Promise<Router>{
    return this.routersService.desvincularRouter(req.user.id, id);
  }

  @Get()
  async findAll(@Request() req): Promise<Router[]>  { //Devuelve todos los routers de un usuario
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.routersService.findAll(miPropioId);
  }

  @Get(':id')
  async findOne(@Request() req, @Param('id', ParseIntPipe) id: number): Promise<Router | null>  {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.routersService.findOne(miPropioId,id);
  }

  @Get('esPublico/:id')
  isPublic(@Request() req, @Param('id', ParseIntPipe) id: number) {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.routersService.isPublic(miPropioId, id);
  }

  @Patch(':id')
  async update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() updateRouterDto: UpdateRouterDto): Promise<Router>  {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.routersService.update(miPropioId, id, updateRouterDto);
  }

  // @Delete(':id')
  // async remove(@Param('id', ParseIntPipe) id: number): Promise<Router>  { //Un router no se puede eliminar (sigue existiendo)
  //   return this.routersService.remove(id);                                 //se puede desvincular del usuario
  // }
}
