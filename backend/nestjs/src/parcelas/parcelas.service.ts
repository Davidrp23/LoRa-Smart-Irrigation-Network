import { Injectable } from '@nestjs/common';
import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';

@Injectable()
export class ParcelasService {
  create(createParcelaDto: CreateParcelaDto) {
    return 'This action adds a new parcela';
  }

  findAll() {
    return `This action returns all parcelas`;
  }

  findOne(id: number) {
    return `This action returns a #${id} parcela`;
  }

  update(id: number, updateParcelaDto: UpdateParcelaDto) {
    return `This action updates a #${id} parcela`;
  }

  remove(id: number) {
    return `This action removes a #${id} parcela`;
  }
}
