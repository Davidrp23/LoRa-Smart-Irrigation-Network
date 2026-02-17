import { Injectable } from '@nestjs/common';
import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';

@Injectable()
export class MotasService {
  create(createMotaDto: CreateMotaDto) {
    return 'This action adds a new mota';
  }

  findAll() {
    return `This action returns all motas`;
  }

  findOne(id: number) {
    return `This action returns a #${id} mota`;
  }

  update(id: number, updateMotaDto: UpdateMotaDto) {
    return `This action updates a #${id} mota`;
  }

  remove(id: number) {
    return `This action removes a #${id} mota`;
  }
}
