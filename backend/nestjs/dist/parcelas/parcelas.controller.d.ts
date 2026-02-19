import { ParcelasService } from './parcelas.service';
import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';
export declare class ParcelasController {
    private readonly parcelasService;
    constructor(parcelasService: ParcelasService);
    create(req: any, createParcelaDto: CreateParcelaDto): Promise<{
        id: number;
        nombre: string;
        usuarioId: number;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
    }>;
    findAll(): Promise<{
        id: number;
        nombre: string;
        usuarioId: number;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
    }[]>;
    findOne(id: number): Promise<{
        id: number;
        nombre: string;
        usuarioId: number;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
    } | null>;
    update(id: number, updateParcelaDto: UpdateParcelaDto): Promise<{
        id: number;
        nombre: string;
        usuarioId: number;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
    }>;
    remove(id: number): Promise<{
        id: number;
        nombre: string;
        usuarioId: number;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
    }>;
}
