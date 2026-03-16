import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ClimaServiceService } from './clima-service.service';
import { CreateClimaServiceDto } from './dto/create-clima-service.dto';
import { UpdateClimaServiceDto } from './dto/update-clima-service.dto';

@Controller('clima-service')
export class ClimaServiceController {
  constructor(private readonly climaServiceService: ClimaServiceService) {}

  @Post()
  create(@Body() createClimaServiceDto: CreateClimaServiceDto) {
    return this.climaServiceService.create(createClimaServiceDto);
  }

  @Get()
  findAll() {
    return this.climaServiceService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.climaServiceService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClimaServiceDto: UpdateClimaServiceDto) {
    return this.climaServiceService.update(+id, updateClimaServiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.climaServiceService.remove(+id);
  }
}
