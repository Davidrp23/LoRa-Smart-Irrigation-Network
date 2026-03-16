import { Controller, Get, Param, ParseFloatPipe, Query } from '@nestjs/common';
import { ClimaServiceService } from './clima-service.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@UseGuards(AuthGuard('jwt'))
@Controller('clima-service')
export class ClimaServiceController {
  constructor(private readonly climaServiceService: ClimaServiceService) {}

  @Get(':lat/:long')
  async findOne(@Param('lat', ParseFloatPipe) lat: number, @Param('long', ParseFloatPipe) long: number,
  @Query('timezone') timezone?: string){
    
    return this.climaServiceService.findOne(lat, long, timezone || "auto");
  }

}


