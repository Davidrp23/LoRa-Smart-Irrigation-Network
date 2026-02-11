import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MotasService } from './motas.service';
import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';

@Controller('motas')
export class MotasController {
  constructor(private readonly motasService: MotasService) {}

  @Post()
  create(@Body() createMotaDto: CreateMotaDto) {
    return this.motasService.create(createMotaDto);
  }

  @Get()
  findAll() {
    return this.motasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.motasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMotaDto: UpdateMotaDto) {
    return this.motasService.update(+id, updateMotaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.motasService.remove(+id);
  }
}
