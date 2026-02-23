import { ParcelasService } from './parcelas.service';
import { CreateParcelaDto } from './dto/create-parcela.dto';
import { UpdateParcelaDto } from './dto/update-parcela.dto';
export declare class ParcelasController {
    private readonly parcelasService;
    constructor(parcelasService: ParcelasService);
    create(req: any, createParcelaDto: CreateParcelaDto): Promise<{
        nombre: string;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
        id: number;
        usuarioId: number;
    }>;
    findAll(req: any): Promise<{
        nombre: string;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
        id: number;
        usuarioId: number;
    }[]>;
    findOne(req: any, id: number): Promise<{
        nombre: string;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
        id: number;
        usuarioId: number;
    } | null>;
    update(req: any, id: number, updateParcelaDto: UpdateParcelaDto): Promise<{
        nombre: string;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
        id: number;
        usuarioId: number;
    }>;
    remove(req: any, id: number): Promise<{
        nombre: string;
        cultivo: string | null;
        latitudCentro: number;
        longitudCentro: number;
        id: number;
        usuarioId: number;
    }>;
}
