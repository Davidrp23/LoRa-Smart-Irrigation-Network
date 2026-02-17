import { Injectable } from '@nestjs/common';
import { CreateMedicioneDto } from './dto/create-medicione.dto';
import { UpdateMedicioneDto } from './dto/update-medicione.dto';

@Injectable()
export class MedicionesService {
  create(createMedicioneDto: CreateMedicioneDto) {
    return 'This action adds a new medicione';
  }

  findAll() {
    return `This action returns all mediciones`;
  }

  findOne(id: number) {
    return `This action returns a #${id} medicione`;
  }

  update(id: number, updateMedicioneDto: UpdateMedicioneDto) {
    return `This action updates a #${id} medicione`;
  }

  remove(id: number) {
    return `This action removes a #${id} medicione`;
  }
}
