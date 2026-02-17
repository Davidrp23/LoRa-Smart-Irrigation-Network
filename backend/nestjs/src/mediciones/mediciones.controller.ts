import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MedicionesService } from './mediciones.service';
import { CreateMedicioneDto } from './dto/create-medicione.dto';
import { UpdateMedicioneDto } from './dto/update-medicione.dto';

@Controller('mediciones')
export class MedicionesController {
  constructor(private readonly medicionesService: MedicionesService) {}

  @Post()
  create(@Body() createMedicioneDto: CreateMedicioneDto) {
    return this.medicionesService.create(createMedicioneDto);
  }

  @Get()
  findAll() {
    return this.medicionesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.medicionesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMedicioneDto: UpdateMedicioneDto) {
    return this.medicionesService.update(+id, updateMedicioneDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.medicionesService.remove(+id);
  }
}
