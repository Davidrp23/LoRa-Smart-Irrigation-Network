import { Injectable } from '@nestjs/common';
import { CreateMotaDto } from './dto/create-mota.dto';
import { UpdateMotaDto } from './dto/update-mota.dto';
import { Mota } from './entities/mota.entity';

@Injectable()
export class MotasService {

  private motas: Mota[] = [];


  create(createMotaDto: CreateMotaDto) {
    const nuevaMota: Mota = { // También es buena práctica tipar esto
      id: this.motas.length + 1,
      ...createMotaDto,
      fecha_alta: new Date(),
    };
    
    this.motas.push(nuevaMota);
    return 'Mota registrada con éxito: ' + nuevaMota.alias;
  }

  findAll() {
    return this.motas;
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
