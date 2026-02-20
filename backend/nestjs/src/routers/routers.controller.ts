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

  @Get()
  async findAll(): Promise<Router[]>  {
    return this.routersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Router | null>  {
    return this.routersService.findOne(id);
  }

  @Get('esPublico/:id')
  isPublic(@Param('id', ParseIntPipe) id: number) {
    return this.routersService.isPublic(id);
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateRouterDto: UpdateRouterDto): Promise<Router>  {
    return this.routersService.update(id, updateRouterDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<Router>  {
    return this.routersService.remove(id);
  }
}
