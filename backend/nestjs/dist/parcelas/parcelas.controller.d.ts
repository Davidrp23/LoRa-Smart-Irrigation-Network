import { ParcelasService } from './parcelas.service';
import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';
export declare class ParcelasController {
    private readonly parcelasService;
    constructor(parcelasService: ParcelasService);
    create(createParcelaDto: CreateParcelaDto): string;
    findAll(): string;
    findOne(id: string): string;
    update(id: string, updateParcelaDto: UpdateParcelaDto): string;
    remove(id: string): string;
}
