import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BigPacketService } from './big-packet.service';
import { BigPacketDto } from './dto/big-packet.dto';
import { DeviceAuthGuard } from 'src/auth/guards/device-auth.guard';
import { UseGuards, Request } from '@nestjs/common';

@UseGuards(DeviceAuthGuard)
@Controller('big-packet')
export class BigPacketController {

  constructor(private readonly bigPacketService: BigPacketService) {}

  //Solo se pueden crear, no hace falta ninguno mas.

  @Post()
  create(@Request() req, @Body() BigPacketDto: BigPacketDto) {
    const routerID = req.device.id; //Cogemos el id de la cabecera del JWT , imposible de falsear
    return this.bigPacketService.create(routerID,BigPacketDto);
  }
}
