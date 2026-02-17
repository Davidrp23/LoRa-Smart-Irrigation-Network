import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BigPacketService } from './big-packet.service';
import { CreateBigPacketDto } from './dto/create-big-packet.dto';
import { UpdateBigPacketDto } from './dto/update-big-packet.dto';

@Controller('big-packet')
export class BigPacketController {
  constructor(private readonly bigPacketService: BigPacketService) {}

  @Post()
  create(@Body() createBigPacketDto: CreateBigPacketDto) {
    return this.bigPacketService.create(createBigPacketDto);
  }

  @Get()
  findAll() {
    return this.bigPacketService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bigPacketService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBigPacketDto: UpdateBigPacketDto) {
    return this.bigPacketService.update(+id, updateBigPacketDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.bigPacketService.remove(+id);
  }
}
