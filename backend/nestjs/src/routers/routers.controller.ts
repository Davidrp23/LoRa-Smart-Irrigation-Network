import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { RoutersService } from './routers.service';
import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';
import { Router } from '@prisma/client';
import { VincularRouterDto } from './dto/vincular-router.dto';

import { UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HybridAuthGuard } from 'src/auth/guards/hybrid-auth.guard';
import { DeviceAuthGuard } from 'src/auth/guards/device-auth.guard';

@Controller('routers')
export class RoutersController {
  constructor(private readonly routersService: RoutersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body() createRouterDto: CreateRouterDto): Promise<Router> {
    return this.routersService.create(createRouterDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('vincular/')
  async vincularRouter(@Request() req, @Body() vincularRouterDto: VincularRouterDto): Promise<Router>{
    return this.routersService.vincularRouter(req.user.id, vincularRouterDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('desvincular/:id')
  async desvincularRouter(@Request() req, @Param('id', ParseIntPipe) id: number): Promise<Router>{
    return this.routersService.desvincularRouter(req.user.id, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  async findAll(@Request() req): Promise<Router[]>  { //Devuelve todos los routers de un usuario
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.routersService.findAll(miPropioId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  async findOne(@Request() req, @Param('id', ParseIntPipe) id: number): Promise<Router | null>  {
    const miPropioId = req.user.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.routersService.findOne(miPropioId,id);
  }

  @UseGuards(HybridAuthGuard) //Lo pueden consultar tanto routers como humanos, ambos deben ser verificadoss
  @Get('esPublico/:id')
  isPublic(@Request() req, @Param('id', ParseIntPipe) id: number) {
    
    // Como el guardia híbrido deja pasar a ambos, tenemos que ver quien consulta el endpoint
    
    if (req.user) {
      // Entró un humano
      const miPropioId = req.user.id; 
      return this.routersService.isPublic(miPropioId, undefined, id);
    } 
    
    if (req.device) {
      // Entró un Router (Máquina)
      const routerSolicitanteId = req.device.apiToken;
      return this.routersService.isPublic(undefined, routerSolicitanteId, id);
    }
  }

  @UseGuards(DeviceAuthGuard) //Solo lo consultan los routers
  @Get('permitirAcceso/:id')
  aceptarCliente(@Request() req, @Param('id', ParseIntPipe) motaId: number) {

    const apiToken = req.device.apiToken;
    return this.routersService.aceptarCliente(apiToken, motaId);
  }

  @UseGuards(AuthGuard('jwt'))
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
