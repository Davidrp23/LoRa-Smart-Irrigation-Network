import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RoutersService } from './routers.service';
import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';

@Controller('routers')
export class RoutersController {
  constructor(private readonly routersService: RoutersService) {}

  @Post()
  create(@Body() createRouterDto: CreateRouterDto) {
    return this.routersService.create(createRouterDto);
  }

  @Get()
  findAll() {
    return this.routersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.routersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRouterDto: UpdateRouterDto) {
    return this.routersService.update(+id, updateRouterDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.routersService.remove(+id);
  }
}
