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
    findAll(req: any): Promise<{
        id: number;
        nombre: string;
        usuarioId: number;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
    }[]>;
    findOne(req: any, id: number): Promise<{
        id: number;
        nombre: string;
        usuarioId: number;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
    } | null>;
    update(req: any, id: number, updateParcelaDto: UpdateParcelaDto): Promise<{
        id: number;
        nombre: string;
        usuarioId: number;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
    }>;
    remove(req: any, id: number): Promise<{
        id: number;
        nombre: string;
        usuarioId: number;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
    }>;
}
