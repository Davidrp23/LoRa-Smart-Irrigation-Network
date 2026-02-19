import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from '@prisma/client';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  findAll(): Promise<Usuario[]> {
    return this.usuariosService.findAll();
  }

  @Get('id/:id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Usuario | null> {
    return this.usuariosService.findOne(id);
  }

  @Patch('id/:id')
  async updateById(@Param('id', ParseIntPipe) id: number, @Body() updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario> {
    return this.usuariosService.updateById(id, updateUsuarioDto);
  }

  @Patch('email/:email')
  async updateByEmail(@Param('email') email: string, @Body() updateUsuarioDto: UpdateUsuarioDto): Promise<Usuario> {
    return this.usuariosService.updateByEmail(email, updateUsuarioDto);
  }

  @Delete('id/:id')
  async removeById(@Param('id', ParseIntPipe) id: number): Promise<Usuario> {
    return this.usuariosService.removeByID(id);
  }

  @Delete('email/:email')
  async removeByEmail(@Param('email') email: string): Promise<Usuario> {
    return this.usuariosService.removeByEmail(email);
  }
}
