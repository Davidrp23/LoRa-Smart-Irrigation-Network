import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from '@prisma/client';

import { UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';


@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    return this.usuariosService.create(createUsuarioDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(): Promise<Usuario[]> {
    return this.usuariosService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('id/:id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Usuario | null> {
    return this.usuariosService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('id/:id')
  async updateById(@Param('id', ParseIntPipe) id: number, @Body() updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario> {
    return this.usuariosService.updateById(id, updateUsuarioDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('email/:email')
  async updateByEmail(@Param('email') email: string, @Body() updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario> {
    return this.usuariosService.updateByEmail(email, updateUsuarioDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('id/:id')
  async removeById(@Param('id', ParseIntPipe) id: number): Promise<Usuario> {
    return this.usuariosService.removeByID(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('email/:email')
  async removeByEmail(@Param('email') email: string): Promise<Usuario> {
    return this.usuariosService.removeByEmail(email);
  }
}
