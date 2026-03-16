import { Injectable } from '@nestjs/common';
import { CreateClimaServiceDto } from './dto/create-clima-service.dto';
import { UpdateClimaServiceDto } from './dto/update-clima-service.dto';

@Injectable()
export class ClimaServiceService {
  create(createClimaServiceDto: CreateClimaServiceDto) {
    return 'This action adds a new climaService';
  }

  findAll() {
    return `This action returns all climaService`;
  }

  findOne(id: number) {
    return `This action returns a #${id} climaService`;
  }

  update(id: number, updateClimaServiceDto: UpdateClimaServiceDto) {
    return `This action updates a #${id} climaService`;
  }

  remove(id: number) {
    return `This action removes a #${id} climaService`;
  }
}
