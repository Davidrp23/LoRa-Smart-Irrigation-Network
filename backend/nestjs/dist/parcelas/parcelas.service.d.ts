import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';
export declare class ParcelasService {
    create(createParcelaDto: CreateParcelaDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateParcelaDto: UpdateParcelaDto): string;
    remove(id: number): string;
}
