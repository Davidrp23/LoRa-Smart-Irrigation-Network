import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ParcelasService } from './parcelas.service';
import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';

@Controller('parcelas')
export class ParcelasController {
  constructor(private readonly parcelasService: ParcelasService) {}

  @Post()
  create(@Body() createParcelaDto: CreateParcelaDto) {
    return this.parcelasService.create(createParcelaDto);
  }

  @Get()
  findAll() {
    return this.parcelasService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.parcelasService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateParcelaDto: UpdateParcelaDto) {
    return this.parcelasService.update(+id, updateParcelaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.parcelasService.remove(+id);
  }
}
